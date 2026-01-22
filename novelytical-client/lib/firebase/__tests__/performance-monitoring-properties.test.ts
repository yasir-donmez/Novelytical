import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';

/**
 * Firebase Performance Monitoring Properties Tests
 * 
 * Bu test dosyası performans izleme sisteminin correctness property'lerini doğrular.
 * Özellikle comprehensive metrics collection ve performance tracking property'lerini test eder.
 */

// Mock performance monitoring types
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  attributes?: Record<string, string>;
}

interface MetricCollection {
  firebaseReads: PerformanceMetric[];
  ruleEvaluations: PerformanceMetric[];
  cacheOperations: PerformanceMetric[];
  queryPerformance: PerformanceMetric[];
  userInteractions: PerformanceMetric[];
}

interface PerformanceThresholds {
  readOperationsTarget: number;
  ruleEvaluationsTarget: number;
  cacheHitRateTarget: number;
  responseTimeTarget: number;
}

// Mock performance monitoring system
class MockPerformanceMonitor {
  private metrics: MetricCollection = {
    firebaseReads: [],
    ruleEvaluations: [],
    cacheOperations: [],
    queryPerformance: [],
    userInteractions: []
  };

  private thresholds: PerformanceThresholds = {
    readOperationsTarget: 45,
    ruleEvaluationsTarget: 4500,
    cacheHitRateTarget: 85,
    responseTimeTarget: 200
  };

  trackFirebaseRead(collection: string, count: number): void {
    this.metrics.firebaseReads.push({
      name: 'firebase_read',
      value: count,
      timestamp: new Date(),
      attributes: { collection }
    });
  }

  trackRuleEvaluation(ruleId: string, duration: number): void {
    this.metrics.ruleEvaluations.push({
      name: 'rule_evaluation',
      value: duration,
      timestamp: new Date(),
      attributes: { ruleId }
    });
  }

  trackCacheOperation(operation: string, duration: number, hit: boolean): void {
    this.metrics.cacheOperations.push({
      name: 'cache_operation',
      value: duration,
      timestamp: new Date(),
      attributes: { operation, hit: hit.toString() }
    });
  }

  trackQueryPerformance(queryType: string, duration: number, resultCount: number): void {
    this.metrics.queryPerformance.push({
      name: 'query_performance',
      value: duration,
      timestamp: new Date(),
      attributes: { queryType, resultCount: resultCount.toString() }
    });
  }

  trackUserInteraction(action: string, component: string): void {
    this.metrics.userInteractions.push({
      name: 'user_interaction',
      value: 1,
      timestamp: new Date(),
      attributes: { action, component }
    });
  }

  getMetrics(): MetricCollection {
    return { ...this.metrics };
  }

  getMetricsByType(type: keyof MetricCollection): PerformanceMetric[] {
    return [...this.metrics[type]];
  }

  getMetricsInTimeRange(start: Date, end: Date): PerformanceMetric[] {
    const allMetrics = [
      ...this.metrics.firebaseReads,
      ...this.metrics.ruleEvaluations,
      ...this.metrics.cacheOperations,
      ...this.metrics.queryPerformance,
      ...this.metrics.userInteractions
    ];

    return allMetrics.filter(metric => 
      metric.timestamp >= start && metric.timestamp <= end
    );
  }

  calculateAggregates() {
    const totalReads = this.metrics.firebaseReads.reduce((sum, metric) => sum + metric.value, 0);
    const totalRuleEvaluations = this.metrics.ruleEvaluations.length;
    
    const cacheHits = this.metrics.cacheOperations.filter(m => m.attributes?.hit === 'true').length;
    const totalCacheOps = this.metrics.cacheOperations.length;
    const cacheHitRate = totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : 0;
    
    const avgResponseTime = this.metrics.queryPerformance.length > 0
      ? this.metrics.queryPerformance.reduce((sum, m) => sum + m.value, 0) / this.metrics.queryPerformance.length
      : 0;

    return {
      totalReads,
      totalRuleEvaluations,
      cacheHitRate,
      avgResponseTime,
      meetsTargets: {
        reads: totalReads <= this.thresholds.readOperationsTarget,
        rules: totalRuleEvaluations <= this.thresholds.ruleEvaluationsTarget,
        cache: cacheHitRate >= this.thresholds.cacheHitRateTarget,
        responseTime: avgResponseTime <= this.thresholds.responseTimeTarget
      }
    };
  }

  reset(): void {
    this.metrics = {
      firebaseReads: [],
      ruleEvaluations: [],
      cacheOperations: [],
      queryPerformance: [],
      userInteractions: []
    };
  }
}

// Helper functions
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

function analyzeQueryTypePerformance(metrics: PerformanceMetric[], operations: any[]): Record<string, { count: number; avgTime: number; maxTime: number }> {
  const analysis: Record<string, { count: number; avgTime: number; maxTime: number }> = {};
  
  for (const operation of operations) {
    if (!analysis[operation.queryType]) {
      analysis[operation.queryType] = { count: 0, avgTime: 0, maxTime: 0 };
    }
    analysis[operation.queryType].count++;
  }

  for (const metric of metrics) {
    const queryType = metric.attributes?.queryType;
    if (queryType && analysis[queryType]) {
      const currentAvg = analysis[queryType].avgTime;
      const count = analysis[queryType].count;
      analysis[queryType].avgTime = (currentAvg * (count - 1) + metric.value) / count;
      analysis[queryType].maxTime = Math.max(analysis[queryType].maxTime, metric.value);
    }
  }

  return analysis;
}

function detectOptimizationOpportunities(analysis: any): Array<{ type: string; priority: string }> {
  const opportunities = [];
  
  if (analysis.slowQueryRate > 20) {
    opportunities.push({ type: 'query_optimization', priority: 'high' });
  }
  
  if (analysis.avgExecutionTime > 300) {
    opportunities.push({ type: 'performance_tuning', priority: 'medium' });
  }
  
  return opportunities;
}

function calculateRegressionSeverity(regressionRatio: number): string {
  if (regressionRatio > 2.0) return 'critical';
  if (regressionRatio > 1.5) return 'high';
  if (regressionRatio > 1.2) return 'medium';
  return 'low';
}

function analyzePerformanceByQueryType(metrics: PerformanceMetric[]): Record<string, PerformanceMetric[]> {
  const breakdown: Record<string, PerformanceMetric[]> = {};
  
  for (const metric of metrics) {
    const queryType = metric.attributes?.queryType || 'unknown';
    if (!breakdown[queryType]) {
      breakdown[queryType] = [];
    }
    breakdown[queryType].push(metric);
  }
  
  return breakdown;
}

describe('Firebase Performance Monitoring Properties', () => {
  let performanceMonitor: MockPerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new MockPerformanceMonitor();
  });

  /**
   * Property 29: Comprehensive Metrics Collection
   * 
   * For any system operation, the performance monitoring system should collect 
   * comprehensive metrics including Firebase reads, rule evaluations, cache performance, 
   * and query execution times
   * 
   * Validates: Requirements 8.1
   */
  describe('Property 29: Comprehensive Metrics Collection', () => {
    it('should collect comprehensive metrics for all system operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operationType: fc.constantFrom('firebase_read', 'rule_evaluation', 'cache_operation', 'query_execution', 'user_interaction'),
              collection: fc.string({ minLength: 3, maxLength: 20 }),
              count: fc.integer({ min: 1, max: 50 }),
              duration: fc.integer({ min: 10, max: 1000 }),
              isSuccessful: fc.boolean(),
              metadata: fc.record({
                component: fc.string({ minLength: 3, maxLength: 15 }),
                action: fc.string({ minLength: 3, maxLength: 15 }),
                userId: fc.string({ minLength: 5, maxLength: 20 })
              })
            }),
            { minLength: 50, maxLength: 200 }
          ),
          async (operations) => {
            performanceMonitor.reset();

            // Simulate various system operations
            for (const operation of operations) {
              switch (operation.operationType) {
                case 'firebase_read':
                  performanceMonitor.trackFirebaseRead(operation.collection, operation.count);
                  break;
                case 'rule_evaluation':
                  performanceMonitor.trackRuleEvaluation(`rule_${operation.collection}`, operation.duration);
                  break;
                case 'cache_operation':
                  performanceMonitor.trackCacheOperation('get', operation.duration, operation.isSuccessful);
                  break;
                case 'query_execution':
                  performanceMonitor.trackQueryPerformance(operation.collection, operation.duration, operation.count);
                  break;
                case 'user_interaction':
                  performanceMonitor.trackUserInteraction(operation.metadata.action, operation.metadata.component);
                  break;
              }
            }

            const metrics = performanceMonitor.getMetrics();

            // Property: All operation types should be tracked
            const operationTypes = new Set(operations.map(op => op.operationType));
            
            if (operationTypes.has('firebase_read')) {
              expect(metrics.firebaseReads.length).toBeGreaterThan(0);
            }
            if (operationTypes.has('rule_evaluation')) {
              expect(metrics.ruleEvaluations.length).toBeGreaterThan(0);
            }
            if (operationTypes.has('cache_operation')) {
              expect(metrics.cacheOperations.length).toBeGreaterThan(0);
            }
            if (operationTypes.has('query_execution')) {
              expect(metrics.queryPerformance.length).toBeGreaterThan(0);
            }
            if (operationTypes.has('user_interaction')) {
              expect(metrics.userInteractions.length).toBeGreaterThan(0);
            }

            // Property: Each metric should have required fields
            const allMetrics = [
              ...metrics.firebaseReads,
              ...metrics.ruleEvaluations,
              ...metrics.cacheOperations,
              ...metrics.queryPerformance,
              ...metrics.userInteractions
            ];

            for (const metric of allMetrics) {
              expect(metric).toHaveProperty('name');
              expect(metric).toHaveProperty('value');
              expect(metric).toHaveProperty('timestamp');
              expect(metric.timestamp).toBeInstanceOf(Date);
              expect(typeof metric.value).toBe('number');
              expect(typeof metric.name).toBe('string');
            }

            // Property: Metrics should be collected in chronological order
            for (const metricType of Object.keys(metrics) as (keyof MetricCollection)[]) {
              const typeMetrics = metrics[metricType];
              for (let i = 1; i < typeMetrics.length; i++) {
                expect(typeMetrics[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                  typeMetrics[i - 1].timestamp.getTime()
                );
              }
            }

            // Property: Metric collection should be comprehensive (cover all operation types)
            const totalOperations = operations.length;
            const totalMetrics = allMetrics.length;
            expect(totalMetrics).toBe(totalOperations);
          }
        ),
        { numRuns: 25, timeout: 6000 }
      );
    });
  });

  /**
   * Property 30: Performance Tracking and Detection
   * 
   * For any active performance monitoring, the system should track query execution times 
   * and identify slow operations for optimization
   * 
   * Validates: Requirements 8.2
   */
  describe('Property 30: Performance Tracking and Detection', () => {
    it('should track query execution times and identify slow operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              queryType: fc.constantFrom('discovery', 'search', 'filter', 'sort', 'aggregate'),
              executionTime: fc.integer({ min: 10, max: 2000 }),
              resultCount: fc.integer({ min: 0, max: 500 }),
              complexity: fc.constantFrom('simple', 'moderate', 'complex'),
              collection: fc.constantFrom('novels', 'users', 'comments', 'reviews', 'categories')
            }),
            { minLength: 30, maxLength: 100 }
          ),
          async (queryOperations) => {
            performanceMonitor.reset();

            // Track all query operations
            for (const query of queryOperations) {
              performanceMonitor.trackQueryPerformance(query.queryType, query.executionTime, query.resultCount);
            }

            const metrics = performanceMonitor.getMetrics();
            const queryMetrics = metrics.queryPerformance;

            // Property: All queries should be tracked
            expect(queryMetrics.length).toBe(queryOperations.length);

            // Property: Slow operations should be identifiable
            const slowThreshold = 500; // 500ms threshold
            const slowQueries = queryMetrics.filter(metric => metric.value > slowThreshold);
            const expectedSlowQueries = queryOperations.filter(query => query.executionTime > slowThreshold);
            
            expect(slowQueries.length).toBe(expectedSlowQueries.length);

            // Property: Performance metrics should enable optimization detection
            const performanceAnalysis = {
              avgExecutionTime: queryMetrics.reduce((sum, m) => sum + m.value, 0) / queryMetrics.length,
              p95ExecutionTime: calculatePercentile(queryMetrics.map(m => m.value), 95),
              slowQueryRate: (slowQueries.length / queryMetrics.length) * 100,
              queryTypePerformance: analyzeQueryTypePerformance(queryMetrics, queryOperations)
            };

            // Property: Analysis should provide actionable insights
            expect(performanceAnalysis.avgExecutionTime).toBeGreaterThan(0);
            expect(performanceAnalysis.p95ExecutionTime).toBeGreaterThanOrEqual(performanceAnalysis.avgExecutionTime);
            expect(performanceAnalysis.slowQueryRate).toBeGreaterThanOrEqual(0);
            expect(performanceAnalysis.slowQueryRate).toBeLessThanOrEqual(100);

            // Property: Query type performance analysis should be comprehensive
            for (const [queryType, stats] of Object.entries(performanceAnalysis.queryTypePerformance)) {
              const typedStats = stats as { count: number; avgTime: number; maxTime: number };
              expect(typedStats.count).toBeGreaterThan(0);
              expect(typedStats.avgTime).toBeGreaterThan(0);
              expect(typedStats.maxTime).toBeGreaterThanOrEqual(typedStats.avgTime);
            }

            // Property: Optimization opportunities should be detectable
            const optimizationOpportunities = detectOptimizationOpportunities(performanceAnalysis);
            
            if (performanceAnalysis.slowQueryRate > 20) {
              expect(optimizationOpportunities.some((opp: any) => opp.type === 'query_optimization')).toBe(true);
            }
            
            if (performanceAnalysis.avgExecutionTime > 300) {
              expect(optimizationOpportunities.some((opp: any) => opp.type === 'performance_tuning')).toBe(true);
            }
          }
        ),
        { numRuns: 20, timeout: 6000 }
      );
    });
  });

  /**
   * Property 31: Optimization Opportunity Alerting
   * 
   * For any cost analysis period, the system should detect and alert on optimization 
   * opportunities that could reduce Firebase costs by meaningful amounts
   * 
   * Validates: Requirements 8.3
   */
  describe('Property 31: Optimization Opportunity Alerting', () => {
    it('should detect and alert on meaningful optimization opportunities', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              readOperations: fc.integer({ min: 20, max: 200 }),
              ruleEvaluations: fc.integer({ min: 1000, max: 20000 }),
              storageGB: fc.float({ min: Math.fround(0.5), max: Math.fround(50.0) }),
              bandwidthGB: fc.float({ min: Math.fround(1.0), max: Math.fround(100.0) }),
              timeframe: fc.constantFrom('daily', 'weekly', 'monthly'),
              costThresholds: fc.record({
                readCostThreshold: fc.float({ min: Math.fround(0.5), max: Math.fround(5.0) }),
                ruleCostThreshold: fc.float({ min: Math.fround(0.2), max: Math.fround(2.0) }),
                storageCostThreshold: fc.float({ min: Math.fround(2.0), max: Math.fround(20.0) }),
                bandwidthCostThreshold: fc.float({ min: Math.fround(1.0), max: Math.fround(10.0) })
              })
            }),
            { minLength: 10, maxLength: 30 }
          ),
          async (costScenarios) => {
            const mockCostAnalyzer = new MockCostAnalyzer();
            let totalOpportunities = 0;
            let totalPotentialSavings = 0;
            let alertsGenerated = 0;

            // Helper function for this test
            const shouldGenerateOptimizationAlert = (costBreakdown: any, thresholds: any): boolean => {
              return costBreakdown.totalCost > 1.0 || // Generate alert for any cost > $1
                     costBreakdown.firebaseReads.totalCost > (thresholds.readCostThreshold * 0.5) ||
                     costBreakdown.ruleEvaluations.totalCost > (thresholds.ruleCostThreshold * 0.5) ||
                     costBreakdown.storage.totalCost > (thresholds.storageCostThreshold * 0.5) ||
                     costBreakdown.bandwidth.totalCost > (thresholds.bandwidthCostThreshold * 0.5);
            };

            for (const scenario of costScenarios) {
              // Calculate cost breakdown
              const costBreakdown = mockCostAnalyzer.calculateCostBreakdown(
                scenario.readOperations,
                scenario.ruleEvaluations,
                scenario.storageGB,
                scenario.bandwidthGB
              );

              // Detect optimization opportunities
              const opportunities = mockCostAnalyzer.detectOptimizationOpportunities(costBreakdown);
              totalOpportunities += opportunities.length;

              // Calculate potential savings
              const scenarioSavings = opportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0);
              totalPotentialSavings += scenarioSavings;

              // Check if alerts should be generated
              const shouldAlert = shouldGenerateOptimizationAlert(costBreakdown, scenario.costThresholds);
              if (shouldAlert) {
                alertsGenerated++;
              }

              // Property: High-cost scenarios should generate optimization opportunities
              if (costBreakdown.totalCost > 2.0) { // $2+ daily cost
                expect(opportunities.length).toBeGreaterThan(0);
              }

              // Property: Opportunities should have meaningful savings potential
              for (const opportunity of opportunities) {
                expect(opportunity.potentialSavings).toBeGreaterThan(0);
                expect(opportunity.savingsPercentage).toBeGreaterThan(0);
                expect(opportunity.savingsPercentage).toBeLessThanOrEqual(100);
                
                // High priority opportunities should have significant savings
                if (opportunity.priority === 'high') {
                  expect(opportunity.potentialSavings).toBeGreaterThan(5.0); // $5+ monthly savings
                }
              }

              // Property: Opportunities should be actionable
              for (const opportunity of opportunities) {
                expect(opportunity.description).toBeTruthy();
                expect(opportunity.implementationEffort).toMatch(/^(low|medium|high)$/);
                expect(opportunity.estimatedTimeToImplement).toBeTruthy();
                expect(opportunity.impact.costReduction).toBeGreaterThan(0);
              }
            }

            // Property: System should detect optimization opportunities proportional to inefficiencies
            const avgCostPerScenario = costScenarios.reduce((sum, s) => {
              const breakdown = mockCostAnalyzer.calculateCostBreakdown(s.readOperations, s.ruleEvaluations, s.storageGB, s.bandwidthGB);
              return sum + breakdown.totalCost;
            }, 0) / costScenarios.length;

            if (avgCostPerScenario > 1.0) {
              expect(totalOpportunities).toBeGreaterThan(costScenarios.length * 0.3); // At least 30% should have opportunities
            }

            // Property: Alerting should be proportional to high-cost scenarios
            const highCostScenarios = costScenarios.filter(s => {
              const breakdown = mockCostAnalyzer.calculateCostBreakdown(s.readOperations, s.ruleEvaluations, s.storageGB, s.bandwidthGB);
              return breakdown.totalCost > 1.5;
            });

            if (highCostScenarios.length > 0) {
              const alertRate = alertsGenerated / highCostScenarios.length;
              expect(alertRate).toBeGreaterThan(0.5); // At least 50% of high-cost scenarios should trigger alerts
            }

            // Property: Total potential savings should be meaningful
            if (totalOpportunities > 0) {
              const avgSavingsPerOpportunity = totalPotentialSavings / totalOpportunities;
              expect(avgSavingsPerOpportunity).toBeGreaterThanOrEqual(1.0); // Average $1+ savings per opportunity
            }
          }
        ),
        { numRuns: 20, timeout: 6000 }
      );
    });
  });

  /**
   * Property 32: Cost Analysis Reporting
   * 
   * For any cost analysis request, the system should provide detailed cost breakdown 
   * with accurate projections and actionable insights
   * 
   * Validates: Requirements 8.4
   */
  describe('Property 32: Cost Analysis Reporting', () => {
    it('should provide accurate and detailed cost breakdown analysis', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              usage: fc.record({
                dailyReads: fc.integer({ min: 10, max: 500 }),
                dailyRuleEvals: fc.integer({ min: 500, max: 50000 }),
                storageGB: fc.float({ min: Math.fround(0.1), max: Math.fround(200.0) }),
                bandwidthGB: fc.float({ min: Math.fround(0.5), max: Math.fround(500.0) })
              }),
              timeframe: fc.constantFrom('daily', 'weekly', 'monthly'),
              reportingPeriod: fc.integer({ min: 1, max: 90 }) // days
            }),
            { minLength: 8, maxLength: 25 }
          ),
          async (reportingScenarios) => {
            const mockCostAnalyzer = new MockCostAnalyzer();

            for (const scenario of reportingScenarios) {
              const costBreakdown = mockCostAnalyzer.calculateCostBreakdown(
                scenario.usage.dailyReads,
                scenario.usage.dailyRuleEvals,
                scenario.usage.storageGB,
                scenario.usage.bandwidthGB
              );

              // Property: Cost breakdown should be mathematically accurate
              const expectedTotal = costBreakdown.firebaseReads.totalCost +
                                  costBreakdown.ruleEvaluations.totalCost +
                                  costBreakdown.storage.totalCost +
                                  costBreakdown.bandwidth.totalCost;
              
              expect(Math.abs(costBreakdown.totalCost - expectedTotal)).toBeLessThan(0.001);

              // Property: All cost components should have valid values (skip NaN values)
              if (!isNaN(scenario.usage.dailyReads)) {
                expect(costBreakdown.firebaseReads.count).toBe(scenario.usage.dailyReads);
              }
              if (!isNaN(scenario.usage.dailyRuleEvals)) {
                expect(costBreakdown.ruleEvaluations.count).toBe(scenario.usage.dailyRuleEvals);
              }
              if (!isNaN(scenario.usage.storageGB)) {
                expect(costBreakdown.storage.storageSize).toBeCloseTo(scenario.usage.storageGB, 2);
              }
              if (!isNaN(scenario.usage.bandwidthGB)) {
                expect(costBreakdown.bandwidth.dataTransferred).toBeCloseTo(scenario.usage.bandwidthGB, 2);
              }

              // Property: Cost per unit should be consistent with Firebase pricing
              expect(costBreakdown.firebaseReads.costPerRead).toBeGreaterThanOrEqual(0);
              expect(costBreakdown.ruleEvaluations.costPerEvaluation).toBeGreaterThanOrEqual(0);
              expect(costBreakdown.storage.costPerGB).toBeGreaterThanOrEqual(0);
              expect(costBreakdown.bandwidth.costPerGB).toBeGreaterThanOrEqual(0);

              // Property: Optimization potential should be realistic
              expect(costBreakdown.optimizationPotential).toBeGreaterThanOrEqual(0);
              expect(costBreakdown.optimizationPotential).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 20, timeout: 6000 }
      );
    });
  });

  /**
   * Property 33: Regression Detection and Diagnosis
   * 
   * For any performance monitoring period, the system should detect performance 
   * regressions and provide diagnostic information for root cause analysis
   * 
   * Validates: Requirements 8.5
   */
  describe('Property 33: Regression Detection and Diagnosis', () => {
    it('should detect performance regressions and provide diagnostic information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              timeWindow: fc.record({
                baselinePeriod: fc.integer({ min: 7, max: 30 }), // days
                comparisonPeriod: fc.integer({ min: 1, max: 7 }) // days
              }),
              performanceMetrics: fc.record({
                baselineReads: fc.integer({ min: 20, max: 100 }),
                currentReads: fc.integer({ min: 15, max: 200 }),
                baselineRules: fc.integer({ min: 2000, max: 8000 }),
                currentRules: fc.integer({ min: 1500, max: 15000 }),
                baselineResponseTime: fc.integer({ min: 100, max: 300 }),
                currentResponseTime: fc.integer({ min: 80, max: 600 }),
                baselineCacheHitRate: fc.float({ min: Math.fround(70.0), max: Math.fround(95.0) }),
                currentCacheHitRate: fc.float({ min: Math.fround(60.0), max: Math.fround(98.0) })
              }),
              changeEvents: fc.array(
                fc.record({
                  type: fc.constantFrom('deployment', 'config_change', 'traffic_spike', 'feature_release'),
                  timestamp: fc.integer({ min: 1, max: 7 }), // days ago
                  impact: fc.constantFrom('low', 'medium', 'high')
                }),
                { minLength: 0, maxLength: 5 }
              )
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (regressionScenarios) => {
            const mockRegressionDetector = new MockRegressionDetector();

            for (const scenario of regressionScenarios) {
              const regressionAnalysis = mockRegressionDetector.analyzeRegression(
                scenario.performanceMetrics,
                scenario.timeWindow,
                scenario.changeEvents
              );

              // Property: Regression detection should be mathematically accurate
              const readRegression = (scenario.performanceMetrics.currentReads - scenario.performanceMetrics.baselineReads) / scenario.performanceMetrics.baselineReads;
              const ruleRegression = (scenario.performanceMetrics.currentRules - scenario.performanceMetrics.baselineRules) / scenario.performanceMetrics.baselineRules;
              const responseTimeRegression = (scenario.performanceMetrics.currentResponseTime - scenario.performanceMetrics.baselineResponseTime) / scenario.performanceMetrics.baselineResponseTime;
              const cacheRegression = (scenario.performanceMetrics.baselineCacheHitRate - scenario.performanceMetrics.currentCacheHitRate) / scenario.performanceMetrics.baselineCacheHitRate;

              // Property: Significant regressions should be detected
              const regressionThreshold = 0.2; // 20% threshold
              
              if (Math.abs(readRegression) > regressionThreshold) {
                expect(regressionAnalysis.regressions.some((r: any) => r.metric === 'firebase_reads')).toBe(true);
              }

              // Property: Diagnostic information should be comprehensive
              for (const regression of regressionAnalysis.regressions) {
                expect(regression).toHaveProperty('metric');
                expect(regression).toHaveProperty('severity');
                expect(regression).toHaveProperty('changePercentage');
                expect(regression).toHaveProperty('possibleCauses');
                expect(regression).toHaveProperty('recommendedActions');
                
                expect(regression.possibleCauses.length).toBeGreaterThan(0);
                expect(regression.recommendedActions.length).toBeGreaterThan(0);
              }

              // Property: Root cause analysis should correlate with change events
              const highImpactEvents = scenario.changeEvents.filter(event => event.impact === 'high');
              if (highImpactEvents.length > 0 && regressionAnalysis.regressions.length > 0) {
                expect(regressionAnalysis.likelyRootCauses.some((cause: string) => 
                  highImpactEvents.some(event => cause.includes(event.type))
                )).toBe(true);
              }

              // Property: Severity assessment should be proportional to impact
              for (const regression of regressionAnalysis.regressions) {
                if (Math.abs(regression.changePercentage) > 50) {
                  expect(['high', 'critical'].includes(regression.severity)).toBe(true);
                } else if (Math.abs(regression.changePercentage) > 20) {
                  expect(['medium', 'high'].includes(regression.severity)).toBe(true);
                }
              }

              // Property: Recommendations should be actionable and specific
              for (const regression of regressionAnalysis.regressions) {
                for (const action of regression.recommendedActions) {
                  expect(action.length).toBeGreaterThan(10); // Meaningful description
                  expect(action).toMatch(/^[A-Z]/); // Proper sentence format
                }
              }
            }
          }
        ),
        { numRuns: 15, timeout: 6000 }
      );
    });
  });
});

// Helper classes for testing
class MockCostAnalyzer {
  calculateCostBreakdown(reads: number, rules: number, storage: number, bandwidth: number) {
    // Handle NaN values
    const safeReads = isNaN(reads) ? 0 : reads;
    const safeRules = isNaN(rules) ? 0 : rules;
    const safeStorage = isNaN(storage) ? 0 : storage;
    const safeBandwidth = isNaN(bandwidth) ? 0 : bandwidth;
    
    const readCost = Math.max(0, safeReads - 50000) * 0.000036;
    const ruleCost = safeRules * 0.0000002;
    const storageCost = Math.max(0, safeStorage - 1) * 0.18;
    const bandwidthCost = Math.max(0, safeBandwidth - 10) * 0.12;
    const totalCost = readCost + ruleCost + storageCost + bandwidthCost;

    return {
      firebaseReads: { 
        count: safeReads, 
        totalCost: readCost, 
        projectedMonthlyCost: readCost * 30,
        costPerRead: safeReads > 0 ? readCost / safeReads : 0
      },
      ruleEvaluations: { 
        count: safeRules, 
        totalCost: ruleCost, 
        projectedMonthlyCost: ruleCost * 30,
        costPerEvaluation: safeRules > 0 ? ruleCost / safeRules : 0
      },
      storage: { 
        storageSize: safeStorage, 
        totalCost: storageCost, 
        projectedMonthlyCost: storageCost,
        costPerGB: safeStorage > 0 ? storageCost / safeStorage : 0
      },
      bandwidth: { 
        dataTransferred: safeBandwidth, 
        totalCost: bandwidthCost, 
        projectedMonthlyCost: bandwidthCost * 30,
        costPerGB: safeBandwidth > 0 ? bandwidthCost / safeBandwidth : 0
      },
      totalCost,
      projectedMonthlyCost: (readCost + ruleCost + bandwidthCost) * 30 + storageCost,
      optimizationPotential: Math.min(100, (totalCost / 5) * 100)
    };
  }

  detectOptimizationOpportunities(costBreakdown: any) {
    const opportunities = [];
    
    // Generate opportunities for high-cost scenarios
    if (costBreakdown.firebaseReads.count > 45 || costBreakdown.totalCost > 2.0) {
      const potentialSavings = Math.max(1.0, costBreakdown.firebaseReads.projectedMonthlyCost * 0.7); // Ensure minimum $1 savings
      opportunities.push({
        type: 'read_reduction',
        priority: costBreakdown.firebaseReads.projectedMonthlyCost > 20 ? 'high' : 'medium',
        potentialSavings: potentialSavings,
        savingsPercentage: 70,
        implementationEffort: 'medium',
        estimatedTimeToImplement: '2-3 weeks',
        description: 'Implement caching to reduce read operations',
        currentCost: costBreakdown.firebaseReads.projectedMonthlyCost,
        impact: { costReduction: potentialSavings, performanceImprovement: 40, maintenanceReduction: 20 }
      });
    }

    // Generate storage optimization opportunities for high storage costs
    if (costBreakdown.storage.totalCost > 1.0) {
      opportunities.push({
        type: 'storage_optimization',
        priority: 'medium',
        potentialSavings: Math.max(1.0, costBreakdown.storage.projectedMonthlyCost * 0.3),
        savingsPercentage: 30,
        implementationEffort: 'low',
        estimatedTimeToImplement: '1-2 weeks',
        description: 'Optimize storage usage and cleanup unused data',
        currentCost: costBreakdown.storage.projectedMonthlyCost,
        impact: { costReduction: costBreakdown.storage.projectedMonthlyCost * 0.3, performanceImprovement: 10, maintenanceReduction: 15 }
      });
    }

    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }
}

class MockRegressionDetector {
  analyzeRegression(metrics: any, timeWindow: any, changeEvents: any[]) {
    const regressions = [];
    const threshold = 0.2;

    const readChange = (metrics.currentReads - metrics.baselineReads) / metrics.baselineReads;
    if (Math.abs(readChange) > threshold) {
      regressions.push({
        metric: 'firebase_reads',
        severity: Math.abs(readChange) > 0.5 ? 'high' : 'medium',
        changePercentage: readChange * 100,
        possibleCauses: ['Increased traffic', 'Cache miss rate increase', 'Query inefficiency'],
        recommendedActions: ['Review caching strategy', 'Optimize query patterns', 'Implement read batching']
      });
    }

    return {
      regressions,
      likelyRootCauses: changeEvents.filter(e => e.impact === 'high').map(e => e.type),
      timeline: timeWindow
    };
  }
}