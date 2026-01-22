/**
 * Firebase Performance Tracker
 * 
 * Firebase Analytics ile entegre performans izleme sistemi.
 * Custom metrics ve events için wrapper sağlar.
 */

import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';

export interface FirebasePerformanceTracker {
  // Okuma işlemi izleme
  trackRead(collection: string, documentCount: number): void;
  
  // Kural değerlendirme izleme
  trackRuleEvaluation(rulePath: string, evaluationTime: number): void;
  
  // Cache performans izleme
  trackCachePerformance(cacheType: string, operation: string, duration: number): void;
  
  // Özel metrikler
  recordCustomMetric(name: string, value: number, attributes?: Record<string, string>): void;
  
  // Query performance tracking
  trackQueryPerformance(queryType: string, duration: number, resultCount: number): void;
  
  // User interaction tracking
  trackUserInteraction(action: string, component: string, metadata?: Record<string, any>): void;
}

export class PerformanceTracker implements FirebasePerformanceTracker {
  private analytics: Analytics | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeAnalytics();
  }

  private initializeAnalytics(): void {
    try {
      if (typeof window !== 'undefined') {
        this.analytics = getAnalytics();
        this.isInitialized = true;
      }
    } catch (error) {
      console.warn('Firebase Analytics initialization failed:', error);
      this.isInitialized = false;
    }
  }

  trackRead(collection: string, documentCount: number): void {
    if (!this.isInitialized || !this.analytics) return;

    try {
      logEvent(this.analytics, 'firebase_read_operation', {
        collection_name: collection,
        document_count: documentCount,
        timestamp: Date.now(),
        session_id: this.getSessionId()
      });
    } catch (error) {
      console.warn('Failed to track Firebase read:', error);
    }
  }

  trackRuleEvaluation(rulePath: string, evaluationTime: number): void {
    if (!this.isInitialized || !this.analytics) return;

    try {
      logEvent(this.analytics, 'security_rule_evaluation', {
        rule_path: rulePath,
        evaluation_duration_ms: evaluationTime,
        timestamp: Date.now(),
        session_id: this.getSessionId()
      });
    } catch (error) {
      console.warn('Failed to track rule evaluation:', error);
    }
  }

  trackCachePerformance(cacheType: string, operation: string, duration: number): void {
    if (!this.isInitialized || !this.analytics) return;

    try {
      logEvent(this.analytics, 'cache_performance', {
        cache_type: cacheType,
        operation_type: operation,
        duration_ms: duration,
        timestamp: Date.now(),
        session_id: this.getSessionId()
      });
    } catch (error) {
      console.warn('Failed to track cache performance:', error);
    }
  }

  recordCustomMetric(name: string, value: number, attributes?: Record<string, string>): void {
    if (!this.isInitialized || !this.analytics) return;

    try {
      const eventData: Record<string, any> = {
        metric_name: name,
        metric_value: value,
        timestamp: Date.now(),
        session_id: this.getSessionId(),
        ...attributes
      };

      logEvent(this.analytics, 'custom_performance_metric', eventData);
    } catch (error) {
      console.warn('Failed to record custom metric:', error);
    }
  }

  trackQueryPerformance(queryType: string, duration: number, resultCount: number): void {
    if (!this.isInitialized || !this.analytics) return;

    try {
      logEvent(this.analytics, 'query_performance', {
        query_type: queryType,
        execution_duration_ms: duration,
        result_count: resultCount,
        timestamp: Date.now(),
        session_id: this.getSessionId()
      });
    } catch (error) {
      console.warn('Failed to track query performance:', error);
    }
  }

  trackUserInteraction(action: string, component: string, metadata?: Record<string, any>): void {
    if (!this.isInitialized || !this.analytics) return;

    try {
      const eventData: Record<string, any> = {
        action_type: action,
        component_name: component,
        timestamp: Date.now(),
        session_id: this.getSessionId(),
        ...metadata
      };

      logEvent(this.analytics, 'user_interaction', eventData);
    } catch (error) {
      console.warn('Failed to track user interaction:', error);
    }
  }

  private getSessionId(): string {
    // Generate or retrieve session ID for tracking
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('performance_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('performance_session_id', sessionId);
      }
      return sessionId;
    }
    return 'server_session';
  }
}

// Performance tracking utilities
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    return duration;
  }

  endAndTrack(tracker: FirebasePerformanceTracker, attributes?: Record<string, string>): number {
    const duration = this.end();
    tracker.recordCustomMetric(`${this.label}_duration`, duration, attributes);
    return duration;
  }
}

// Decorator for automatic performance tracking
export function trackPerformance(metricName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const timer = new PerformanceTimer(metricName);
      
      try {
        const result = await method.apply(this, args);
        const duration = timer.end();
        
        // Track successful execution
        if ((this as any).performanceTracker) {
          (this as any).performanceTracker.recordCustomMetric(metricName, duration, {
            status: 'success',
            method: propertyName
          });
        }
        
        return result;
      } catch (error) {
        const duration = timer.end();
        
        // Track failed execution
        if ((this as any).performanceTracker) {
          (this as any).performanceTracker.recordCustomMetric(metricName, duration, {
            status: 'error',
            method: propertyName,
            error_type: error instanceof Error ? error.name : 'unknown'
          });
        }
        
        throw error;
      }
    };
  };
}

// Singleton instance
export const performanceTracker = new PerformanceTracker();