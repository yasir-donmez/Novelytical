/**
 * Performance Targets Validation
 * 
 * Bu dosya Firebase optimizasyon hedeflerinin karşılanıp karşılanmadığını
 * doğrular ve detaylı performans raporu sağlar.
 * 
 * Hedefler:
 * - Firebase okuma işlemleri: 151 → 45 (%70 azalma)
 * - Kural değerlendirmeleri: 15,000 → 4,500 (%70 azalma)
 * - Cache hit rate: %85+
 * - Response time: 200ms altında
 */

import { getOptimizationIntegrationManager } from './optimization-integration';
import { performanceMonitor } from './performance-monitor';

// Performance targets
export const PERFORMANCE_TARGETS = {
  readOperations: {
    baseline: 151,
    target: 45,
    reductionTarget: 70 // %70 reduction
  },
  ruleEvaluations: {
    baseline: 15000,
    target: 4500,
    reductionTarget: 70 // %70 reduction
  },
  cacheHitRate: {
    target: 85 // %85 hit rate
  },
  responseTime: {
    target: 200 // 200ms
  }
};

export interface PerformanceValidationResult {
  overall: {
    passed: boolean;
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  targets: {
    readOperations: {
      current: number;
      target: number;
      achieved: boolean;
      reductionPercentage: number;
      score: number;
    };
    ruleEvaluations: {
      current: number;
      target: number;
      achieved: boolean;
      reductionPercentage: number;
      score: number;
    };
    cacheHitRate: {
      current: number;
      target: number;
      achieved: boolean;
      score: number;
    };
    responseTime: {
      current: number;
      target: number;
      achieved: boolean;
      score: number;
    };
  };
  recommendations: string[];
  timestamp: Date;
}

/**
 * Validate all performance targets
 */
export async function validatePerformanceTargets(): Promise<PerformanceValidationResult> {
  try {
    const manager = getOptimizationIntegrationManager();
    const metrics = await manager.getIntegrationMetrics();
    const optimizationReport = performanceMonitor.getOptimizationReport();

    // Calculate individual target scores
    const readOperationsScore = calculateReadOperationsScore(
      optimizationReport.readOperations.current,
      PERFORMANCE_TARGETS.readOperations
    );

    const ruleEvaluationsScore = calculateRuleEvaluationsScore(
      optimizationReport.ruleEvaluations.current,
      PERFORMANCE_TARGETS.ruleEvaluations
    );

    const cacheHitRateScore = calculateCacheHitRateScore(
      metrics.cache.hitRate,
      PERFORMANCE_TARGETS.cacheHitRate.target
    );

    const responseTimeScore = calculateResponseTimeScore(
      metrics.cache.responseTime,
      PERFORMANCE_TARGETS.responseTime.target
    );

    // Calculate overall score
    const overallScore = Math.round(
      (readOperationsScore + ruleEvaluationsScore + cacheHitRateScore + responseTimeScore) / 4
    );

    // Determine grade
    const grade = getPerformanceGrade(overallScore);

    // Generate recommendations
    const recommendations = generateRecommendations({
      readOperations: {
        current: optimizationReport.readOperations.current,
        target: PERFORMANCE_TARGETS.readOperations.target,
        score: readOperationsScore
      },
      ruleEvaluations: {
        current: optimizationReport.ruleEvaluations.current,
        target: PERFORMANCE_TARGETS.ruleEvaluations.target,
        score: ruleEvaluationsScore
      },
      cacheHitRate: {
        current: metrics.cache.hitRate,
        target: PERFORMANCE_TARGETS.cacheHitRate.target,
        score: cacheHitRateScore
      },
      responseTime: {
        current: metrics.cache.responseTime,
        target: PERFORMANCE_TARGETS.responseTime.target,
        score: responseTimeScore
      }
    });

    return {
      overall: {
        passed: overallScore >= 80, // 80% threshold for passing
        score: overallScore,
        grade
      },
      targets: {
        readOperations: {
          current: optimizationReport.readOperations.current,
          target: PERFORMANCE_TARGETS.readOperations.target,
          achieved: optimizationReport.readOperations.current <= PERFORMANCE_TARGETS.readOperations.target,
          reductionPercentage: optimizationReport.readOperations.reduction,
          score: readOperationsScore
        },
        ruleEvaluations: {
          current: optimizationReport.ruleEvaluations.current,
          target: PERFORMANCE_TARGETS.ruleEvaluations.target,
          achieved: optimizationReport.ruleEvaluations.current <= PERFORMANCE_TARGETS.ruleEvaluations.target,
          reductionPercentage: optimizationReport.ruleEvaluations.reduction,
          score: ruleEvaluationsScore
        },
        cacheHitRate: {
          current: metrics.cache.hitRate,
          target: PERFORMANCE_TARGETS.cacheHitRate.target,
          achieved: metrics.cache.hitRate >= PERFORMANCE_TARGETS.cacheHitRate.target,
          score: cacheHitRateScore
        },
        responseTime: {
          current: metrics.cache.responseTime,
          target: PERFORMANCE_TARGETS.responseTime.target,
          achieved: metrics.cache.responseTime <= PERFORMANCE_TARGETS.responseTime.target,
          score: responseTimeScore
        }
      },
      recommendations,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Performance validation failed:', error);
    throw error;
  }
}

/**
 * Calculate score for read operations (0-100)
 */
function calculateReadOperationsScore(
  current: number,
  target: { baseline: number; target: number; reductionTarget: number }
): number {
  if (current <= target.target) {
    return 100; // Perfect score if target is met
  }

  // Calculate reduction percentage
  const actualReduction = ((target.baseline - current) / target.baseline) * 100;
  
  // Score based on how close we are to the target reduction
  const score = Math.max(0, (actualReduction / target.reductionTarget) * 100);
  
  return Math.min(100, Math.round(score));
}

/**
 * Calculate score for rule evaluations (0-100)
 */
function calculateRuleEvaluationsScore(
  current: number,
  target: { baseline: number; target: number; reductionTarget: number }
): number {
  if (current <= target.target) {
    return 100; // Perfect score if target is met
  }

  // Calculate reduction percentage
  const actualReduction = ((target.baseline - current) / target.baseline) * 100;
  
  // Score based on how close we are to the target reduction
  const score = Math.max(0, (actualReduction / target.reductionTarget) * 100);
  
  return Math.min(100, Math.round(score));
}

/**
 * Calculate score for cache hit rate (0-100)
 */
function calculateCacheHitRateScore(current: number, target: number): number {
  if (current >= target) {
    return 100; // Perfect score if target is met
  }

  // Linear scoring based on how close we are to target
  const score = (current / target) * 100;
  
  return Math.max(0, Math.round(score));
}

/**
 * Calculate score for response time (0-100)
 */
function calculateResponseTimeScore(current: number, target: number): number {
  if (current <= target) {
    return 100; // Perfect score if target is met
  }

  // Inverse scoring - higher response time = lower score
  const score = Math.max(0, 100 - ((current - target) / target) * 100);
  
  return Math.round(score);
}

/**
 * Get performance grade based on overall score
 */
function getPerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(metrics: {
  readOperations: { current: number; target: number; score: number };
  ruleEvaluations: { current: number; target: number; score: number };
  cacheHitRate: { current: number; target: number; score: number };
  responseTime: { current: number; target: number; score: number };
}): string[] {
  const recommendations: string[] = [];

  // Read operations recommendations
  if (metrics.readOperations.score < 80) {
    if (metrics.readOperations.current > metrics.readOperations.target * 1.5) {
      recommendations.push('CRITICAL: Firebase read operations are significantly above target. Implement aggressive caching and query batching.');
    } else {
      recommendations.push('Optimize Firebase read operations by improving cache hit rates and implementing query consolidation.');
    }
  }

  // Rule evaluations recommendations
  if (metrics.ruleEvaluations.score < 80) {
    if (metrics.ruleEvaluations.current > metrics.ruleEvaluations.target * 1.5) {
      recommendations.push('CRITICAL: Security rule evaluations are too high. Simplify rules and implement pre-computed authorization.');
    } else {
      recommendations.push('Reduce rule evaluations by optimizing security rule logic and caching authorization results.');
    }
  }

  // Cache hit rate recommendations
  if (metrics.cacheHitRate.score < 80) {
    if (metrics.cacheHitRate.current < 50) {
      recommendations.push('CRITICAL: Cache hit rate is very low. Review cache configuration and TTL settings.');
    } else {
      recommendations.push('Improve cache hit rate by implementing background refresh and optimizing cache keys.');
    }
  }

  // Response time recommendations
  if (metrics.responseTime.score < 80) {
    if (metrics.responseTime.current > metrics.responseTime.target * 2) {
      recommendations.push('CRITICAL: Response times are too high. Investigate performance bottlenecks and optimize critical paths.');
    } else {
      recommendations.push('Optimize response times by improving cache efficiency and reducing network latency.');
    }
  }

  // General recommendations if all metrics are good
  if (recommendations.length === 0) {
    recommendations.push('Performance targets are being met. Continue monitoring and maintain current optimization strategies.');
  }

  return recommendations;
}

/**
 * Print detailed performance report
 */
export function printPerformanceReport(result: PerformanceValidationResult): void {
  console.log('\n🎯 Firebase Optimization Performance Report');
  console.log('=' .repeat(50));
  
  // Overall score
  const gradeEmoji = {
    'A': '🏆',
    'B': '✅',
    'C': '⚠️',
    'D': '❌',
    'F': '💥'
  };
  
  console.log(`\n📊 Overall Score: ${result.overall.score}/100 ${gradeEmoji[result.overall.grade]} Grade ${result.overall.grade}`);
  console.log(`Status: ${result.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Individual targets
  console.log('\n📈 Target Performance:');
  
  console.log(`\n🔥 Firebase Read Operations:`);
  console.log(`   Current: ${result.targets.readOperations.current}`);
  console.log(`   Target: ${result.targets.readOperations.target}`);
  console.log(`   Reduction: ${result.targets.readOperations.reductionPercentage.toFixed(1)}%`);
  console.log(`   Status: ${result.targets.readOperations.achieved ? '✅' : '❌'} (Score: ${result.targets.readOperations.score}/100)`);
  
  console.log(`\n🛡️ Rule Evaluations:`);
  console.log(`   Current: ${result.targets.ruleEvaluations.current}`);
  console.log(`   Target: ${result.targets.ruleEvaluations.target}`);
  console.log(`   Reduction: ${result.targets.ruleEvaluations.reductionPercentage.toFixed(1)}%`);
  console.log(`   Status: ${result.targets.ruleEvaluations.achieved ? '✅' : '❌'} (Score: ${result.targets.ruleEvaluations.score}/100)`);
  
  console.log(`\n💾 Cache Hit Rate:`);
  console.log(`   Current: ${result.targets.cacheHitRate.current.toFixed(1)}%`);
  console.log(`   Target: ${result.targets.cacheHitRate.target}%`);
  console.log(`   Status: ${result.targets.cacheHitRate.achieved ? '✅' : '❌'} (Score: ${result.targets.cacheHitRate.score}/100)`);
  
  console.log(`\n⚡ Response Time:`);
  console.log(`   Current: ${result.targets.responseTime.current.toFixed(0)}ms`);
  console.log(`   Target: ${result.targets.responseTime.target}ms`);
  console.log(`   Status: ${result.targets.responseTime.achieved ? '✅' : '❌'} (Score: ${result.targets.responseTime.score}/100)`);
  
  // Recommendations
  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  console.log(`\n📅 Report generated: ${result.timestamp.toISOString()}`);
  console.log('=' .repeat(50));
}

/**
 * Run performance validation and print report
 */
export async function runPerformanceValidation(): Promise<PerformanceValidationResult> {
  console.log('🚀 Starting performance validation...');
  
  try {
    const result = await validatePerformanceTargets();
    printPerformanceReport(result);
    return result;
  } catch (error) {
    console.error('❌ Performance validation failed:', error);
    throw error;
  }
}

/**
 * Continuous performance monitoring
 */
export function startPerformanceMonitoring(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  console.log(`📊 Starting continuous performance monitoring (interval: ${intervalMs / 1000}s)`);
  
  return setInterval(async () => {
    try {
      const result = await validatePerformanceTargets();
      
      if (!result.overall.passed) {
        console.warn('⚠️ Performance targets not met:', {
          score: result.overall.score,
          grade: result.overall.grade,
          failedTargets: Object.entries(result.targets)
            .filter(([_, target]) => !target.achieved)
            .map(([name, _]) => name)
        });
      }
    } catch (error) {
      console.error('Performance monitoring error:', error);
    }
  }, intervalMs);
}

// Export for testing
export {
  calculateReadOperationsScore,
  calculateRuleEvaluationsScore,
  calculateCacheHitRateScore,
  calculateResponseTimeScore,
  getPerformanceGrade,
  generateRecommendations
};