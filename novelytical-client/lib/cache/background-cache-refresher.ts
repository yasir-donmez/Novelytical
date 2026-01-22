/**
 * Background Cache Refresher
 * 
 * Implements intelligent background cache refresh strategies to maintain
 * optimal cache hit rates and reduce Firebase read operations.
 */

import { CacheManager, CacheMetadata } from './cache-manager';
import { getCacheManager } from './cache-manager-impl';

export interface RefreshStrategy {
  name: string;
  priority: number; // 1-10, higher = more important
  shouldRefresh: (metadata: CacheMetadata) => boolean;
  refreshInterval: number; // milliseconds
}

export interface BackgroundRefreshConfig {
  enabled: boolean;
  maxConcurrentRefreshes: number;
  refreshStrategies: RefreshStrategy[];
  refreshQueueSize: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface RefreshJob {
  key: string;
  dataType: string;
  fetcher: () => Promise<any>;
  priority: number;
  attempts: number;
  scheduledAt: number;
  lastAttempt?: number;
}

export interface RefreshStats {
  totalRefreshes: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  averageRefreshTime: number;
  queueSize: number;
  activeRefreshes: number;
}

/**
 * Default refresh strategies optimized for Firebase read reduction
 */
export const DEFAULT_REFRESH_STRATEGIES: RefreshStrategy[] = [
  // High-priority: Discovery data (accessed frequently)
  {
    name: 'discovery_data',
    priority: 9,
    shouldRefresh: (metadata) => {
      const age = Date.now() - metadata.createdAt;
      const ttlRemaining = metadata.expiresAt - Date.now();
      return metadata.dataType === 'discovery' && 
             metadata.accessCount > 10 && 
             ttlRemaining < (age * 0.2); // Refresh when 20% TTL remaining
    },
    refreshInterval: 30 * 60 * 1000 // 30 minutes
  },
  
  // Medium-priority: User data (personalized content)
  {
    name: 'user_data',
    priority: 7,
    shouldRefresh: (metadata) => {
      const ttlRemaining = metadata.expiresAt - Date.now();
      return metadata.dataType === 'user' && 
             metadata.accessCount > 5 && 
             ttlRemaining < (15 * 60 * 1000); // Refresh when 15 min remaining
    },
    refreshInterval: 20 * 60 * 1000 // 20 minutes
  },
  
  // Medium-priority: Novel stats (frequently viewed)
  {
    name: 'novel_stats',
    priority: 6,
    shouldRefresh: (metadata) => {
      const ttlRemaining = metadata.expiresAt - Date.now();
      return metadata.dataType === 'stats' && 
             metadata.accessCount > 3 && 
             ttlRemaining < (10 * 60 * 1000); // Refresh when 10 min remaining
    },
    refreshInterval: 45 * 60 * 1000 // 45 minutes
  },
  
  // Low-priority: Static content (rarely changes)
  {
    name: 'static_content',
    priority: 3,
    shouldRefresh: (metadata) => {
      const age = Date.now() - metadata.createdAt;
      return metadata.dataType === 'static' && 
             age > (2 * 60 * 60 * 1000); // Refresh after 2 hours
    },
    refreshInterval: 2 * 60 * 60 * 1000 // 2 hours
  }
];

export const DEFAULT_BACKGROUND_REFRESH_CONFIG: BackgroundRefreshConfig = {
  enabled: true,
  maxConcurrentRefreshes: 3,
  refreshStrategies: DEFAULT_REFRESH_STRATEGIES,
  refreshQueueSize: 50,
  retryAttempts: 3,
  retryDelay: 5000 // 5 seconds
};

export class BackgroundCacheRefresher {
  private refreshQueue: RefreshJob[] = [];
  private activeRefreshes = new Set<string>();
  private refreshStats: RefreshStats = {
    totalRefreshes: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    averageRefreshTime: 0,
    queueSize: 0,
    activeRefreshes: 0
  };
  
  private refreshTimers = new Map<string, NodeJS.Timeout>();
  private isRunning = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(
    private cacheManager: CacheManager = getCacheManager(),
    private config: BackgroundRefreshConfig = DEFAULT_BACKGROUND_REFRESH_CONFIG
  ) {}

  /**
   * Start the background refresh system
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) return;
    
    this.isRunning = true;
    
    // Start processing queue every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processRefreshQueue();
    }, 10000);
    
    // Schedule initial refresh checks
    this.scheduleRefreshChecks();
    
    console.log('Background cache refresher started');
  }

  /**
   * Stop the background refresh system
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    // Clear all refresh timers
    this.refreshTimers.forEach(timer => clearTimeout(timer));
    this.refreshTimers.clear();
    
    // Clear queue
    this.refreshQueue = [];
    this.activeRefreshes.clear();
    
    console.log('Background cache refresher stopped');
  }

  /**
   * Register a data fetcher for background refresh
   */
  registerRefresh<T>(
    key: string,
    dataType: string,
    fetcher: () => Promise<T>,
    priority: number = 5
  ): void {
    if (!this.isRunning) return;
    
    // Check if already in queue
    const existingJob = this.refreshQueue.find(job => job.key === key);
    if (existingJob) {
      // Update priority if higher
      if (priority > existingJob.priority) {
        existingJob.priority = priority;
        existingJob.fetcher = fetcher;
      }
      return;
    }
    
    // Add to queue if not full
    if (this.refreshQueue.length < this.config.refreshQueueSize) {
      this.refreshQueue.push({
        key,
        dataType,
        fetcher,
        priority,
        attempts: 0,
        scheduledAt: Date.now()
      });
      
      // Sort queue by priority (highest first)
      this.refreshQueue.sort((a, b) => b.priority - a.priority);
      this.refreshStats.queueSize = this.refreshQueue.length;
    }
  }

  /**
   * Force refresh a specific cache key
   */
  async forceRefresh<T>(
    key: string,
    dataType: string,
    fetcher: () => Promise<T>
  ): Promise<boolean> {
    try {
      const startTime = Date.now();
      const data = await fetcher();
      await this.cacheManager.set(key, data, dataType);
      
      this.updateRefreshStats(true, Date.now() - startTime);
      return true;
    } catch (error) {
      console.warn(`Force refresh failed for key ${key}:`, error);
      this.updateRefreshStats(false, 0);
      return false;
    }
  }

  /**
   * Get refresh statistics
   */
  getStats(): RefreshStats {
    return {
      ...this.refreshStats,
      queueSize: this.refreshQueue.length,
      activeRefreshes: this.activeRefreshes.size
    };
  }

  /**
   * Get current refresh queue status
   */
  getQueueStatus(): Array<{
    key: string;
    dataType: string;
    priority: number;
    attempts: number;
    waitTime: number;
  }> {
    return this.refreshQueue.map(job => ({
      key: job.key,
      dataType: job.dataType,
      priority: job.priority,
      attempts: job.attempts,
      waitTime: Date.now() - job.scheduledAt
    }));
  }

  // Private methods
  private async processRefreshQueue(): Promise<void> {
    if (!this.isRunning || this.refreshQueue.length === 0) return;
    
    // Process jobs up to max concurrent limit
    while (
      this.activeRefreshes.size < this.config.maxConcurrentRefreshes &&
      this.refreshQueue.length > 0
    ) {
      const job = this.refreshQueue.shift();
      if (!job) break;
      
      // Skip if already being refreshed
      if (this.activeRefreshes.has(job.key)) continue;
      
      this.activeRefreshes.add(job.key);
      this.processRefreshJob(job);
    }
    
    this.refreshStats.queueSize = this.refreshQueue.length;
  }

  private async processRefreshJob(job: RefreshJob): Promise<void> {
    const startTime = Date.now();
    job.lastAttempt = startTime;
    job.attempts++;
    
    try {
      const data = await job.fetcher();
      await this.cacheManager.set(job.key, data, job.dataType);
      
      this.updateRefreshStats(true, Date.now() - startTime);
      console.log(`Background refresh successful for key: ${job.key}`);
    } catch (error) {
      console.warn(`Background refresh failed for key ${job.key}:`, error);
      this.updateRefreshStats(false, Date.now() - startTime);
      
      // Retry if attempts remaining
      if (job.attempts < this.config.retryAttempts) {
        setTimeout(() => {
          if (this.isRunning) {
            this.refreshQueue.unshift(job); // Add back to front of queue
            this.refreshQueue.sort((a, b) => b.priority - a.priority);
          }
        }, this.config.retryDelay * job.attempts); // Exponential backoff
      }
    } finally {
      this.activeRefreshes.delete(job.key);
    }
  }

  private scheduleRefreshChecks(): void {
    if (!this.isRunning) return;
    
    // Schedule refresh checks for each strategy
    this.config.refreshStrategies.forEach(strategy => {
      const timer = setInterval(async () => {
        if (!this.isRunning) return;
        
        try {
          await this.checkAndScheduleRefreshes(strategy);
        } catch (error) {
          console.warn(`Refresh check failed for strategy ${strategy.name}:`, error);
        }
      }, strategy.refreshInterval);
      
      this.refreshTimers.set(strategy.name, timer);
    });
  }

  private async checkAndScheduleRefreshes(strategy: RefreshStrategy): Promise<void> {
    // This would typically iterate through cache keys
    // For now, we'll implement a simplified version that works with registered keys
    
    // In a real implementation, you'd get all cache keys and check their metadata
    // Here we'll focus on the most important cache keys
    const importantKeys = [
      'discovery_data',
      'trending_novels',
      'new_arrivals',
      'editors_choice',
      'fantasy_novels'
    ];
    
    for (const key of importantKeys) {
      try {
        const metadata = await this.cacheManager.getMetadata(key);
        if (metadata && strategy.shouldRefresh(metadata)) {
          // We need a way to get the appropriate fetcher for this key
          // This would be registered when the cache is first populated
          console.log(`Scheduling refresh for key ${key} using strategy ${strategy.name}`);
        }
      } catch (error) {
        console.warn(`Error checking metadata for key ${key}:`, error);
      }
    }
  }

  private updateRefreshStats(success: boolean, duration: number): void {
    this.refreshStats.totalRefreshes++;
    
    if (success) {
      this.refreshStats.successfulRefreshes++;
    } else {
      this.refreshStats.failedRefreshes++;
    }
    
    // Update average refresh time
    const totalTime = this.refreshStats.averageRefreshTime * (this.refreshStats.totalRefreshes - 1) + duration;
    this.refreshStats.averageRefreshTime = totalTime / this.refreshStats.totalRefreshes;
  }
}

// Singleton instance
let backgroundRefresherInstance: BackgroundCacheRefresher | null = null;

/**
 * Get the global background cache refresher instance
 */
export function getBackgroundRefresher(
  cacheManager?: any, 
  config?: BackgroundRefreshConfig
): BackgroundCacheRefresher {
  if (!backgroundRefresherInstance) {
    // If no cache manager provided, create without it to avoid circular dependency
    const manager = cacheManager || null;
    backgroundRefresherInstance = new BackgroundCacheRefresher(manager, config);
  }
  return backgroundRefresherInstance;
}

/**
 * Reset the background refresher instance (useful for testing)
 */
export function resetBackgroundRefresher(): void {
  if (backgroundRefresherInstance) {
    backgroundRefresherInstance.stop();
    backgroundRefresherInstance = null;
  }
}