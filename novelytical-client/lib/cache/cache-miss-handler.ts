/**
 * Cache Miss Handler
 * 
 * Handles cache misses intelligently with automatic population,
 * predictive loading, and miss pattern analysis.
 */

import { CacheManager } from './cache-manager';
import { getCacheManager } from './cache-manager-impl';
import { getBackgroundRefresher, BackgroundCacheRefresher } from './background-cache-refresher';

export interface CacheMissConfig {
  enabled: boolean;
  autoPopulateOnMiss: boolean;
  predictiveLoadingEnabled: boolean;
  missThresholdForPrediction: number;
  maxPredictiveLoads: number;
  missAnalysisWindow: number; // milliseconds
}

export interface CacheMissPattern {
  key: string;
  missCount: number;
  lastMiss: number;
  averageTimeBetweenMisses: number;
  predictedNextMiss: number;
  dataType: string;
}

export interface CacheMissStats {
  totalMisses: number;
  autoPopulatedMisses: number;
  predictiveLoads: number;
  missRate: number;
  topMissedKeys: Array<{ key: string; count: number }>;
  patterns: CacheMissPattern[];
}

export interface DataFetcher<T = any> {
  key: string;
  dataType: string;
  fetcher: () => Promise<T>;
  priority: number;
}

export const DEFAULT_CACHE_MISS_CONFIG: CacheMissConfig = {
  enabled: true,
  autoPopulateOnMiss: true,
  predictiveLoadingEnabled: true,
  missThresholdForPrediction: 3, // Start predicting after 3 misses
  maxPredictiveLoads: 5, // Max 5 predictive loads per analysis window
  missAnalysisWindow: 60 * 60 * 1000 // 1 hour analysis window
};

export class CacheMissHandler {
  private missHistory = new Map<string, number[]>(); // key -> timestamps of misses
  private dataFetchers = new Map<string, DataFetcher>(); // key -> fetcher function
  private missStats: CacheMissStats = {
    totalMisses: 0,
    autoPopulatedMisses: 0,
    predictiveLoads: 0,
    missRate: 0,
    topMissedKeys: [],
    patterns: []
  };
  
  private predictiveLoadQueue = new Set<string>();
  private analysisInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private cacheManager: CacheManager = getCacheManager(),
    private backgroundRefresher: BackgroundCacheRefresher = getBackgroundRefresher(),
    private config: CacheMissConfig = DEFAULT_CACHE_MISS_CONFIG
  ) {}

  /**
   * Start the cache miss handler
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) return;
    
    this.isRunning = true;
    
    // Start periodic analysis every 10 minutes
    this.analysisInterval = setInterval(() => {
      this.analyzeMissPatterns();
    }, 10 * 60 * 1000);
    
    console.log('Cache miss handler started');
  }

  /**
   * Stop the cache miss handler
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }
    
    this.predictiveLoadQueue.clear();
    
    console.log('Cache miss handler stopped');
  }

  /**
   * Register a data fetcher for automatic population on cache miss
   */
  registerFetcher<T>(
    key: string,
    dataType: string,
    fetcher: () => Promise<T>,
    priority: number = 5
  ): void {
    this.dataFetchers.set(key, {
      key,
      dataType,
      fetcher,
      priority
    });
  }

  /**
   * Handle a cache miss event
   */
  async handleCacheMiss<T>(key: string, dataType?: string): Promise<T | null> {
    if (!this.isRunning) return null;
    
    // Record the miss
    this.recordMiss(key);
    
    // Try to auto-populate if enabled and fetcher is available
    if (this.config.autoPopulateOnMiss) {
      const fetcher = this.dataFetchers.get(key);
      if (fetcher) {
        try {
          const data = await fetcher.fetcher();
          await this.cacheManager.set(key, data, fetcher.dataType);
          
          this.missStats.autoPopulatedMisses++;
          console.log(`Auto-populated cache for key: ${key}`);
          
          return data as T;
        } catch (error) {
          console.warn(`Auto-population failed for key ${key}:`, error);
        }
      }
    }
    
    return null;
  }

  /**
   * Get cache miss statistics
   */
  getStats(): CacheMissStats {
    this.updateMissStats();
    return { ...this.missStats };
  }

  /**
   * Get miss patterns for analysis
   */
  getMissPatterns(): CacheMissPattern[] {
    return this.analyzeMissPatterns();
  }

  /**
   * Predict and preload likely cache misses
   */
  async predictAndPreload(): Promise<void> {
    if (!this.config.predictiveLoadingEnabled || !this.isRunning) return;
    
    const patterns = this.analyzeMissPatterns();
    const now = Date.now();
    let predictiveLoads = 0;
    
    for (const pattern of patterns) {
      // Skip if already in predictive load queue
      if (this.predictiveLoadQueue.has(pattern.key)) continue;
      
      // Skip if max predictive loads reached
      if (predictiveLoads >= this.config.maxPredictiveLoads) break;
      
      // Check if we should predictively load this key
      if (this.shouldPredictivelyLoad(pattern, now)) {
        const fetcher = this.dataFetchers.get(pattern.key);
        if (fetcher) {
          this.predictiveLoadQueue.add(pattern.key);
          predictiveLoads++;
          
          // Schedule predictive load
          this.backgroundRefresher.registerRefresh(
            pattern.key,
            pattern.dataType,
            fetcher.fetcher,
            fetcher.priority + 2 // Higher priority for predictive loads
          );
          
          this.missStats.predictiveLoads++;
          console.log(`Scheduled predictive load for key: ${pattern.key}`);
          
          // Remove from queue after some time
          setTimeout(() => {
            this.predictiveLoadQueue.delete(pattern.key);
          }, 5 * 60 * 1000); // 5 minutes
        }
      }
    }
  }

  /**
   * Clear miss history for a specific key
   */
  clearMissHistory(key: string): void {
    this.missHistory.delete(key);
  }

  /**
   * Clear all miss history
   */
  clearAllMissHistory(): void {
    this.missHistory.clear();
    this.missStats = {
      totalMisses: 0,
      autoPopulatedMisses: 0,
      predictiveLoads: 0,
      missRate: 0,
      topMissedKeys: [],
      patterns: []
    };
  }

  // Private methods
  private recordMiss(key: string): void {
    const now = Date.now();
    
    if (!this.missHistory.has(key)) {
      this.missHistory.set(key, []);
    }
    
    const keyMisses = this.missHistory.get(key)!;
    keyMisses.push(now);
    
    // Keep only misses within the analysis window
    const cutoff = now - this.config.missAnalysisWindow;
    const recentMisses = keyMisses.filter(timestamp => timestamp > cutoff);
    this.missHistory.set(key, recentMisses);
    
    this.missStats.totalMisses++;
  }

  private analyzeMissPatterns(): CacheMissPattern[] {
    const now = Date.now();
    const cutoff = now - this.config.missAnalysisWindow;
    const patterns: CacheMissPattern[] = [];
    
    for (const [key, misses] of this.missHistory.entries()) {
      const recentMisses = misses.filter(timestamp => timestamp > cutoff);
      
      if (recentMisses.length >= this.config.missThresholdForPrediction) {
        const fetcher = this.dataFetchers.get(key);
        const dataType = fetcher?.dataType || 'unknown';
        
        // Calculate average time between misses
        let totalTimeBetween = 0;
        for (let i = 1; i < recentMisses.length; i++) {
          totalTimeBetween += recentMisses[i] - recentMisses[i - 1];
        }
        const averageTimeBetweenMisses = recentMisses.length > 1 
          ? totalTimeBetween / (recentMisses.length - 1)
          : 0;
        
        // Predict next miss
        const lastMiss = recentMisses[recentMisses.length - 1];
        const predictedNextMiss = averageTimeBetweenMisses > 0 
          ? lastMiss + averageTimeBetweenMisses
          : 0;
        
        patterns.push({
          key,
          missCount: recentMisses.length,
          lastMiss,
          averageTimeBetweenMisses,
          predictedNextMiss,
          dataType
        });
      }
    }
    
    // Sort by miss count (descending)
    patterns.sort((a, b) => b.missCount - a.missCount);
    
    this.missStats.patterns = patterns;
    return patterns;
  }

  private shouldPredictivelyLoad(pattern: CacheMissPattern, now: number): boolean {
    // Don't predictively load if predicted time hasn't arrived yet
    if (pattern.predictedNextMiss > now + (5 * 60 * 1000)) { // 5 minutes buffer
      return false;
    }
    
    // Load if predicted time is near (within 10 minutes)
    if (pattern.predictedNextMiss <= now + (10 * 60 * 1000)) {
      return true;
    }
    
    // Load if miss frequency is high (more than 5 misses in analysis window)
    if (pattern.missCount > 5) {
      return true;
    }
    
    return false;
  }

  private updateMissStats(): void {
    // Update top missed keys
    const keyMissCounts = new Map<string, number>();
    
    for (const [key, misses] of this.missHistory.entries()) {
      const now = Date.now();
      const cutoff = now - this.config.missAnalysisWindow;
      const recentMisses = misses.filter(timestamp => timestamp > cutoff);
      
      if (recentMisses.length > 0) {
        keyMissCounts.set(key, recentMisses.length);
      }
    }
    
    this.missStats.topMissedKeys = Array.from(keyMissCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
    
    // Calculate miss rate (this would need total cache requests to be accurate)
    // For now, we'll use a simplified calculation
    const totalRecentMisses = Array.from(keyMissCounts.values()).reduce((sum, count) => sum + count, 0);
    this.missStats.missRate = totalRecentMisses / Math.max(1, this.missStats.totalMisses);
  }
}

// Singleton instance
let cacheMissHandlerInstance: CacheMissHandler | null = null;

/**
 * Get the global cache miss handler instance
 */
export function getCacheMissHandler(
  cacheManager?: any,
  backgroundRefresher?: any,
  config?: CacheMissConfig
): CacheMissHandler {
  if (!cacheMissHandlerInstance) {
    // Create without dependencies to avoid circular dependency
    cacheMissHandlerInstance = new CacheMissHandler(
      cacheManager || null,
      backgroundRefresher || null,
      config
    );
  }
  return cacheMissHandlerInstance;
}

/**
 * Reset the cache miss handler instance (useful for testing)
 */
export function resetCacheMissHandler(): void {
  if (cacheMissHandlerInstance) {
    cacheMissHandlerInstance.stop();
    cacheMissHandlerInstance = null;
  }
}