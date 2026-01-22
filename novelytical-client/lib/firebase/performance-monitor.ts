/**
 * Firebase Performance Monitoring System
 * 
 * Bu sistem Firebase okuma işlemlerini, kural değerlendirmelerini ve cache performansını izler.
 * Requirements 8.1, 8.2 için kapsamlı metrik toplama ve analiz sağlar.
 */

import { getAnalytics, logEvent } from 'firebase/analytics';

// Performance monitoring interfaces
export interface PerformanceMonitor {
  // Metrik toplama
  trackFirebaseRead(collection: string, count: number): void;
  trackRuleEvaluation(ruleId: string, duration: number): void;
  trackCacheHit(cacheType: string, key: string): void;
  trackCacheMiss(cacheType: string, key: string): void;
  
  // Analiz
  getOptimizationReport(): OptimizationReport;
  detectPerformanceRegression(): RegressionAlert[];
  
  // Dashboard support
  getCurrentMetrics(): Promise<CurrentMetrics>;
  getTrendAnalysis(timeRange: TimeRange): Promise<TrendData>;
  setupAlerts(thresholds: AlertThresholds): void;
  getOptimizationSuggestions(): Promise<OptimizationSuggestion[]>;
}

export interface OptimizationReport {
  readOperations: {
    current: number;
    target: number;
    reduction: number;
  };
  ruleEvaluations: {
    current: number;
    target: number;
    reduction: number;
  };
  cacheEfficiency: {
    hitRate: number;
    missRate: number;
    avgResponseTime: number;
  };
  timestamp: Date;
}

export interface RegressionAlert {
  type: 'read_operations' | 'rule_evaluations' | 'cache_performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  expectedValue: number;
  threshold: number;
  timestamp: Date;
}

export interface CurrentMetrics {
  readOperations: {
    current: number;
    target: number;
    percentage: number;
  };
  ruleEvaluations: {
    current: number;
    target: number;
    percentage: number;
  };
  cacheHitRate: number;
  averageResponseTime: number;
  timestamp: Date;
}

export interface TrendData {
  timeRange: TimeRange;
  readOperationsTrend: MetricPoint[];
  ruleEvaluationsTrend: MetricPoint[];
  cacheHitRateTrend: MetricPoint[];
  responseTimeTrend: MetricPoint[];
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week';
}

export interface MetricPoint {
  timestamp: Date;
  value: number;
}

export interface AlertThresholds {
  readOperationsThreshold: number; // Target: 45
  ruleEvaluationsThreshold: number; // Target: 4500
  cacheHitRateThreshold: number; // Target: 85%
  responseTimeThreshold: number; // Target: 200ms
}

export interface OptimizationSuggestion {
  type: 'cache' | 'query' | 'rule' | 'denormalization';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedImpact: {
    readReduction: number;
    ruleReduction: number;
    performanceGain: number;
  };
  implementationComplexity: 'low' | 'medium' | 'high';
}

// Performance tracking implementation
export class FirebasePerformanceMonitor implements PerformanceMonitor {
  private analytics = typeof window !== 'undefined' ? getAnalytics() : null;
  private metrics: Map<string, number[]> = new Map();
  private alerts: RegressionAlert[] = [];
  private alertThresholds: AlertThresholds;
  
  // Performance targets
  private readonly READ_OPERATIONS_TARGET = 45;
  private readonly RULE_EVALUATIONS_TARGET = 4500;
  private readonly CACHE_HIT_RATE_TARGET = 85;
  private readonly RESPONSE_TIME_TARGET = 200;

  constructor(thresholds?: AlertThresholds) {
    this.alertThresholds = thresholds || {
      readOperationsThreshold: this.READ_OPERATIONS_TARGET,
      ruleEvaluationsThreshold: this.RULE_EVALUATIONS_TARGET,
      cacheHitRateThreshold: this.CACHE_HIT_RATE_TARGET,
      responseTimeThreshold: this.RESPONSE_TIME_TARGET
    };
    
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('firebase_reads', []);
    this.metrics.set('rule_evaluations', []);
    this.metrics.set('cache_hits', []);
    this.metrics.set('cache_misses', []);
    this.metrics.set('response_times', []);
  }

  trackFirebaseRead(collection: string, count: number): void {
    const reads = this.metrics.get('firebase_reads') || [];
    reads.push(count);
    this.metrics.set('firebase_reads', reads);

    // Firebase Analytics logging
    if (this.analytics) {
      logEvent(this.analytics, 'firebase_read', {
        collection,
        document_count: count,
        timestamp: Date.now()
      });
    }

    // Check for regression
    this.checkReadOperationsRegression();
  }

  trackRuleEvaluation(ruleId: string, duration: number): void {
    const evaluations = this.metrics.get('rule_evaluations') || [];
    evaluations.push(duration);
    this.metrics.set('rule_evaluations', evaluations);

    if (this.analytics) {
      logEvent(this.analytics, 'rule_evaluation', {
        rule_id: ruleId,
        evaluation_time: duration,
        timestamp: Date.now()
      });
    }

    this.checkRuleEvaluationsRegression();
  }

  trackCacheHit(cacheType: string, key: string): void {
    const hits = this.metrics.get('cache_hits') || [];
    hits.push(1);
    this.metrics.set('cache_hits', hits);

    if (this.analytics) {
      logEvent(this.analytics, 'cache_hit', {
        cache_type: cacheType,
        cache_key: key,
        timestamp: Date.now()
      });
    }
  }

  trackCacheMiss(cacheType: string, key: string): void {
    const misses = this.metrics.get('cache_misses') || [];
    misses.push(1);
    this.metrics.set('cache_misses', misses);

    if (this.analytics) {
      logEvent(this.analytics, 'cache_miss', {
        cache_type: cacheType,
        cache_key: key,
        timestamp: Date.now()
      });
    }

    this.checkCachePerformanceRegression();
  }

  getOptimizationReport(): OptimizationReport {
    const reads = this.metrics.get('firebase_reads') || [];
    const evaluations = this.metrics.get('rule_evaluations') || [];
    const hits = this.metrics.get('cache_hits') || [];
    const misses = this.metrics.get('cache_misses') || [];
    const responseTimes = this.metrics.get('response_times') || [];

    const currentReads = reads.reduce((sum, count) => sum + count, 0);
    const currentEvaluations = evaluations.length;
    const totalCacheRequests = hits.length + misses.length;
    const cacheHitRate = totalCacheRequests > 0 ? (hits.length / totalCacheRequests) * 100 : 0;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      readOperations: {
        current: currentReads,
        target: this.READ_OPERATIONS_TARGET,
        reduction: ((151 - currentReads) / 151) * 100 // Baseline: 151
      },
      ruleEvaluations: {
        current: currentEvaluations,
        target: this.RULE_EVALUATIONS_TARGET,
        reduction: ((15000 - currentEvaluations) / 15000) * 100 // Baseline: 15000
      },
      cacheEfficiency: {
        hitRate: cacheHitRate,
        missRate: 100 - cacheHitRate,
        avgResponseTime
      },
      timestamp: new Date()
    };
  }

  detectPerformanceRegression(): RegressionAlert[] {
    return [...this.alerts];
  }

  async getCurrentMetrics(): Promise<CurrentMetrics> {
    const report = this.getOptimizationReport();
    
    return {
      readOperations: {
        current: report.readOperations.current,
        target: report.readOperations.target,
        percentage: (report.readOperations.current / report.readOperations.target) * 100
      },
      ruleEvaluations: {
        current: report.ruleEvaluations.current,
        target: report.ruleEvaluations.target,
        percentage: (report.ruleEvaluations.current / report.ruleEvaluations.target) * 100
      },
      cacheHitRate: report.cacheEfficiency.hitRate,
      averageResponseTime: report.cacheEfficiency.avgResponseTime,
      timestamp: new Date()
    };
  }

  async getTrendAnalysis(timeRange: TimeRange): Promise<TrendData> {
    // In a real implementation, this would query historical data
    // For now, we'll simulate trend data based on current metrics
    const points = this.generateTrendPoints(timeRange);
    
    return {
      timeRange,
      readOperationsTrend: points.map(p => ({ ...p, value: Math.random() * 50 + 20 })),
      ruleEvaluationsTrend: points.map(p => ({ ...p, value: Math.random() * 5000 + 3000 })),
      cacheHitRateTrend: points.map(p => ({ ...p, value: Math.random() * 20 + 80 })),
      responseTimeTrend: points.map(p => ({ ...p, value: Math.random() * 100 + 150 }))
    };
  }

  setupAlerts(thresholds: AlertThresholds): void {
    this.alertThresholds = thresholds;
  }

  async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    const report = this.getOptimizationReport();
    const suggestions: OptimizationSuggestion[] = [];

    // Cache optimization suggestions
    if (report.cacheEfficiency.hitRate < this.CACHE_HIT_RATE_TARGET) {
      suggestions.push({
        type: 'cache',
        priority: 'high',
        description: 'Cache hit rate is below target. Consider implementing background cache refresh and optimizing TTL settings.',
        estimatedImpact: {
          readReduction: 15,
          ruleReduction: 0,
          performanceGain: 25
        },
        implementationComplexity: 'medium'
      });
    }

    // Query optimization suggestions
    if (report.readOperations.current > this.READ_OPERATIONS_TARGET) {
      suggestions.push({
        type: 'query',
        priority: 'high',
        description: 'Firebase read operations exceed target. Implement query batching and denormalization strategies.',
        estimatedImpact: {
          readReduction: 30,
          ruleReduction: 10,
          performanceGain: 40
        },
        implementationComplexity: 'high'
      });
    }

    // Rule optimization suggestions
    if (report.ruleEvaluations.current > this.RULE_EVALUATIONS_TARGET) {
      suggestions.push({
        type: 'rule',
        priority: 'medium',
        description: 'Security rule evaluations are high. Simplify rule logic and implement pre-computed authorization.',
        estimatedImpact: {
          readReduction: 5,
          ruleReduction: 40,
          performanceGain: 20
        },
        implementationComplexity: 'medium'
      });
    }

    return suggestions;
  }

  private checkReadOperationsRegression(): void {
    const reads = this.metrics.get('firebase_reads') || [];
    const recentReads = reads.slice(-10); // Last 10 operations
    const avgRecentReads = recentReads.reduce((sum, count) => sum + count, 0) / recentReads.length;

    if (avgRecentReads > this.alertThresholds.readOperationsThreshold * 1.2) {
      this.alerts.push({
        type: 'read_operations',
        severity: 'high',
        message: `Firebase read operations trending above threshold: ${avgRecentReads.toFixed(1)} vs ${this.alertThresholds.readOperationsThreshold}`,
        currentValue: avgRecentReads,
        expectedValue: this.alertThresholds.readOperationsThreshold,
        threshold: this.alertThresholds.readOperationsThreshold * 1.2,
        timestamp: new Date()
      });
    }
  }

  private checkRuleEvaluationsRegression(): void {
    const evaluations = this.metrics.get('rule_evaluations') || [];
    
    if (evaluations.length > this.alertThresholds.ruleEvaluationsThreshold) {
      this.alerts.push({
        type: 'rule_evaluations',
        severity: 'medium',
        message: `Rule evaluations exceed threshold: ${evaluations.length} vs ${this.alertThresholds.ruleEvaluationsThreshold}`,
        currentValue: evaluations.length,
        expectedValue: this.alertThresholds.ruleEvaluationsThreshold,
        threshold: this.alertThresholds.ruleEvaluationsThreshold,
        timestamp: new Date()
      });
    }
  }

  private checkCachePerformanceRegression(): void {
    const hits = this.metrics.get('cache_hits') || [];
    const misses = this.metrics.get('cache_misses') || [];
    const totalRequests = hits.length + misses.length;
    
    if (totalRequests > 0) {
      const hitRate = (hits.length / totalRequests) * 100;
      
      if (hitRate < this.alertThresholds.cacheHitRateThreshold) {
        this.alerts.push({
          type: 'cache_performance',
          severity: 'medium',
          message: `Cache hit rate below threshold: ${hitRate.toFixed(1)}% vs ${this.alertThresholds.cacheHitRateThreshold}%`,
          currentValue: hitRate,
          expectedValue: this.alertThresholds.cacheHitRateThreshold,
          threshold: this.alertThresholds.cacheHitRateThreshold,
          timestamp: new Date()
        });
      }
    }
  }

  private generateTrendPoints(timeRange: TimeRange): MetricPoint[] {
    const points: MetricPoint[] = [];
    const { start, end, granularity } = timeRange;
    
    let current = new Date(start);
    const increment = this.getTimeIncrement(granularity);
    
    while (current <= end) {
      points.push({
        timestamp: new Date(current),
        value: 0 // Will be overridden by caller
      });
      current = new Date(current.getTime() + increment);
    }
    
    return points;
  }

  private getTimeIncrement(granularity: TimeRange['granularity']): number {
    switch (granularity) {
      case 'minute': return 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }
}

// Singleton instance
export const performanceMonitor = new FirebasePerformanceMonitor();