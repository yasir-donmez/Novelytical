/**
 * Multi-layered Cache Manager Implementation
 * 
 * Implements hierarchical caching with fallback chain:
 * Memory Cache → LocalStorage Cache → Firebase (source of truth)
 * 
 * Enhanced with background refresh and intelligent cache miss handling
 */

import { 
  CacheManager, 
  CacheConfig, 
  CacheStats, 
  CacheMetadata, 
  DEFAULT_CACHE_CONFIG,
  getTTLForDataType 
} from './cache-manager';
import { MemoryCache } from './memory-cache';
import { LocalStorageCache } from './localstorage-cache';
import { BackgroundCacheRefresher, getBackgroundRefresher } from './background-cache-refresher';
import { CacheMissHandler, getCacheMissHandler } from './cache-miss-handler';
import { TTLOptimizer, getTTLOptimizer } from './ttl-optimizer';

export class CacheManagerImpl implements CacheManager {
  public readonly memory: MemoryCache;
  public readonly localStorage: LocalStorageCache;
  public backgroundRefresher!: BackgroundCacheRefresher;
  public missHandler!: CacheMissHandler;
  public ttlOptimizer!: TTLOptimizer;
  
  private performanceStats = {
    totalRequests: 0,
    totalResponseTime: 0,
    startTime: Date.now()
  };

  constructor(private config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.memory = new MemoryCache(config, config.maxMemorySize * 1024 * 1024);
    this.localStorage = new LocalStorageCache(config, config.maxLocalStorageSize * 1024 * 1024);
    
    // Initialize background systems asynchronously to avoid circular dependency
    this.initializeBackgroundSystems();
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  private initializeBackgroundSystems(): void {
    // Initialize background systems asynchronously to avoid circular dependency
    setTimeout(() => {
      try {
        this.backgroundRefresher = getBackgroundRefresher();
        this.missHandler = getCacheMissHandler();
        this.ttlOptimizer = getTTLOptimizer();
        
        // Start background systems
        if (this.backgroundRefresher) {
          this.backgroundRefresher.start();
        }
        if (this.missHandler) {
          this.missHandler.start();
        }
      } catch (error) {
        console.warn('Failed to initialize background systems:', error);
      }
    }, 0);
  }

  /**
   * Get data from cache with fallback chain and intelligent miss handling
   * Memory → LocalStorage → Miss Handler → null
   */
  async get<T>(key: string, dataType: string = 'dynamic'): Promise<T | null> {
    const startTime = Date.now();
    this.performanceStats.totalRequests++;

    try {
      // Record access for TTL optimization
      if (this.ttlOptimizer) {
        this.ttlOptimizer.recordAccess(key, dataType);
      }

      // Try memory cache first (fastest)
      let result = await this.memory.get<T>(key);
      if (result !== null) {
        this.updatePerformanceStats(startTime);
        return result;
      }

      // Try localStorage cache (persistent)
      result = await this.localStorage.get<T>(key);
      if (result !== null) {
        // Populate memory cache for faster future access
        const ttl = this.getOptimizedTTL(key, dataType);
        await this.memory.set(key, result, ttl);
        this.updatePerformanceStats(startTime);
        return result;
      }

      // Handle cache miss with intelligent miss handler
      if (this.missHandler) {
        result = await this.missHandler.handleCacheMiss<T>(key, dataType);
      }
      if (result !== null) {
        this.updatePerformanceStats(startTime);
        return result;
      }

      this.updatePerformanceStats(startTime);
      return null;
    } catch (error) {
      console.warn('Cache get error:', error);
      this.updatePerformanceStats(startTime);
      return null;
    }
  }

  /**
   * Set data in all cache layers and register for background refresh
   */
  async set<T>(
    key: string, 
    value: T, 
    dataType: string = 'dynamic', 
    customTTL?: number
  ): Promise<void> {
    try {
      const ttl = customTTL || this.getOptimizedTTL(key, dataType);
      
      // Set in both cache layers
      await Promise.all([
        this.memory.set(key, value, ttl),
        this.localStorage.set(key, value, ttl)
      ]);
    } catch (error) {
      console.warn('Cache set error:', error);
      // Continue execution even if caching fails
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      await Promise.all([
        this.memory.invalidatePattern(pattern),
        this.localStorage.invalidatePattern(pattern)
      ]);
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }

  /**
   * Selective cache invalidation with advanced pattern matching
   */
  async invalidateSelective(options: {
    patterns?: string[];
    dataTypes?: string[];
    keys?: string[];
    olderThan?: number; // Timestamp
    accessedBefore?: number; // Timestamp
    sizeGreaterThan?: number; // Bytes
  }): Promise<{
    invalidatedCount: number;
    patterns: string[];
    dataTypes: string[];
    keys: string[];
  }> {
    const result = {
      invalidatedCount: 0,
      patterns: options.patterns || [],
      dataTypes: options.dataTypes || [],
      keys: options.keys || []
    };

    try {
      // Direct key invalidation
      if (options.keys && options.keys.length > 0) {
        for (const key of options.keys) {
          await Promise.all([
            this.memory.delete(key),
            this.localStorage.delete(key)
          ]);
          result.invalidatedCount++;
        }
      }

      // Pattern-based invalidation
      if (options.patterns && options.patterns.length > 0) {
        for (const pattern of options.patterns) {
          const beforeCount = result.invalidatedCount;
          await Promise.all([
            this.memory.invalidatePattern(pattern),
            this.localStorage.invalidatePattern(pattern)
          ]);
          // Note: We can't easily count pattern matches without iterating through all keys
          // This is a limitation we'll accept for performance
        }
      }

      // Data type based invalidation
      if (options.dataTypes && options.dataTypes.length > 0) {
        const dataTypePatterns = options.dataTypes.map(type => {
          switch (type) {
            case 'user':
              return 'user_(profile|settings)_.*';
            case 'discovery':
              return '(discovery|trending|editors_choice|fantasy)_.*';
            case 'stats':
              return '(novel_stats|story_tower)_.*';
            case 'search':
              return 'search_.*';
            default:
              return `.*_${type}_.*`;
          }
        });

        for (const pattern of dataTypePatterns) {
          await Promise.all([
            this.memory.invalidatePattern(pattern),
            this.localStorage.invalidatePattern(pattern)
          ]);
        }
      }

      // Time-based and size-based invalidation (requires iteration)
      if (options.olderThan || options.accessedBefore || options.sizeGreaterThan) {
        await this.invalidateByConditions(options);
      }

    } catch (error) {
      console.warn('Selective cache invalidation error:', error);
    }

    return result;
  }

  /**
   * Invalidate cache entries by user-related patterns
   */
  async invalidateUserData(userId: string): Promise<void> {
    await this.invalidateSelective({
      patterns: [
        `user_profile_${userId}`,
        `user_settings_${userId}`,
        `user_.*_${userId}`,
        `library_collections_.*_${userId}`
      ]
    });
  }

  /**
   * Invalidate discovery-related cache entries
   */
  async invalidateDiscoveryData(): Promise<void> {
    await this.invalidateSelective({
      dataTypes: ['discovery'],
      patterns: [
        'discovery_data',
        'trending_novels',
        'new_arrivals',
        'editors_choice',
        'fantasy_novels'
      ]
    });
  }

  /**
   * Invalidate novel-specific cache entries
   */
  async invalidateNovelData(novelId: number): Promise<void> {
    await this.invalidateSelective({
      patterns: [
        `novel_stats_${novelId}`,
        `novel_details_${novelId}`,
        `story_tower_${novelId}`,
        `library_collections_${novelId}.*`
      ]
    });
  }

  /**
   * Invalidate search-related cache entries
   */
  async invalidateSearchData(query?: string): Promise<void> {
    if (query) {
      await this.invalidateSelective({
        patterns: [`search_${query}.*`]
      });
    } else {
      await this.invalidateSelective({
        dataTypes: ['search'],
        patterns: ['search_.*']
      });
    }
  }

  /**
   * Smart cache invalidation based on data relationships
   */
  async smartInvalidate(context: {
    type: 'user_update' | 'novel_update' | 'discovery_refresh' | 'search_clear';
    entityId?: string | number;
    relatedEntities?: Array<{ type: string; id: string | number }>;
  }): Promise<void> {
    switch (context.type) {
      case 'user_update':
        if (context.entityId) {
          await this.invalidateUserData(context.entityId.toString());
          // Also invalidate user's library collections
          await this.invalidateSelective({
            patterns: [`library_collections_.*_${context.entityId}`]
          });
        }
        break;

      case 'novel_update':
        if (context.entityId) {
          await this.invalidateNovelData(Number(context.entityId));
          // Also invalidate discovery data that might include this novel
          await this.invalidateDiscoveryData();
        }
        break;

      case 'discovery_refresh':
        await this.invalidateDiscoveryData();
        // Also invalidate trending and recommendation data
        await this.invalidateSelective({
          patterns: ['trending_.*', 'recommendation_.*', 'popular_.*']
        });
        break;

      case 'search_clear':
        await this.invalidateSearchData();
        break;
    }

    // Handle related entities
    if (context.relatedEntities) {
      for (const entity of context.relatedEntities) {
        if (entity.type === 'user') {
          await this.invalidateUserData(entity.id.toString());
        } else if (entity.type === 'novel') {
          await this.invalidateNovelData(Number(entity.id));
        }
      }
    }
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    try {
      await Promise.all([
        this.memory.clear(),
        this.localStorage.clear()
      ]);
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const memoryStats = this.memory.getStats();
    const localStorageStats = this.localStorage.getStats();
    
    const totalHits = memoryStats.hitCount + localStorageStats.hitCount;
    const totalMisses = memoryStats.missCount + localStorageStats.missCount;
    const totalRequests = totalHits + totalMisses;
    
    return {
      memory: memoryStats,
      localStorage: localStorageStats,
      overall: {
        totalHits,
        totalMisses,
        overallHitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
        avgResponseTime: this.performanceStats.totalRequests > 0 
          ? this.performanceStats.totalResponseTime / this.performanceStats.totalRequests 
          : 0
      }
    };
  }

  /**
   * Get metadata for a specific cache key
   */
  async getMetadata(key: string): Promise<CacheMetadata | null> {
    // Try memory cache first
    let metadata = this.memory.getMetadata(key);
    if (metadata) return metadata;
    
    // Try localStorage cache
    try {
      const fullKey = `${this.config.localStoragePrefix}${key}`;
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const entry = JSON.parse(stored);
        return entry.metadata;
      }
    } catch (error) {
      console.warn('Error getting metadata:', error);
    }
    
    return null;
  }

  /**
   * Preload data into cache (useful for critical data)
   */
  async preload<T>(key: string, dataFetcher: () => Promise<T>, dataType: string = 'static'): Promise<void> {
    try {
      // Check if already cached
      const cached = await this.get<T>(key, dataType);
      if (cached !== null) return;
      
      // Fetch and cache data
      const data = await dataFetcher();
      await this.set(key, data, dataType);
    } catch (error) {
      console.warn('Cache preload error:', error);
    }
  }

  /**
   * Refresh cache entry in background
   */
  async refreshInBackground<T>(
    key: string, 
    dataFetcher: () => Promise<T>, 
    dataType: string = 'dynamic'
  ): Promise<void> {
    // Don't await - run in background
    setTimeout(async () => {
      try {
        const freshData = await dataFetcher();
        await this.set(key, freshData, dataType);
      } catch (error) {
        console.warn('Background refresh error:', error);
      }
    }, 0);
  }

  /**
   * Register a data fetcher for automatic cache population and background refresh
   */
  registerDataFetcher<T>(
    key: string,
    dataType: string,
    fetcher: () => Promise<T>,
    priority: number = 5
  ): void {
    // Register with miss handler for auto-population
    if (this.missHandler) {
      this.missHandler.registerFetcher(key, dataType, fetcher, priority);
    }
    
    // Register with background refresher for proactive refresh
    this.backgroundRefresher.registerRefresh(key, dataType, fetcher, priority);
  }

  /**
   * Get comprehensive cache statistics including background systems
   */
  async getAdvancedStats(): Promise<{
    cache: CacheStats;
    backgroundRefresh: any;
    missHandler: any;
    ttlOptimizer: any;
  }> {
    const cacheStats = await this.getStats();
    const refreshStats = this.backgroundRefresher?.getStats() || { totalRefreshes: 0, successfulRefreshes: 0, failedRefreshes: 0 };
    const missStats = this.missHandler?.getStats() || { totalMisses: 0, successfulFetches: 0, failedFetches: 0 };
    const ttlStats = this.ttlOptimizer?.getOptimizationStats() || { totalOptimizations: 0, averageOptimization: 0 };
    
    return {
      cache: cacheStats,
      backgroundRefresh: refreshStats,
      missHandler: missStats,
      ttlOptimizer: ttlStats
    };
  }

  /**
   * Trigger predictive cache loading based on miss patterns
   */
  async triggerPredictiveLoading(): Promise<void> {
    if (this.missHandler) {
      await this.missHandler.predictAndPreload();
    }
  }

  /**
   * Stop all background systems (useful for cleanup)
   */
  stopBackgroundSystems(): void {
    if (this.backgroundRefresher) {
      this.backgroundRefresher.stop();
    }
    if (this.missHandler) {
      this.missHandler.stop();
    }
  }
  async getEfficiencyReport(): Promise<{
    recommendation: string;
    hitRate: number;
    memoryUsage: number;
    localStorageUsage: number;
    suggestions: string[];
  }> {
    const stats = await this.getStats();
    const suggestions: string[] = [];
    
    // Analyze hit rate
    if (stats.overall.overallHitRate < 0.7) {
      suggestions.push('Consider increasing TTL values for frequently accessed data');
    }
    
    // Analyze memory usage
    const memoryUsagePercent = stats.memory.size / stats.memory.maxSize;
    if (memoryUsagePercent > 0.9) {
      suggestions.push('Memory cache is nearly full, consider increasing maxMemorySize');
    }
    
    // Analyze localStorage usage
    const localStorageUsagePercent = stats.localStorage.size / stats.localStorage.maxSize;
    if (localStorageUsagePercent > 0.9) {
      suggestions.push('LocalStorage cache is nearly full, consider cleanup or size increase');
    }
    
    let recommendation = 'Cache performance is optimal';
    if (stats.overall.overallHitRate < 0.5) {
      recommendation = 'Cache hit rate is low, consider optimization';
    } else if (stats.overall.overallHitRate < 0.7) {
      recommendation = 'Cache performance is good but can be improved';
    }
    
    return {
      recommendation,
      hitRate: stats.overall.overallHitRate,
      memoryUsage: memoryUsagePercent,
      localStorageUsage: localStorageUsagePercent,
      suggestions
    };
  }

  // Private methods
  private updatePerformanceStats(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.performanceStats.totalResponseTime += responseTime;
  }

  private getOptimizedTTL(key: string, dataType: string): number {
    // Try to get optimized TTL first
    const optimizedTTL = this.ttlOptimizer.optimizeTTL(key, dataType);
    if (optimizedTTL) {
      return optimizedTTL;
    }
    
    // Fallback to default TTL
    return getTTLForDataType(dataType, this.config);
  }

  private async invalidateByConditions(options: {
    olderThan?: number;
    accessedBefore?: number;
    sizeGreaterThan?: number;
  }): Promise<void> {
    // This is a simplified implementation
    // In a real scenario, you'd need to iterate through cache entries
    // and check their metadata against the conditions
    
    if (options.olderThan) {
      // Invalidate entries created before the specified timestamp
      await this.memory.cleanup(); // This removes expired entries
      // For localStorage, we'd need a more sophisticated approach
    }
    
    // Note: Full implementation would require iterating through all cache entries
    // and checking their metadata, which could be expensive for large caches
    // This is a trade-off between functionality and performance
  }

  private startPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(async () => {
      try {
        await Promise.all([
          this.memory.cleanup(),
          this.localStorage.cleanup()
        ]);
      } catch (error) {
        console.warn('Periodic cleanup error:', error);
      }
    }, 5 * 60 * 1000);
  }
}

// Singleton instance for global use
let cacheManagerInstance: CacheManagerImpl | null = null;

/**
 * Get the global cache manager instance
 */
export function getCacheManager(config?: CacheConfig): CacheManagerImpl {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManagerImpl(config);
  }
  return cacheManagerInstance;
}

/**
 * Reset the cache manager instance (useful for testing)
 */
export function resetCacheManager(): void {
  cacheManagerInstance = null;
}