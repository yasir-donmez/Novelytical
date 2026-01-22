/**
 * Firebase Optimization Integration Tests
 * 
 * Bu testler entegrasyon sisteminin doğru çalıştığını ve
 * tüm bileşenlerin birlikte sorunsuz çalıştığını doğrular.
 */

// Mock Firebase before importing anything else
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  analytics: null
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  documentId: jest.fn()
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => null),
  logEvent: jest.fn()
}));

import { 
  OptimizationIntegrationManager,
  getOptimizationIntegrationManager,
  initializeOptimizationSystems,
  resetOptimizationIntegrationManager,
  DEFAULT_INTEGRATION_CONFIG
} from '../optimization-integration';

// Mock dependencies
jest.mock('@/lib/cache/cache-manager-impl', () => ({
  getCacheManager: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockResolvedValue({
      memory: { hitCount: 10, missCount: 5, hitRate: 0.67, size: 1000, maxSize: 10000 },
      localStorage: { hitCount: 8, missCount: 7, hitRate: 0.53, size: 2000, maxSize: 20000 },
      overall: { totalHits: 18, totalMisses: 12, overallHitRate: 0.6, avgResponseTime: 150 }
    }),
    getMetadata: jest.fn().mockResolvedValue(null),
    smartInvalidate: jest.fn().mockResolvedValue(undefined),
    memory: {},
    localStorage: {}
  }))
}));

jest.mock('../query-optimizer-impl', () => ({
  getQueryOptimizer: jest.fn(() => ({
    getMetrics: jest.fn().mockReturnValue({
      totalQueries: 100,
      totalReads: 50,
      cacheHits: 30,
      cacheMisses: 20,
      averageResponseTime: 200,
      optimizationRatio: 60
    }),
    resetMetrics: jest.fn()
  }))
}));

jest.mock('../performance-monitor', () => ({
  performanceMonitor: {
    trackFirebaseRead: jest.fn(),
    trackCacheHit: jest.fn(),
    trackCacheMiss: jest.fn(),
    getOptimizationReport: jest.fn().mockReturnValue({
      readOperations: { current: 40, target: 45, reduction: 73.5 },
      ruleEvaluations: { current: 4000, target: 4500, reduction: 73.3 },
      cacheEfficiency: { hitRate: 85, missRate: 15, avgResponseTime: 180 },
      timestamp: new Date()
    })
  }
}));

jest.mock('@/lib/cache/resilient-cache-manager', () => ({
  ResilientCacheManager: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockResolvedValue({
      memory: { hitCount: 10, missCount: 5, hitRate: 0.67, size: 1000, maxSize: 10000 },
      localStorage: { hitCount: 8, missCount: 7, hitRate: 0.53, size: 2000, maxSize: 20000 },
      overall: { totalHits: 18, totalMisses: 12, overallHitRate: 0.6, avgResponseTime: 150 }
    }),
    getMetadata: jest.fn().mockResolvedValue(null),
    smartInvalidate: jest.fn().mockResolvedValue(undefined),
    memory: {},
    localStorage: {}
  }))
}));

jest.mock('@/lib/cache/error-recovery-manager', () => ({
  getErrorRecoveryManager: jest.fn(() => ({
    executeWithRecovery: jest.fn().mockImplementation((operation, fn) => fn()),
    recordError: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      totalErrors: 5,
      errorsByType: { network: 2, timeout: 1, unknown: 2 },
      errorsBySeverity: { low: 1, medium: 3, high: 1 },
      recoveryAttempts: 10,
      successfulRecoveries: 8,
      failedRecoveries: 2,
      averageRecoveryTime: 500,
      circuitBreakerTrips: 1
    })
  }))
}));

describe('OptimizationIntegrationManager', () => {
  let manager: OptimizationIntegrationManager;

  beforeEach(() => {
    resetOptimizationIntegrationManager();
    manager = new OptimizationIntegrationManager();
  });

  afterEach(() => {
    resetOptimizationIntegrationManager();
  });

  describe('Initialization', () => {
    it('should initialize all optimization systems', async () => {
      await manager.initialize();
      
      const healthCheck = await manager.healthCheck();
      expect(healthCheck.status).toBeDefined();
      expect(healthCheck.systems).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock initialization failure
      const mockError = new Error('Initialization failed');
      jest.spyOn(manager as any, 'setupPerformanceMonitoring').mockImplementation(() => {
        throw mockError;
      });

      await expect(manager.initialize()).rejects.toThrow('Initialization failed');
    });

    it('should not reinitialize if already initialized', async () => {
      await manager.initialize();
      const setupSpy = jest.spyOn(manager as any, 'setupPerformanceMonitoring');
      
      await manager.initialize();
      
      // Should not call setup methods again
      expect(setupSpy).not.toHaveBeenCalled();
    });
  });

  describe('Optimized Fetching', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should fetch data with integrated caching and optimization', async () => {
      const mockData = { id: 1, title: 'Test Novel' };
      const fetcher = jest.fn().mockResolvedValue(mockData);

      const result = await manager.fetchOptimized(
        'test_operation',
        fetcher,
        {
          cacheKey: 'test_key',
          dataType: 'novel',
          collection: 'novels'
        }
      );

      expect(result).toEqual(mockData);
      expect(fetcher).toHaveBeenCalled();
    });

    it('should return cached data when available', async () => {
      const mockData = { id: 1, title: 'Cached Novel' };
      const fetcher = jest.fn().mockResolvedValue(mockData);

      // Mock cache to return null first time, then return data second time
      const mockCacheManager = (manager as any).cacheManager;
      mockCacheManager.get
        .mockResolvedValueOnce(null) // First call - cache miss
        .mockResolvedValueOnce(mockData); // Second call - cache hit

      // First call should cache the data
      await manager.fetchOptimized(
        'test_operation',
        fetcher,
        {
          cacheKey: 'test_key',
          dataType: 'novel',
          collection: 'novels'
        }
      );

      // Second call should return cached data
      const result = await manager.fetchOptimized(
        'test_operation',
        fetcher,
        {
          cacheKey: 'test_key',
          dataType: 'novel',
          collection: 'novels'
        }
      );

      expect(result).toEqual(mockData);
      // Fetcher should be called once for first call, not called for second (cached)
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors with error recovery', async () => {
      const mockError = new Error('Fetch failed');
      const fetcher = jest.fn().mockRejectedValue(mockError);

      await expect(manager.fetchOptimized(
        'test_operation',
        fetcher,
        {
          cacheKey: 'test_key',
          dataType: 'novel',
          collection: 'novels'
        }
      )).rejects.toThrow('Fetch failed');
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should handle batch fetch operations', async () => {
      const operations = [
        {
          operation: 'fetch_novel_1',
          fetcher: jest.fn().mockResolvedValue({ id: 1, title: 'Novel 1' }),
          cacheKey: 'novel_1',
          dataType: 'novel',
          collection: 'novels'
        },
        {
          operation: 'fetch_novel_2',
          fetcher: jest.fn().mockResolvedValue({ id: 2, title: 'Novel 2' }),
          cacheKey: 'novel_2',
          dataType: 'novel',
          collection: 'novels'
        }
      ];

      const results = await manager.batchFetchOptimized(operations);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1, title: 'Novel 1' });
      expect(results[1]).toEqual({ id: 2, title: 'Novel 2' });
    });

    it('should group operations by collection for optimization', async () => {
      const operations = [
        {
          operation: 'fetch_novel_1',
          fetcher: jest.fn().mockResolvedValue({ id: 1 }),
          cacheKey: 'novel_1',
          collection: 'novels'
        },
        {
          operation: 'fetch_user_1',
          fetcher: jest.fn().mockResolvedValue({ id: 1 }),
          cacheKey: 'user_1',
          collection: 'users'
        }
      ];

      const results = await manager.batchFetchOptimized(operations);
      expect(results).toHaveLength(2);
    });
  });

  describe('Smart Invalidation', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform smart cache invalidation', async () => {
      await expect(manager.smartInvalidate({
        type: 'novel_update',
        entityId: 123,
        patterns: ['novel_details_123'],
        dataTypes: ['novel']
      })).resolves.not.toThrow();
    });

    it('should handle different invalidation types', async () => {
      const contexts = [
        { type: 'user_update' as const, entityId: 'user123' },
        { type: 'discovery_refresh' as const },
        { type: 'search_clear' as const }
      ];

      for (const context of contexts) {
        await expect(manager.smartInvalidate(context)).resolves.not.toThrow();
      }
    });
  });

  describe('Metrics and Monitoring', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should provide comprehensive integration metrics', async () => {
      const metrics = await manager.getIntegrationMetrics();

      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('queryOptimizer');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('targets');

      expect(metrics.cache).toHaveProperty('hitRate');
      expect(metrics.cache).toHaveProperty('responseTime');
      expect(metrics.cache).toHaveProperty('errorRate');

      expect(metrics.targets).toHaveProperty('readOperationsAchieved');
      expect(metrics.targets).toHaveProperty('ruleEvaluationsAchieved');
      expect(metrics.targets).toHaveProperty('cacheHitRateAchieved');
      expect(metrics.targets).toHaveProperty('responseTimeAchieved');
    });

    it('should provide optimization recommendations', async () => {
      const recommendations = await manager.getOptimizationRecommendations();

      expect(recommendations).toHaveProperty('priority');
      expect(recommendations).toHaveProperty('recommendations');
      expect(recommendations).toHaveProperty('estimatedImpact');

      expect(['high', 'medium', 'low']).toContain(recommendations.priority);
      expect(Array.isArray(recommendations.recommendations)).toBe(true);
      expect(recommendations.estimatedImpact).toHaveProperty('readReduction');
      expect(recommendations.estimatedImpact).toHaveProperty('ruleReduction');
      expect(recommendations.estimatedImpact).toHaveProperty('performanceGain');
    });

    it('should perform health checks', async () => {
      const healthCheck = await manager.healthCheck();

      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('systems');
      expect(healthCheck).toHaveProperty('issues');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthCheck.status);
      expect(healthCheck.systems).toHaveProperty('cache');
      expect(healthCheck.systems).toHaveProperty('queryOptimizer');
      expect(healthCheck.systems).toHaveProperty('performanceMonitoring');
      expect(healthCheck.systems).toHaveProperty('errorRecovery');
      expect(Array.isArray(healthCheck.issues)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      const manager = new OptimizationIntegrationManager();
      expect(manager).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        ...DEFAULT_INTEGRATION_CONFIG,
        readOperationsTarget: 30,
        cacheHitRateTarget: 90
      };

      const manager = new OptimizationIntegrationManager(customConfig);
      expect(manager).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const manager1 = getOptimizationIntegrationManager();
      const manager2 = getOptimizationIntegrationManager();
      
      expect(manager1).toBe(manager2);
    });

    it('should initialize systems once', async () => {
      const manager = await initializeOptimizationSystems();
      expect(manager).toBeDefined();
      
      const sameManager = getOptimizationIntegrationManager();
      expect(manager).toBe(sameManager);
    });

    it('should reset instance correctly', () => {
      const manager1 = getOptimizationIntegrationManager();
      resetOptimizationIntegrationManager();
      const manager2 = getOptimizationIntegrationManager();
      
      expect(manager1).not.toBe(manager2);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should handle cache errors gracefully', async () => {
      // Mock cache error by replacing the cache manager's get method
      const mockCacheManager = (manager as any).cacheManager;
      const mockError = new Error('Cache error');
      mockCacheManager.get.mockRejectedValue(mockError);
      mockCacheManager.set.mockRejectedValue(mockError);

      const fetcher = jest.fn().mockResolvedValue({ data: 'test' });

      // Should still work even with cache errors - the fetcher should be called
      const result = await manager.fetchOptimized(
        'test_operation',
        fetcher,
        { cacheKey: 'test_key' }
      );

      expect(result).toEqual({ data: 'test' });
      expect(fetcher).toHaveBeenCalled();
    });

    it('should handle query optimizer errors gracefully', async () => {
      // Mock query optimizer error by replacing the method
      const mockQueryOptimizer = (manager as any).queryOptimizer;
      const mockError = new Error('Query optimizer error');
      mockQueryOptimizer.getMetrics.mockImplementation(() => {
        throw mockError;
      });

      // Should handle error in health check
      const healthCheck = await manager.healthCheck();
      expect(healthCheck.status).toBe('unhealthy');
      expect(healthCheck.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Targets', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should track performance against targets', async () => {
      const metrics = await manager.getIntegrationMetrics();

      // Check that all target fields are present
      expect(metrics.targets.readOperationsAchieved).toBeDefined();
      expect(metrics.targets.ruleEvaluationsAchieved).toBeDefined();
      expect(metrics.targets.cacheHitRateAchieved).toBeDefined();
      expect(metrics.targets.responseTimeAchieved).toBeDefined();

      // Check that performance metrics are calculated
      expect(typeof metrics.performance.readOperationsReduction).toBe('number');
      expect(typeof metrics.performance.ruleEvaluationsReduction).toBe('number');
      expect(typeof metrics.performance.overallPerformanceGain).toBe('number');
    });

    it('should provide recommendations based on target achievement', async () => {
      const recommendations = await manager.getOptimizationRecommendations();

      // Should provide actionable recommendations
      expect(recommendations.recommendations.length).toBeGreaterThanOrEqual(0);
      
      if (recommendations.recommendations.length > 0) {
        expect(recommendations.priority).toBeDefined();
        expect(recommendations.estimatedImpact.readReduction).toBeGreaterThanOrEqual(0);
        expect(recommendations.estimatedImpact.ruleReduction).toBeGreaterThanOrEqual(0);
        expect(recommendations.estimatedImpact.performanceGain).toBeGreaterThanOrEqual(0);
      }
    });
  });
});