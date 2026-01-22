/**
 * Performance Dashboard
 * 
 * Real-time performans metrikleri ve trend analizi için dashboard sistemi.
 * Requirements 8.1, 8.2 için comprehensive monitoring sağlar.
 */

import { 
  PerformanceMonitor, 
  CurrentMetrics, 
  TrendData, 
  TimeRange, 
  AlertThresholds, 
  OptimizationSuggestion,
  RegressionAlert 
} from './performance-monitor';

export interface PerformanceDashboard {
  // Gerçek zamanlı metrikler
  getCurrentMetrics(): Promise<CurrentMetrics>;
  
  // Trend analizi
  getTrendAnalysis(timeRange: TimeRange): Promise<TrendData>;
  
  // Uyarı sistemi
  setupAlerts(thresholds: AlertThresholds): void;
  
  // Optimizasyon önerileri
  getOptimizationSuggestions(): Promise<OptimizationSuggestion[]>;
  
  // Alert management
  getActiveAlerts(): RegressionAlert[];
  clearAlert(alertId: string): void;
  
  // Export functionality
  exportMetrics(format: 'json' | 'csv'): Promise<string>;
  
  // Real-time subscriptions
  subscribeToMetrics(callback: (metrics: CurrentMetrics) => void): () => void;
}

export class FirebasePerformanceDashboard implements PerformanceDashboard {
  private monitor: PerformanceMonitor;
  private subscribers: Set<(metrics: CurrentMetrics) => void> = new Set();
  private metricsUpdateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 5000; // 5 seconds

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
    this.startMetricsUpdates();
  }

  async getCurrentMetrics(): Promise<CurrentMetrics> {
    return await this.monitor.getCurrentMetrics();
  }

  async getTrendAnalysis(timeRange: TimeRange): Promise<TrendData> {
    return await this.monitor.getTrendAnalysis(timeRange);
  }

  setupAlerts(thresholds: AlertThresholds): void {
    this.monitor.setupAlerts(thresholds);
  }

  async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    return await this.monitor.getOptimizationSuggestions();
  }

  getActiveAlerts(): RegressionAlert[] {
    return this.monitor.detectPerformanceRegression();
  }

  clearAlert(alertId: string): void {
    // In a real implementation, this would clear specific alerts
    // For now, we'll implement a basic version
    console.log(`Clearing alert: ${alertId}`);
  }

  async exportMetrics(format: 'json' | 'csv'): Promise<string> {
    const metrics = await this.getCurrentMetrics();
    const report = this.monitor.getOptimizationReport();
    
    const data = {
      timestamp: new Date().toISOString(),
      currentMetrics: metrics,
      optimizationReport: report,
      alerts: this.getActiveAlerts()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  subscribeToMetrics(callback: (metrics: CurrentMetrics) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private startMetricsUpdates(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }

    this.metricsUpdateInterval = setInterval(async () => {
      try {
        const metrics = await this.getCurrentMetrics();
        this.notifySubscribers(metrics);
      } catch (error) {
        console.warn('Failed to update metrics:', error);
      }
    }, this.UPDATE_INTERVAL);
  }

  private notifySubscribers(metrics: CurrentMetrics): void {
    this.subscribers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.warn('Error in metrics subscriber:', error);
      }
    });
  }

  private convertToCSV(data: any): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Metric,Current,Target,Percentage,Timestamp');
    
    // Read Operations
    lines.push(`Read Operations,${data.currentMetrics.readOperations.current},${data.currentMetrics.readOperations.target},${data.currentMetrics.readOperations.percentage.toFixed(2)},${data.timestamp}`);
    
    // Rule Evaluations
    lines.push(`Rule Evaluations,${data.currentMetrics.ruleEvaluations.current},${data.currentMetrics.ruleEvaluations.target},${data.currentMetrics.ruleEvaluations.percentage.toFixed(2)},${data.timestamp}`);
    
    // Cache Hit Rate
    lines.push(`Cache Hit Rate,${data.currentMetrics.cacheHitRate.toFixed(2)},85,${(data.currentMetrics.cacheHitRate / 85 * 100).toFixed(2)},${data.timestamp}`);
    
    // Response Time
    lines.push(`Response Time,${data.currentMetrics.averageResponseTime.toFixed(2)},200,${(data.currentMetrics.averageResponseTime / 200 * 100).toFixed(2)},${data.timestamp}`);
    
    return lines.join('\n');
  }

  destroy(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
    this.subscribers.clear();
  }
}

// Dashboard utilities
export class MetricsAggregator {
  private metrics: Map<string, number[]> = new Map();

  addMetric(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);
    
    // Keep only last 100 values to prevent memory leaks
    if (values.length > 100) {
      values.shift();
    }
    
    this.metrics.set(name, values);
  }

  getAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getPercentile(name: string, percentile: number): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getTrend(name: string): 'increasing' | 'decreasing' | 'stable' {
    const values = this.metrics.get(name) || [];
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-10); // Last 10 values
    const older = values.slice(-20, -10); // Previous 10 values
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const threshold = 0.05; // 5% threshold
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > threshold) return 'increasing';
    if (change < -threshold) return 'decreasing';
    return 'stable';
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Performance alert system
export class AlertManager {
  private alerts: Map<string, RegressionAlert> = new Map();
  private callbacks: Set<(alert: RegressionAlert) => void> = new Set();

  addAlert(alert: RegressionAlert): void {
    const alertId = `${alert.type}_${alert.timestamp.getTime()}`;
    this.alerts.set(alertId, alert);
    
    // Notify subscribers
    this.callbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.warn('Error in alert callback:', error);
      }
    });
  }

  getAlerts(): RegressionAlert[] {
    return Array.from(this.alerts.values());
  }

  clearAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  clearAllAlerts(): void {
    this.alerts.clear();
  }

  subscribeToAlerts(callback: (alert: RegressionAlert) => void): () => void {
    this.callbacks.add(callback);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  getAlertsByType(type: RegressionAlert['type']): RegressionAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.type === type);
  }

  getAlertsBySeverity(severity: RegressionAlert['severity']): RegressionAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.severity === severity);
  }
}

// Export utilities
export const createTimeRange = (
  start: Date, 
  end: Date, 
  granularity: TimeRange['granularity'] = 'hour'
): TimeRange => ({
  start,
  end,
  granularity
});

export const createAlertThresholds = (overrides?: Partial<AlertThresholds>): AlertThresholds => ({
  readOperationsThreshold: 45,
  ruleEvaluationsThreshold: 4500,
  cacheHitRateThreshold: 85,
  responseTimeThreshold: 200,
  ...overrides
});