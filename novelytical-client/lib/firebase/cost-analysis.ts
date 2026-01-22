/**
 * Firebase Cost Analysis System
 * 
 * Firebase kullanım maliyetlerini analiz eden ve optimizasyon fırsatlarını tespit eden sistem.
 * Requirements 8.3, 8.4, 8.5 için cost breakdown ve optimization alerting sağlar.
 */

// Cost analysis interfaces
export interface CostBreakdown {
  firebaseReads: {
    count: number;
    costPerRead: number;
    totalCost: number;
    projectedMonthlyCost: number;
  };
  ruleEvaluations: {
    count: number;
    costPerEvaluation: number;
    totalCost: number;
    projectedMonthlyCost: number;
  };
  storage: {
    documentsStored: number;
    storageSize: number; // in GB
    costPerGB: number;
    totalCost: number;
    projectedMonthlyCost: number;
  };
  bandwidth: {
    dataTransferred: number; // in GB
    costPerGB: number;
    totalCost: number;
    projectedMonthlyCost: number;
  };
  totalCost: number;
  projectedMonthlyCost: number;
  optimizationPotential: number; // Potential savings percentage
}

export interface OptimizationOpportunity {
  type: 'read_reduction' | 'rule_optimization' | 'storage_cleanup' | 'bandwidth_optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  implementationEffort: 'low' | 'medium' | 'high';
  estimatedTimeToImplement: string;
  impact: {
    costReduction: number;
    performanceImprovement: number;
    maintenanceReduction: number;
  };
}

export interface CostAlert {
  id: string;
  type: 'budget_exceeded' | 'cost_spike' | 'optimization_opportunity' | 'regression_detected';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  actionRequired: boolean;
  suggestedActions: string[];
}

export interface CostThresholds {
  dailyBudget: number;
  monthlyBudget: number;
  readOperationsCostThreshold: number;
  ruleEvaluationsCostThreshold: number;
  storageCostThreshold: number;
  bandwidthCostThreshold: number;
  costSpikePercentage: number; // Percentage increase that triggers alert
}

// Firebase pricing constants (as of 2024)
const FIREBASE_PRICING = {
  READ_COST_PER_100K: 0.036, // $0.036 per 100,000 reads
  RULE_EVALUATION_COST_PER_100K: 0.02, // Estimated cost per 100,000 evaluations
  STORAGE_COST_PER_GB: 0.18, // $0.18 per GB per month
  BANDWIDTH_COST_PER_GB: 0.12, // $0.12 per GB
  FREE_TIER: {
    READS_PER_DAY: 50000,
    STORAGE_GB: 1,
    BANDWIDTH_GB: 10
  }
};

export class FirebaseCostAnalyzer {
  private costHistory: Map<string, number[]> = new Map();
  private alerts: CostAlert[] = [];
  private thresholds: CostThresholds;
  private alertCallbacks: Set<(alert: CostAlert) => void> = new Set();

  constructor(thresholds: CostThresholds) {
    this.thresholds = thresholds;
    this.initializeCostTracking();
  }

  private initializeCostTracking(): void {
    this.costHistory.set('daily_reads', []);
    this.costHistory.set('daily_rules', []);
    this.costHistory.set('daily_storage', []);
    this.costHistory.set('daily_bandwidth', []);
  }

  calculateCostBreakdown(
    readCount: number,
    ruleEvaluationCount: number,
    storageGB: number,
    bandwidthGB: number,
    timeframe: 'daily' | 'monthly' = 'daily'
  ): CostBreakdown {
    // Calculate Firebase read costs
    const effectiveReads = Math.max(0, readCount - FIREBASE_PRICING.FREE_TIER.READS_PER_DAY);
    const readCost = (effectiveReads / 100000) * FIREBASE_PRICING.READ_COST_PER_100K;

    // Calculate rule evaluation costs
    const ruleCost = (ruleEvaluationCount / 100000) * FIREBASE_PRICING.RULE_EVALUATION_COST_PER_100K;

    // Calculate storage costs
    const effectiveStorage = Math.max(0, storageGB - FIREBASE_PRICING.FREE_TIER.STORAGE_GB);
    const storageCost = effectiveStorage * FIREBASE_PRICING.STORAGE_COST_PER_GB;

    // Calculate bandwidth costs
    const effectiveBandwidth = Math.max(0, bandwidthGB - FIREBASE_PRICING.FREE_TIER.BANDWIDTH_GB);
    const bandwidthCost = effectiveBandwidth * FIREBASE_PRICING.BANDWIDTH_COST_PER_GB;

    const totalCost = readCost + ruleCost + storageCost + bandwidthCost;

    // Project monthly costs
    const monthlyMultiplier = timeframe === 'daily' ? 30 : 1;

    // Calculate optimization potential based on current usage patterns
    const optimizationPotential = this.calculateOptimizationPotential(
      readCount, ruleEvaluationCount, storageGB, bandwidthGB
    );

    return {
      firebaseReads: {
        count: readCount,
        costPerRead: FIREBASE_PRICING.READ_COST_PER_100K / 100000,
        totalCost: readCost,
        projectedMonthlyCost: readCost * monthlyMultiplier
      },
      ruleEvaluations: {
        count: ruleEvaluationCount,
        costPerEvaluation: FIREBASE_PRICING.RULE_EVALUATION_COST_PER_100K / 100000,
        totalCost: ruleCost,
        projectedMonthlyCost: ruleCost * monthlyMultiplier
      },
      storage: {
        documentsStored: Math.floor(storageGB * 1000000), // Estimate docs from GB
        storageSize: storageGB,
        costPerGB: FIREBASE_PRICING.STORAGE_COST_PER_GB,
        totalCost: storageCost,
        projectedMonthlyCost: storageCost // Storage is already monthly
      },
      bandwidth: {
        dataTransferred: bandwidthGB,
        costPerGB: FIREBASE_PRICING.BANDWIDTH_COST_PER_GB,
        totalCost: bandwidthCost,
        projectedMonthlyCost: bandwidthCost * monthlyMultiplier
      },
      totalCost,
      projectedMonthlyCost: (readCost + ruleCost + bandwidthCost) * monthlyMultiplier + storageCost,
      optimizationPotential
    };
  }

  detectOptimizationOpportunities(costBreakdown: CostBreakdown): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Read operation optimization
    if (costBreakdown.firebaseReads.projectedMonthlyCost > 10) {
      const readOptimization = this.analyzeReadOptimization(costBreakdown.firebaseReads);
      if (readOptimization) {
        opportunities.push(readOptimization);
      }
    }

    // Rule evaluation optimization
    if (costBreakdown.ruleEvaluations.projectedMonthlyCost > 5) {
      const ruleOptimization = this.analyzeRuleOptimization(costBreakdown.ruleEvaluations);
      if (ruleOptimization) {
        opportunities.push(ruleOptimization);
      }
    }

    // Storage optimization
    if (costBreakdown.storage.projectedMonthlyCost > 15) {
      const storageOptimization = this.analyzeStorageOptimization(costBreakdown.storage);
      if (storageOptimization) {
        opportunities.push(storageOptimization);
      }
    }

    // Bandwidth optimization
    if (costBreakdown.bandwidth.projectedMonthlyCost > 8) {
      const bandwidthOptimization = this.analyzeBandwidthOptimization(costBreakdown.bandwidth);
      if (bandwidthOptimization) {
        opportunities.push(bandwidthOptimization);
      }
    }

    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  generateCostAlert(
    type: CostAlert['type'],
    severity: CostAlert['severity'],
    title: string,
    message: string,
    currentValue: number,
    threshold: number,
    suggestedActions: string[] = []
  ): CostAlert {
    const alert: CostAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      currentValue,
      threshold,
      timestamp: new Date(),
      actionRequired: severity === 'error' || severity === 'critical',
      suggestedActions
    };

    this.alerts.push(alert);
    this.notifyAlertCallbacks(alert);
    
    return alert;
  }

  monitorCostThresholds(costBreakdown: CostBreakdown): CostAlert[] {
    const newAlerts: CostAlert[] = [];

    // Check daily budget
    if (costBreakdown.totalCost > this.thresholds.dailyBudget) {
      newAlerts.push(this.generateCostAlert(
        'budget_exceeded',
        'error',
        'Daily Budget Exceeded',
        `Daily cost of $${costBreakdown.totalCost.toFixed(2)} exceeds budget of $${this.thresholds.dailyBudget}`,
        costBreakdown.totalCost,
        this.thresholds.dailyBudget,
        ['Review optimization opportunities', 'Implement caching strategies', 'Optimize query patterns']
      ));
    }

    // Check monthly projection
    if (costBreakdown.projectedMonthlyCost > this.thresholds.monthlyBudget) {
      newAlerts.push(this.generateCostAlert(
        'budget_exceeded',
        'warning',
        'Monthly Budget Projection Exceeded',
        `Projected monthly cost of $${costBreakdown.projectedMonthlyCost.toFixed(2)} exceeds budget of $${this.thresholds.monthlyBudget}`,
        costBreakdown.projectedMonthlyCost,
        this.thresholds.monthlyBudget,
        ['Implement read operation caching', 'Optimize security rules', 'Review data access patterns']
      ));
    }

    // Check individual component thresholds
    if (costBreakdown.firebaseReads.totalCost > this.thresholds.readOperationsCostThreshold) {
      newAlerts.push(this.generateCostAlert(
        'cost_spike',
        'warning',
        'High Firebase Read Costs',
        `Firebase read costs of $${costBreakdown.firebaseReads.totalCost.toFixed(2)} exceed threshold`,
        costBreakdown.firebaseReads.totalCost,
        this.thresholds.readOperationsCostThreshold,
        ['Implement multi-layer caching', 'Batch read operations', 'Use denormalized data structures']
      ));
    }

    // Detect cost spikes
    this.detectCostSpikes(costBreakdown, newAlerts);

    return newAlerts;
  }

  subscribeToAlerts(callback: (alert: CostAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }

  getAlerts(): CostAlert[] {
    return [...this.alerts];
  }

  clearAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  exportCostReport(costBreakdown: CostBreakdown, opportunities: OptimizationOpportunity[]): string {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDailyCost: costBreakdown.totalCost,
        projectedMonthlyCost: costBreakdown.projectedMonthlyCost,
        optimizationPotential: costBreakdown.optimizationPotential
      },
      breakdown: costBreakdown,
      optimizationOpportunities: opportunities,
      alerts: this.getAlerts().filter(alert => 
        alert.timestamp.getTime() > Date.now() - 86400000 // Last 24 hours
      )
    };

    return JSON.stringify(report, null, 2);
  }

  private calculateOptimizationPotential(
    readCount: number,
    ruleEvaluationCount: number,
    storageGB: number,
    bandwidthGB: number
  ): number {
    let potential = 0;

    // Read optimization potential (up to 70% reduction target)
    if (readCount > 45) {
      potential += Math.min(70, ((readCount - 45) / readCount) * 100) * 0.4; // 40% weight
    }

    // Rule optimization potential (up to 70% reduction target)
    if (ruleEvaluationCount > 4500) {
      potential += Math.min(70, ((ruleEvaluationCount - 4500) / ruleEvaluationCount) * 100) * 0.3; // 30% weight
    }

    // Storage optimization potential
    if (storageGB > 5) {
      potential += Math.min(30, ((storageGB - 5) / storageGB) * 100) * 0.2; // 20% weight
    }

    // Bandwidth optimization potential
    if (bandwidthGB > 20) {
      potential += Math.min(40, ((bandwidthGB - 20) / bandwidthGB) * 100) * 0.1; // 10% weight
    }

    return Math.min(100, potential);
  }

  private analyzeReadOptimization(readCosts: CostBreakdown['firebaseReads']): OptimizationOpportunity | null {
    if (readCosts.count <= 45) return null; // Already at target

    const potentialReduction = Math.min(0.7, (readCosts.count - 45) / readCosts.count);
    const potentialSavings = readCosts.projectedMonthlyCost * potentialReduction;

    return {
      type: 'read_reduction',
      priority: potentialSavings > 20 ? 'high' : 'medium',
      description: `Implement caching and query optimization to reduce Firebase read operations from ${readCosts.count} to target of 45 per day`,
      currentCost: readCosts.projectedMonthlyCost,
      potentialSavings,
      savingsPercentage: potentialReduction * 100,
      implementationEffort: 'medium',
      estimatedTimeToImplement: '2-3 weeks',
      impact: {
        costReduction: potentialSavings,
        performanceImprovement: 40,
        maintenanceReduction: 20
      }
    };
  }

  private analyzeRuleOptimization(ruleCosts: CostBreakdown['ruleEvaluations']): OptimizationOpportunity | null {
    if (ruleCosts.count <= 4500) return null; // Already at target

    const potentialReduction = Math.min(0.7, (ruleCosts.count - 4500) / ruleCosts.count);
    const potentialSavings = ruleCosts.projectedMonthlyCost * potentialReduction;

    return {
      type: 'rule_optimization',
      priority: potentialSavings > 10 ? 'high' : 'medium',
      description: `Simplify security rules and implement pre-computed authorization to reduce evaluations from ${ruleCosts.count} to target of 4500 per day`,
      currentCost: ruleCosts.projectedMonthlyCost,
      potentialSavings,
      savingsPercentage: potentialReduction * 100,
      implementationEffort: 'medium',
      estimatedTimeToImplement: '1-2 weeks',
      impact: {
        costReduction: potentialSavings,
        performanceImprovement: 30,
        maintenanceReduction: 25
      }
    };
  }

  private analyzeStorageOptimization(storageCosts: CostBreakdown['storage']): OptimizationOpportunity | null {
    const potentialReduction = 0.2; // Assume 20% storage reduction possible
    const potentialSavings = storageCosts.projectedMonthlyCost * potentialReduction;

    return {
      type: 'storage_cleanup',
      priority: potentialSavings > 5 ? 'medium' : 'low',
      description: `Clean up unused documents and optimize data structures to reduce storage from ${storageCosts.storageSize.toFixed(2)}GB`,
      currentCost: storageCosts.projectedMonthlyCost,
      potentialSavings,
      savingsPercentage: potentialReduction * 100,
      implementationEffort: 'low',
      estimatedTimeToImplement: '1 week',
      impact: {
        costReduction: potentialSavings,
        performanceImprovement: 15,
        maintenanceReduction: 30
      }
    };
  }

  private analyzeBandwidthOptimization(bandwidthCosts: CostBreakdown['bandwidth']): OptimizationOpportunity | null {
    const potentialReduction = 0.3; // Assume 30% bandwidth reduction possible
    const potentialSavings = bandwidthCosts.projectedMonthlyCost * potentialReduction;

    return {
      type: 'bandwidth_optimization',
      priority: potentialSavings > 3 ? 'medium' : 'low',
      description: `Implement data compression and optimize payload sizes to reduce bandwidth from ${bandwidthCosts.dataTransferred.toFixed(2)}GB`,
      currentCost: bandwidthCosts.projectedMonthlyCost,
      potentialSavings,
      savingsPercentage: potentialReduction * 100,
      implementationEffort: 'low',
      estimatedTimeToImplement: '1 week',
      impact: {
        costReduction: potentialSavings,
        performanceImprovement: 25,
        maintenanceReduction: 10
      }
    };
  }

  private detectCostSpikes(costBreakdown: CostBreakdown, alerts: CostAlert[]): void {
    // Get historical cost data
    const dailyCosts = this.costHistory.get('daily_total') || [];
    dailyCosts.push(costBreakdown.totalCost);
    
    // Keep only last 30 days
    if (dailyCosts.length > 30) {
      dailyCosts.shift();
    }
    
    this.costHistory.set('daily_total', dailyCosts);

    // Calculate average of last 7 days (excluding today)
    if (dailyCosts.length >= 8) {
      const recentAverage = dailyCosts.slice(-8, -1).reduce((sum, cost) => sum + cost, 0) / 7;
      const currentCost = costBreakdown.totalCost;
      const spikePercentage = ((currentCost - recentAverage) / recentAverage) * 100;

      if (spikePercentage > this.thresholds.costSpikePercentage) {
        alerts.push(this.generateCostAlert(
          'cost_spike',
          spikePercentage > 100 ? 'critical' : 'warning',
          'Cost Spike Detected',
          `Current daily cost of $${currentCost.toFixed(2)} is ${spikePercentage.toFixed(1)}% higher than recent average of $${recentAverage.toFixed(2)}`,
          currentCost,
          recentAverage,
          ['Investigate unusual activity', 'Check for performance regressions', 'Review recent deployments']
        ));
      }
    }
  }

  private notifyAlertCallbacks(alert: CostAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.warn('Error in cost alert callback:', error);
      }
    });
  }
}

// Utility functions
export const createCostThresholds = (overrides?: Partial<CostThresholds>): CostThresholds => ({
  dailyBudget: 5.00,
  monthlyBudget: 100.00,
  readOperationsCostThreshold: 1.00,
  ruleEvaluationsCostThreshold: 0.50,
  storageCostThreshold: 10.00,
  bandwidthCostThreshold: 2.00,
  costSpikePercentage: 50,
  ...overrides
});

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount);
};