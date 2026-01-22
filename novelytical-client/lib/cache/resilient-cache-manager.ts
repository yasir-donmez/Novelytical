/**
 * Resilient Cache Manager
 * 
 * Provides fault-tolerant caching with comprehensive error handling,
 * fallback chains, network resilience, and offline support.
 */

import { CacheManager, CacheConfig, CacheStats, CacheMetadata } from './cache-manager';
import { CacheManagerImpl } from './cache-manager-impl';

export interface ResilienceConfig {
  // Retry configuration
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  
  // Circuit breaker configuration
  circuitBreakerThreshold: number; // Number of failures before opening circuit
  circuitBreakerTimeout: number; // Time to wait before trying again (ms)
  circuitBreakerResetTimeout: number; // Time to wait before resetting circuit (ms)
  
  // Fallback configuration
  enableFallbackChain: boolean;
  fallbackToMemoryOnly: boolean;
  fallbackToLocalStorageOnly: boolean;
  gracefulDegradation: boolean;
  
  // Network resilience
  networkTimeoutMs: number;
  offlineSupport: boolean;
  offlineStorageKey: string;
  
  // Error monitoring
  errorReportingEnabled: boolean;
  maxErrorHistory: number;
}

export interface ErrorInfo {
  timestamp: number;
  operation: string;
  error: Error;
  context: any;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000, // 30 seconds
  circuitBreakerResetTimeout: 60000, // 1 minute
  
  enableFallbackChain: true,
  fallbackToMemoryOnly: true,
  fallbackToLocalStorageOnly: true,
  gracefulDegradation: true,
  
  networkTimeoutMs: 5000,
  offlineSupport: true,
  offlineStorageKey: 'novelytical_offline_cache',
  
  errorReportingEnabled: true,
  maxErrorHistory: 100
};

export class ResilientCacheManager implements CacheManager {
  private cacheManager: CacheManagerImpl;
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private errorHistory: ErrorInfo[] = [];
  private isOnline = navigator.onLine;
  private offlineQueue: Array<{ operation: string; args: any[]; resolve: Function; reject: Function }> = [];

  constructor(
    private cacheConfig: CacheConfig,
    private resilienceConfig: ResilienceConfig = DEFAULT_RESILIENCE_CONFIG
  ) {
    this.cacheManager = new CacheManagerImpl(cacheConfig);
    this.setupNetworkMonitoring();
    this.setupOfflineSupport();
  }

  // CacheManager interface implementation with resilience

  async get<T>(key: string, dataType?: string): Promise<T | null> {
    return this.executeWithResilience('get', async () => {
      return this.cacheManager.get<T>(key, dataType);
    }, { key, dataType });
  }

  async set<T>(key: string, value: T, dataType?: string, customTTL?: number): Promise<void> {
    return this.executeWithResilience('set', async () => {
      return this.cacheManager.set(key, value, dataType, customTTL);
    }, { key, dataType, customTTL });
  }

  async invalidate(pattern: string): Promise<void> {
    return this.executeWithResilience('invalidate', async () => {
      return this.cacheManager.invalidate(pattern);
    }, { pattern });
  }

  async clear(): Promise<void> {
    return this.executeWithResilience('clear', async () => {
      return this.cacheManager.clear();
    }, {});
  }

  async getStats(): Promise<CacheStats> {
    return this.executeWithResilience('getStats', async () => {
      return this.cacheManager.getStats();
    }, {});
  }

  async getMetadata(key: string): Promise<CacheMetadata | null> {
    return this.executeWithResilience('getMetadata', async () => {
      return this.cacheManager.getMetadata(key);
    }, { key });
  }

  // Resilience-specific methods

  /**
   * Execute operation with comprehensive error handling and resilience
   */
  private async executeWithResilience<T>(
    operation: string,
    fn: () => Promise<T>,
    context: any
  ): Promise<T> {
    // Check circuit breaker
    if (!this.isCircuitClosed(operation)) {
      throw new Error(`Circuit breaker is open for operation: ${operation}`);
    }

    // Handle offline scenarios
    if (!this.isOnline && this.resilienceConfig.offlineSupport) {
      return this.handleOfflineOperation(operation, fn, context);
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.resilienceConfig.maxRetries) {
      try {
        const result = await this.executeWithTimeout(fn, this.resilienceConfig.networkTimeoutMs);
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(operation);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        // Record error
        this.recordError(operation, lastError, context, attempt <= this.resilienceConfig.maxRetries);
        
        // Update circuit breaker
        this.recordFailure(operation);
        
        // Try fallback strategies before retrying
        if (attempt <= this.resilienceConfig.maxRetries) {
          const fallbackResult = await this.tryFallbackStrategies(operation, context, lastError);
          if (fallbackResult !== null) {
            return fallbackResult as T;
          }
          
          // Wait before retry with exponential backoff
          if (attempt < this.resilienceConfig.maxRetries) {
            const delay = this.calculateRetryDelay(attempt);
            await this.sleep(delay);
          }
        }
      }
    }

    // All retries failed, try graceful degradation
    if (this.resilienceConfig.gracefulDegradation) {
      const degradedResult = await this.gracefulDegradation(operation, context, lastError!);
      if (degradedResult !== null) {
        return degradedResult as T;
      }
    }

    throw lastError || new Error(`Operation ${operation} failed after ${this.resilienceConfig.maxRetries} retries`);
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Try fallback strategies when primary operation fails
   */
  private async tryFallbackStrategies<T>(
    operation: string,
    context: any,
    error: Error
  ): Promise<T | null> {
    if (!this.resilienceConfig.enableFallbackChain) {
      return null;
    }

    try {
      // Strategy 1: Memory-only fallback
      if (this.resilienceConfig.fallbackToMemoryOnly && operation === 'get') {
        const memoryResult = await this.cacheManager.memory.get(context.key);
        if (memoryResult !== null) {
          this.recordError(operation, error, context, true, true);
          return memoryResult as T;
        }
      }

      // Strategy 2: LocalStorage-only fallback
      if (this.resilienceConfig.fallbackToLocalStorageOnly && operation === 'get') {
        const localStorageResult = await this.cacheManager.localStorage.get(context.key);
        if (localStorageResult !== null) {
          this.recordError(operation, error, context, true, true);
          return localStorageResult as T;
        }
      }

      // Strategy 3: Offline storage fallback
      if (this.resilienceConfig.offlineSupport && operation === 'get') {
        const offlineResult = this.getFromOfflineStorage<T>(context.key);
        if (offlineResult !== null) {
          this.recordError(operation, error, context, true, true);
          return offlineResult;
        }
      }

    } catch (fallbackError) {
      // Fallback strategies failed, continue with original error
      console.warn('Fallback strategies failed:', fallbackError);
    }

    return null;
  }

  /**
   * Graceful degradation when all else fails
   */
  private async gracefulDegradation<T>(
    operation: string,
    context: any,
    error: Error
  ): Promise<T | null> {
    // For read operations, return null instead of throwing
    if (operation === 'get' || operation === 'getMetadata') {
      console.warn(`Graceful degradation: ${operation} failed, returning null`, error);
      return null;
    }

    // For write operations, queue for later if offline support is enabled
    if (this.resilienceConfig.offlineSupport && (operation === 'set' || operation === 'invalidate')) {
      this.queueOfflineOperation(operation, context);
      console.warn(`Graceful degradation: ${operation} queued for later execution`, error);
      return null; // Return null instead of undefined as T
    }

    // For other operations, return empty/default values
    if (operation === 'getStats') {
      return {
        memory: { hitCount: 0, missCount: 0, hitRate: 0, size: 0, maxSize: 0 },
        localStorage: { hitCount: 0, missCount: 0, hitRate: 0, size: 0, maxSize: 0 },
        overall: { totalHits: 0, totalMisses: 0, overallHitRate: 0, avgResponseTime: 0 }
      } as T;
    }

    return null;
  }

  /**
   * Handle operations when offline
   */
  private async handleOfflineOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context: any
  ): Promise<T> {
    // For read operations, try offline storage first
    if (operation === 'get') {
      const offlineResult = this.getFromOfflineStorage<T>(context.key);
      if (offlineResult !== null) {
        return offlineResult;
      }
      
      // Try memory cache
      const memoryResult = await this.cacheManager.memory.get<T>(context.key);
      if (memoryResult !== null) {
        return memoryResult;
      }
      
      // Try localStorage cache
      const localStorageResult = await this.cacheManager.localStorage.get<T>(context.key);
      if (localStorageResult !== null) {
        return localStorageResult;
      }
    }

    // For write operations, queue for later
    if (operation === 'set' || operation === 'invalidate' || operation === 'clear') {
      this.queueOfflineOperation(operation, context);
      // For write operations, we need to return a value that satisfies T
      // Since these operations typically return void, we'll cast null as T
      return null as unknown as T;
    }

    // Try to execute anyway (might work if it's local-only)
    try {
      return await fn();
    } catch (error) {
      throw new Error(`Operation ${operation} failed while offline: ${error}`);
    }
  }

  // Circuit breaker implementation

  private isCircuitClosed(operation: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(operation);
    if (!circuitBreaker) return true;

    const now = Date.now();

    switch (circuitBreaker.state) {
      case 'closed':
        return true;
      
      case 'open':
        if (now >= circuitBreaker.nextAttemptTime) {
          circuitBreaker.state = 'half-open';
          return true;
        }
        return false;
      
      case 'half-open':
        return true;
      
      default:
        return true;
    }
  }

  private recordFailure(operation: string): void {
    const now = Date.now();
    let circuitBreaker = this.circuitBreakers.get(operation);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: now,
        nextAttemptTime: now
      };
      this.circuitBreakers.set(operation, circuitBreaker);
    }

    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = now;

    if (circuitBreaker.failureCount >= this.resilienceConfig.circuitBreakerThreshold) {
      circuitBreaker.state = 'open';
      circuitBreaker.nextAttemptTime = now + this.resilienceConfig.circuitBreakerTimeout;
    }
  }

  private resetCircuitBreaker(operation: string): void {
    const circuitBreaker = this.circuitBreakers.get(operation);
    if (circuitBreaker) {
      circuitBreaker.state = 'closed';
      circuitBreaker.failureCount = 0;
    }
  }

  // Error recording and monitoring

  private recordError(
    operation: string,
    error: Error,
    context: any,
    recoveryAttempted: boolean = false,
    recoverySuccessful: boolean = false
  ): void {
    if (!this.resilienceConfig.errorReportingEnabled) return;

    const errorInfo: ErrorInfo = {
      timestamp: Date.now(),
      operation,
      error,
      context,
      recoveryAttempted,
      recoverySuccessful
    };

    this.errorHistory.push(errorInfo);

    // Keep error history within limits
    if (this.errorHistory.length > this.resilienceConfig.maxErrorHistory) {
      this.errorHistory.shift();
    }

    // Log error for debugging
    console.warn(`Cache operation ${operation} failed:`, error, context);
  }

  // Offline support

  private setupNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processOfflineQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private setupOfflineSupport(): void {
    if (!this.resilienceConfig.offlineSupport) return;

    // Load offline queue from storage on startup
    try {
      const stored = localStorage.getItem(`${this.resilienceConfig.offlineStorageKey}_queue`);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }

  private queueOfflineOperation(operation: string, context: any): void {
    this.offlineQueue.push({
      operation,
      args: [context],
      resolve: () => {},
      reject: () => {}
    });

    // Persist queue to localStorage
    try {
      localStorage.setItem(
        `${this.resilienceConfig.offlineStorageKey}_queue`,
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.warn('Failed to persist offline queue:', error);
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`Processing ${this.offlineQueue.length} offline operations`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        switch (item.operation) {
          case 'set':
            await this.cacheManager.set(
              item.args[0].key,
              item.args[0].value,
              item.args[0].dataType,
              item.args[0].customTTL
            );
            break;
          case 'invalidate':
            await this.cacheManager.invalidate(item.args[0].pattern);
            break;
          case 'clear':
            await this.cacheManager.clear();
            break;
        }
        item.resolve();
      } catch (error) {
        item.reject(error);
        console.warn('Failed to process offline operation:', error);
      }
    }

    // Clear persisted queue
    try {
      localStorage.removeItem(`${this.resilienceConfig.offlineStorageKey}_queue`);
    } catch (error) {
      console.warn('Failed to clear offline queue:', error);
    }
  }

  private getFromOfflineStorage<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`${this.resilienceConfig.offlineStorageKey}_${key}`);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if data is still valid (not expired)
        if (data.expiresAt > Date.now()) {
          return data.value;
        }
      }
    } catch (error) {
      console.warn('Failed to get from offline storage:', error);
    }
    return null;
  }

  // Utility methods

  private calculateRetryDelay(attempt: number): number {
    if (!this.resilienceConfig.exponentialBackoff) {
      return this.resilienceConfig.retryDelayMs;
    }
    
    return this.resilienceConfig.retryDelayMs * Math.pow(2, attempt - 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public resilience methods

  /**
   * Get error history for monitoring and debugging
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  /**
   * Get resilience statistics
   */
  getResilienceStats(): {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    circuitBreakerStates: Record<string, string>;
    offlineQueueSize: number;
    isOnline: boolean;
  } {
    const errorsByOperation: Record<string, number> = {};
    for (const error of this.errorHistory) {
      errorsByOperation[error.operation] = (errorsByOperation[error.operation] || 0) + 1;
    }

    const circuitBreakerStates: Record<string, string> = {};
    for (const [operation, state] of this.circuitBreakers.entries()) {
      circuitBreakerStates[operation] = state.state;
    }

    return {
      totalErrors: this.errorHistory.length,
      errorsByOperation,
      circuitBreakerStates,
      offlineQueueSize: this.offlineQueue.length,
      isOnline: this.isOnline
    };
  }

  // Expose underlying cache manager for advanced operations
  get memory() { return this.cacheManager.memory; }
  get localStorage() { return this.cacheManager.localStorage; }
}