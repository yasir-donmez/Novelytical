/**
 * Performance Validation Tests
 * 
 * Bu testler performans hedeflerinin doğru şekilde doğrulandığını
 * ve validation sisteminin çalıştığını test eder.
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
  validatePerformanceTargets,
  runPerformanceValidation,
  PERFORMANCE_TARGETS,
  calculateReadOperationsScore,
  calculateRuleEvaluationsScore,
  calculateCacheHitRateScore,
  calculateResponseTimeScore,
  getPerformanceGrade,
  generateRecommendations,
  printPerformanceReport
} from '../performance-validation';

// Mock dependencies
jest.mock('../optimization-integration', () => ({
  getOptimizationIntegrationManager: jest.fn(() => ({
    getIntegrationMetrics: jest.fn().mockResolvedValue({
      cache: {
        hitRate: 85,
        responseTime: 150,
        errorRate: 2
      },
      queryOptimizer: {
        readOperations: 40,
        optimizationRatio: 75,
        averageResponseTime: 180
      },
      performance: {
        readOperationsReduction: 73.5,
        ruleEvaluationsReduction: 70.0,
        overallPerformanceGain: 71.75
      },
      targets: {
        readOperationsAchieved: true,
        ruleEvaluationsAchieved: true,
        cacheHitRateAchieved: true,
        responseTimeAchieved: true
      }
    })
  }))
}));

jest.mock('../performance-monitor', () => ({
  performanceMonitor: {
    getOptimizationReport: jest.fn().mockReturnValue({
      readOperations: { current: 40, target: 45, reduction: 73.5 },
      ruleEvaluations: { current: 4500, target: 4500, reduction: 70.0 },
      cacheEfficiency: { hitRate: 85, missRate: 15, avgResponseTime: 150 },
      timestamp: new Date()
    })
  }
}));

describe('Performance Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePerformanceTargets', () => {
    it('should validate all performance targets successfully', async () => {
      const result = await validatePerformanceTargets();

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('targets');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('timestamp');

      // Check overall results
      expect(result.overall.passed).toBe(true);
      expect(result.overall.score).toBeGreaterThanOrEqual(80);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.overall.grade);

      // Check individual targets
      expect(result.targets.readOperations.achieved).toBe(true);
      expect(result.targets.ruleEvaluations.achieved).toBe(true);
      expect(result.targets.cacheHitRate.achieved).toBe(true);
      expect(result.targets.responseTime.achieved).toBe(true);
    });

    it('should handle performance targets not being met', async () => {
      // Mock poor performance
      const mockIntegrationModule = require('../optimization-integration');
      const mockManager = {
        getIntegrationMetrics: jest.fn().mockResolvedValue({
          cache: {
            hitRate: 50, // Below target
            responseTime: 300, // Above target
            errorRate: 10
          },
          queryOptimizer: {
            readOperations: 80, // Above target
            optimizationRatio: 40,
            averageResponseTime: 350
          },
          performance: {
            readOperationsReduction: 47,
            ruleEvaluationsReduction: 40,
            overallPerformanceGain: 43.5
          },
          targets: {
            readOperationsAchieved: false,
            ruleEvaluationsAchieved: false,
            cacheHitRateAchieved: false,
            responseTimeAchieved: false
          }
        })
      };
      
      mockIntegrationModule.getOptimizationIntegrationManager.mockReturnValue(mockManager);

      const mockPerformanceMonitor = require('../performance-monitor').performanceMonitor;
      mockPerformanceMonitor.getOptimizationReport.mockReturnValue({
        readOperations: { current: 80, target: 45, reduction: 47 },
        ruleEvaluations: { current: 9000, target: 4500, reduction: 40 },
        cacheEfficiency: { hitRate: 50, missRate: 50, avgResponseTime: 300 },
        timestamp: new Date()
      });

      const result = await validatePerformanceTargets();

      expect(result.overall.passed).toBe(false);
      expect(result.overall.score).toBeLessThan(80);
      expect(result.targets.readOperations.achieved).toBe(false);
      expect(result.targets.ruleEvaluations.achieved).toBe(false);
      expect(result.targets.cacheHitRate.achieved).toBe(false);
      expect(result.targets.responseTime.achieved).toBe(false);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Score Calculation Functions', () => {
    describe('calculateReadOperationsScore', () => {
      it('should return 100 for perfect performance', () => {
        const score = calculateReadOperationsScore(40, PERFORMANCE_TARGETS.readOperations);
        expect(score).toBe(100);
      });

      it('should return proportional score for partial achievement', () => {
        const score = calculateReadOperationsScore(75, PERFORMANCE_TARGETS.readOperations);
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(100);
      });

      it('should return 0 for no improvement', () => {
        const score = calculateReadOperationsScore(151, PERFORMANCE_TARGETS.readOperations);
        expect(score).toBe(0);
      });
    });

    describe('calculateRuleEvaluationsScore', () => {
      it('should return 100 for perfect performance', () => {
        const score = calculateRuleEvaluationsScore(4000, PERFORMANCE_TARGETS.ruleEvaluations);
        expect(score).toBe(100);
      });

      it('should return proportional score for partial achievement', () => {
        const score = calculateRuleEvaluationsScore(7500, PERFORMANCE_TARGETS.ruleEvaluations);
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(100);
      });

      it('should return 0 for no improvement', () => {
        const score = calculateRuleEvaluationsScore(15000, PERFORMANCE_TARGETS.ruleEvaluations);
        expect(score).toBe(0);
      });
    });

    describe('calculateCacheHitRateScore', () => {
      it('should return 100 for meeting target', () => {
        const score = calculateCacheHitRateScore(90, PERFORMANCE_TARGETS.cacheHitRate.target);
        expect(score).toBe(100);
      });

      it('should return proportional score', () => {
        const score = calculateCacheHitRateScore(70, PERFORMANCE_TARGETS.cacheHitRate.target);
        expect(score).toBeCloseTo(82.35, 0);
      });

      it('should return 0 for zero hit rate', () => {
        const score = calculateCacheHitRateScore(0, PERFORMANCE_TARGETS.cacheHitRate.target);
        expect(score).toBe(0);
      });
    });

    describe('calculateResponseTimeScore', () => {
      it('should return 100 for meeting target', () => {
        const score = calculateResponseTimeScore(150, PERFORMANCE_TARGETS.responseTime.target);
        expect(score).toBe(100);
      });

      it('should return lower score for higher response time', () => {
        const score = calculateResponseTimeScore(300, PERFORMANCE_TARGETS.responseTime.target);
        expect(score).toBeLessThan(100);
        expect(score).toBeGreaterThan(0);
      });

      it('should handle very high response times', () => {
        const score = calculateResponseTimeScore(1000, PERFORMANCE_TARGETS.responseTime.target);
        expect(score).toBe(0);
      });
    });
  });

  describe('getPerformanceGrade', () => {
    it('should return correct grades for different scores', () => {
      expect(getPerformanceGrade(95)).toBe('A');
      expect(getPerformanceGrade(85)).toBe('B');
      expect(getPerformanceGrade(75)).toBe('C');
      expect(getPerformanceGrade(65)).toBe('D');
      expect(getPerformanceGrade(45)).toBe('F');
    });

    it('should handle edge cases', () => {
      expect(getPerformanceGrade(90)).toBe('A');
      expect(getPerformanceGrade(80)).toBe('B');
      expect(getPerformanceGrade(70)).toBe('C');
      expect(getPerformanceGrade(60)).toBe('D');
      expect(getPerformanceGrade(0)).toBe('F');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for poor performance', () => {
      const recommendations = generateRecommendations({
        readOperations: { current: 100, target: 45, score: 50 },
        ruleEvaluations: { current: 8000, target: 4500, score: 60 },
        cacheHitRate: { current: 40, target: 85, score: 47 },
        responseTime: { current: 400, target: 200, score: 0 }
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.includes('CRITICAL'))).toBe(true);
    });

    it('should generate positive feedback for good performance', () => {
      const recommendations = generateRecommendations({
        readOperations: { current: 40, target: 45, score: 100 },
        ruleEvaluations: { current: 4000, target: 4500, score: 100 },
        cacheHitRate: { current: 90, target: 85, score: 100 },
        responseTime: { current: 150, target: 200, score: 100 }
      });

      expect(recommendations.length).toBe(1);
      expect(recommendations[0]).toContain('Performance targets are being met');
    });
  });

  describe('runPerformanceValidation', () => {
    it('should run validation and return results', async () => {
      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await runPerformanceValidation();

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('targets');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('timestamp');

      // Should have printed report
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle validation errors', async () => {
      // Mock error in validation
      const mockIntegrationModule = require('../optimization-integration');
      const mockManager = {
        getIntegrationMetrics: jest.fn().mockRejectedValue(new Error('Validation failed'))
      };
      
      mockIntegrationModule.getOptimizationIntegrationManager.mockReturnValue(mockManager);

      await expect(runPerformanceValidation()).rejects.toThrow('Validation failed');
    });
  });

  describe('printPerformanceReport', () => {
    it('should print detailed performance report', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockResult = {
        overall: {
          passed: true,
          score: 95,
          grade: 'A' as const
        },
        targets: {
          readOperations: {
            current: 40,
            target: 45,
            achieved: true,
            reductionPercentage: 73.5,
            score: 100
          },
          ruleEvaluations: {
            current: 4000,
            target: 4500,
            achieved: true,
            reductionPercentage: 73.3,
            score: 100
          },
          cacheHitRate: {
            current: 90,
            target: 85,
            achieved: true,
            score: 100
          },
          responseTime: {
            current: 150,
            target: 200,
            achieved: true,
            score: 100
          }
        },
        recommendations: ['Performance targets are being met. Continue monitoring.'],
        timestamp: new Date()
      };

      printPerformanceReport(mockResult);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Firebase Optimization Performance Report'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Overall Score: 95/100'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ PASSED'));

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Targets Constants', () => {
    it('should have correct performance targets defined', () => {
      expect(PERFORMANCE_TARGETS.readOperations.baseline).toBe(151);
      expect(PERFORMANCE_TARGETS.readOperations.target).toBe(45);
      expect(PERFORMANCE_TARGETS.readOperations.reductionTarget).toBe(70);

      expect(PERFORMANCE_TARGETS.ruleEvaluations.baseline).toBe(15000);
      expect(PERFORMANCE_TARGETS.ruleEvaluations.target).toBe(4500);
      expect(PERFORMANCE_TARGETS.ruleEvaluations.reductionTarget).toBe(70);

      expect(PERFORMANCE_TARGETS.cacheHitRate.target).toBe(85);
      expect(PERFORMANCE_TARGETS.responseTime.target).toBe(200);
    });
  });
});