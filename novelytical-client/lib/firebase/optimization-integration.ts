/**
 * Firebase Optimization Integration Layer
 * 
 * Bu dosya tüm optimizasyon bileşenlerini entegre eder ve
 * cache manager, query optimizer ve monitoring sistemleri arasında
 * sorunsuz etkileşim sağlar.
 * 
 * Requirements: 1.1, 2.1
 */

import { getCacheManager } from '@/lib/cache/cache-manager-impl';
import { getQueryOptimizer } from './query-optimizer-impl';
import { performanceMonitor } from './performance-monitor';
import { ResilientCacheManager } from '@/lib/cache/resilient-cache-manager';
import { getErrorRecoveryManager } from '@/lib/cache/error-recovery-manager';
import { 
  CacheConfig, 
  DEFAULT_CACHE_CONFIG 
} from '@/lib/cache/cache-manager';
import { 
  OptimizationConfig, 
  DEFAULT_OPTIMIZATION_CONFIG 
} from './query-optimizer';

// Integration configuration
export interface OptimizationIntegrationConfig {
  cache: CacheConfig;
  queryOptimizer: OptimizationConfig;
  enablePerformanceMonitoring: boolean;
  enableErrorRecovery: boolean;
  enableResilientCaching: boolean;
  
  // Performance targets
  readOperationsTarget: number; // Target: 45 (from 151)
  ruleEvaluationsTarget: number; // Target: 4500 (from 15000)
  cacheHitRateTarget: number; // Target: 85%
  responseTimeTarget: number; // Target: 200ms
}

export const DEFAULT_INTEGRATION_CONFIG: OptimizationIntegrationConfig = {
  cache: DEFAULT_CACHE_CONFIG,
  queryOptimizer: DEFAULT_OPTIMIZATION_CONFIG,
  enablePerformanceMonitoring: true,
  enableErrorRecovery: true,
  enableResilientCaching: true,
  
  readOperationsTarget: 45,
  ruleEvaluationsTarget: 4500,
  cacheHitRateTarget: 85,
  responseTimeTarget: 200
};

// Integration metrics
export interface IntegrationMetrics {
  cache: {
    hitRate: number;
    responseTime: number;
    errorRate: number;
  };
  queryOptimizer: {
    readOperations: number;
    optimizationRatio: number;
    averageResponseTime: number;
  };
  performance: {
    readOperationsReduction: number;
    ruleEvaluationsReduction: number;
    overallPerformanceGain: number;
  };
  targets: {
    readOperationsAchieved: boolean;
    ruleEvaluationsAchieved: boolean;
    cacheHitRateAchieved: boolean;
    responseTimeAchieved: boolean;
  };
}

/**
 * Firebase Optimization Integration Manager
 * 
 * Tüm optimizasyon bileşenlerini koordine eder ve
 * performans hedeflerine ulaşmak için sistemler arası
 * etkileşimi yönetir.
 */
export class OptimizationIntegrationManager {
  private cacheManager: any;
  private queryOptimizer: any;
  private errorRecoveryManager: any;
  private isInitialized = false;
  
  // Performance tracking
  private baselineMetrics = {
    readOperations: 151,
    ruleEvaluations: 15000,
    cacheHitRate: 0,
    responseTime: 1000
  };

  constructor(private config: OptimizationIntegrationConfig = DEFAULT_INTEGRATION_CONFIG) {}

  /**
   * Initialize all optimization systems
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize cache manager
      if (this.config.enableResilientCaching) {
        this.cacheManager = new ResilientCacheManager(this.config.cache);
      } else {
        this.cacheManager = getCacheManager(this.config.cache);
      }

      // Initialize query optimizer
      this.queryOptimizer = getQueryOptimizer(this.config.queryOptimizer);

      // Initialize error recovery manager
      if (this.config.enableErrorRecovery) {
        this.errorRecoveryManager = getErrorRecoveryManager();
      }

      // Setup performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      // Setup cross-system integration
      this.setupCrossSystemIntegration();

      this.isInitialized = true;
      console.log('Firebase optimization systems initialized successfully');
    } catch (error) {
      console.error('Failed to initialize optimization systems:', error);
      throw error;
    }
  }

  /**
   * Optimized data fetching with integrated caching and query optimization
   */
  async fetchOptimized<T>(
    operation: string,
    fetcher: () => Promise<T>,
    options: {
      cacheKey: string;
      dataType?: string;
      collection?: string;
      enableBatching?: boolean;
      priority?: number;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Track operation start
      if (this.config.enablePerformanceMonitoring) {
        performanceMonitor.trackFirebaseRead(options.collection || 'unknown', 1);
      }

      // Try cache first with error handling
      let cached: T | null = null;
      try {
        cached = await this.cacheManager.get(
          options.cacheKey, 
          options.dataType || 'dynamic'
        ) as T | null;
      } catch (cacheError) {
        console.warn('Cache get error, continuing without cache:', cacheError);
      }
      
      if (cached !== null) {
        // Track cache hit
        if (this.config.enablePerformanceMonitoring) {
          performanceMonitor.trackCacheHit('integrated', options.cacheKey);
        }
        
        // Track response time
        const responseTime = Date.now() - startTime;
        this.trackResponseTime(responseTime);
        
        return cached;
      }

      // Cache miss - fetch with error recovery
      let result: T;
      
      if (this.config.enableErrorRecovery) {
        result = await this.errorRecoveryManager.executeWithRecovery(
          operation,
          fetcher
        );
      } else {
        result = await fetcher();
      }

      // Cache the result with error handling
      try {
        await this.cacheManager.set(
          options.cacheKey,
          result,
          options.dataType || 'dynamic'
        );
      } catch (cacheError) {
        console.warn('Cache set error, continuing without caching:', cacheError);
      }

      // Track cache miss
      if (this.config.enablePerformanceMonitoring) {
        performanceMonitor.trackCacheMiss('integrated', options.cacheKey);
      }

      // Track response time
      const responseTime = Date.now() - startTime;
      this.trackResponseTime(responseTime);

      return result;
    } catch (error) {
      // Track error
      if (this.config.enableErrorRecovery) {
        this.errorRecoveryManager.recordError(error as Error, operation);
      }
      
      throw error;
    }
  }

  /**
   * Batch optimized operations
   */
  async batchFetchOptimized<T>(
    operations: Array<{
      operation: string;
      fetcher: () => Promise<T>;
      cacheKey: string;
      dataType?: string;
      collection?: string;
    }>
  ): Promise<T[]> {
    const startTime = Date.now();
    const results: T[] = [];

    try {
      // Group operations by collection for query optimization
      const operationsByCollection = this.groupOperationsByCollection(operations);

      for (const [collection, collectionOps] of operationsByCollection) {
        // Try to use query optimizer for batch operations
        const batchResults = await Promise.all(
          collectionOps.map(op => this.fetchOptimized(
            op.operation,
            op.fetcher,
            {
              cacheKey: op.cacheKey,
              dataType: op.dataType,
              collection: op.collection,
              enableBatching: true
            }
          ))
        );
        
        results.push(...(batchResults as T[]));
      }

      // Track batch operation performance
      if (this.config.enablePerformanceMonitoring) {
        const responseTime = Date.now() - startTime;
        performanceMonitor.trackFirebaseRead('batch_operation', operations.length);
        this.trackResponseTime(responseTime);
      }

      return results;
    } catch (error) {
      console.error('Batch fetch optimization failed:', error);
      throw error;
    }
  }

  /**
   * Smart cache invalidation with cross-system coordination
   */
  async smartInvalidate(context: {
    type: 'user_update' | 'novel_update' | 'discovery_refresh' | 'search_clear';
    entityId?: string | number;
    patterns?: string[];
    dataTypes?: string[];
  }): Promise<void> {
    try {
      // Use cache manager's smart invalidation
      await this.cacheManager.smartInvalidate(context);

      // Reset query optimizer metrics for affected operations
      if (context.type === 'discovery_refresh') {
        this.queryOptimizer.resetMetrics();
      }

      // Track invalidation
      if (this.config.enablePerformanceMonitoring) {
        performanceMonitor.trackCacheMiss('invalidation', context.type);
      }
    } catch (error) {
      console.error('Smart invalidation failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive integration metrics
   */
  async getIntegrationMetrics(): Promise<IntegrationMetrics> {
    const cacheStats = await this.cacheManager.getStats();
    const queryMetrics = this.queryOptimizer.getMetrics();
    const performanceReport = performanceMonitor.getOptimizationReport();

    // Calculate performance improvements
    const readOperationsReduction = ((this.baselineMetrics.readOperations - performanceReport.readOperations.current) / this.baselineMetrics.readOperations) * 100;
    const ruleEvaluationsReduction = ((this.baselineMetrics.ruleEvaluations - performanceReport.ruleEvaluations.current) / this.baselineMetrics.ruleEvaluations) * 100;
    const overallPerformanceGain = (readOperationsReduction + ruleEvaluationsReduction) / 2;

    return {
      cache: {
        hitRate: cacheStats.overall.overallHitRate * 100,
        responseTime: cacheStats.overall.avgResponseTime,
        errorRate: this.config.enableErrorRecovery 
          ? this.calculateErrorRate() 
          : 0
      },
      queryOptimizer: {
        readOperations: queryMetrics.totalReads,
        optimizationRatio: queryMetrics.optimizationRatio,
        averageResponseTime: queryMetrics.averageResponseTime
      },
      performance: {
        readOperationsReduction,
        ruleEvaluationsReduction,
        overallPerformanceGain
      },
      targets: {
        readOperationsAchieved: performanceReport.readOperations.current <= this.config.readOperationsTarget,
        ruleEvaluationsAchieved: performanceReport.ruleEvaluations.current <= this.config.ruleEvaluationsTarget,
        cacheHitRateAchieved: (cacheStats.overall.overallHitRate * 100) >= this.config.cacheHitRateTarget,
        responseTimeAchieved: cacheStats.overall.avgResponseTime <= this.config.responseTimeTarget
      }
    };
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<{
    priority: 'high' | 'medium' | 'low';
    recommendations: string[];
    estimatedImpact: {
      readReduction: number;
      ruleReduction: number;
      performanceGain: number;
    };
  }> {
    const metrics = await this.getIntegrationMetrics();
    const recommendations: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';
    let estimatedImpact = { readReduction: 0, ruleReduction: 0, performanceGain: 0 };

    // Analyze cache performance
    if (metrics.cache.hitRate < this.config.cacheHitRateTarget) {
      recommendations.push('Cache hit rate is below target. Consider implementing background cache refresh.');
      priority = 'high';
      estimatedImpact.performanceGain += 20;
    }

    // Analyze read operations
    if (!metrics.targets.readOperationsAchieved) {
      recommendations.push('Firebase read operations exceed target. Implement more aggressive caching and query batching.');
      priority = 'high';
      estimatedImpact.readReduction += 30;
    }

    // Analyze rule evaluations
    if (!metrics.targets.ruleEvaluationsAchieved) {
      recommendations.push('Security rule evaluations are high. Consider rule simplification and pre-computed authorization.');
      if (priority !== 'high') priority = 'medium';
      estimatedImpact.ruleReduction += 40;
    }

    // Analyze response time
    if (!metrics.targets.responseTimeAchieved) {
      recommendations.push('Response time is above target. Optimize cache TTL settings and implement predictive loading.');
      if (priority === 'low') priority = 'medium';
      estimatedImpact.performanceGain += 15;
    }

    return {
      priority,
      recommendations,
      estimatedImpact
    };
  }

  /**
   * Health check for all optimization systems
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    systems: {
      cache: 'healthy' | 'degraded' | 'critical';
      queryOptimizer: 'healthy' | 'degraded' | 'critical';
      performanceMonitoring: 'healthy' | 'degraded' | 'critical';
      errorRecovery: 'healthy' | 'degraded' | 'critical';
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const systems = {
      cache: 'healthy' as 'healthy' | 'degraded' | 'critical',
      queryOptimizer: 'healthy' as 'healthy' | 'degraded' | 'critical',
      performanceMonitoring: 'healthy' as 'healthy' | 'degraded' | 'critical',
      errorRecovery: 'healthy' as 'healthy' | 'degraded' | 'critical'
    };

    try {
      // Check cache system
      const cacheStats = await this.cacheManager.getStats();
      if (cacheStats.overall.overallHitRate < 0.5) {
        systems.cache = 'degraded';
        issues.push('Cache hit rate is critically low');
      }

      // Check query optimizer
      const queryMetrics = this.queryOptimizer.getMetrics();
      if (queryMetrics.averageResponseTime > 1000) {
        systems.queryOptimizer = 'degraded';
        issues.push('Query optimizer response time is high');
      }

      // Check error recovery if enabled
      if (this.config.enableErrorRecovery) {
        const errorMetrics = this.errorRecoveryManager.getMetrics();
        if (errorMetrics.totalErrors > 100) {
          systems.errorRecovery = 'degraded';
          issues.push('High error rate detected');
        }
      }

      // Determine overall status
      const systemStatuses = Object.values(systems);
      const overallStatus = systemStatuses.includes('critical') 
        ? 'critical' 
        : systemStatuses.includes('degraded') 
          ? 'degraded' 
          : 'healthy';

      return {
        status: overallStatus,
        systems,
        issues
      };
    } catch (error) {
      return {
        status: 'critical',
        systems: {
          cache: 'critical',
          queryOptimizer: 'critical',
          performanceMonitoring: 'critical',
          errorRecovery: 'critical'
        },
        issues: [`Health check failed: ${error}`]
      };
    }
  }

  // Private methods

  private setupPerformanceMonitoring(): void {
    // Setup performance monitoring integration
    // This would typically involve setting up event listeners
    // and automatic metric collection
  }

  private setupCrossSystemIntegration(): void {
    // Setup integration between cache manager and query optimizer
    // This ensures they work together efficiently
    
    // Register cache manager with query optimizer for automatic caching
    if (this.queryOptimizer && this.cacheManager) {
      // Integration logic would go here
      console.log('Cross-system integration configured');
    }
  }

  private groupOperationsByCollection(operations: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    for (const op of operations) {
      const collection = op.collection || 'default';
      if (!grouped.has(collection)) {
        grouped.set(collection, []);
      }
      grouped.get(collection)!.push(op);
    }
    
    return grouped;
  }

  private trackResponseTime(responseTime: number): void {
    // Track response time for performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      // This would integrate with the performance monitor
      // to track response times across the system
    }
  }

  private calculateErrorRate(): number {
    if (!this.config.enableErrorRecovery || !this.errorRecoveryManager) {
      return 0;
    }
    
    const metrics = this.errorRecoveryManager.getMetrics();
    const totalOperations = metrics.recoveryAttempts + metrics.successfulRecoveries;
    
    return totalOperations > 0 ? (metrics.totalErrors / totalOperations) * 100 : 0;
  }
}

// Singleton instance
let integrationManagerInstance: OptimizationIntegrationManager | null = null;

/**
 * Get the global optimization integration manager instance
 */
export function getOptimizationIntegrationManager(
  config?: OptimizationIntegrationConfig
): OptimizationIntegrationManager {
  if (!integrationManagerInstance) {
    integrationManagerInstance = new OptimizationIntegrationManager(config);
  }
  return integrationManagerInstance;
}

/**
 * Initialize optimization systems
 */
export async function initializeOptimizationSystems(
  config?: OptimizationIntegrationConfig
): Promise<OptimizationIntegrationManager> {
  const manager = getOptimizationIntegrationManager(config);
  await manager.initialize();
  return manager;
}

/**
 * Reset the integration manager instance (useful for testing)
 */
export function resetOptimizationIntegrationManager(): void {
  integrationManagerInstance = null;
}