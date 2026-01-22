/**
 * Error Recovery Manager
 * 
 * Provides comprehensive error monitoring, classification, and recovery strategies
 * including circuit breaker pattern, exponential backoff, and graceful degradation.
 */

export interface ErrorClassification {
  type: 'network' | 'timeout' | 'permission' | 'quota' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryable: boolean;
}

export interface RecoveryStrategy {
  name: string;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  jitterEnabled: boolean;
  circuitBreakerEnabled: boolean;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  circuitBreakerTrips: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  minimumRequests: number;
}

export interface CircuitBreakerMetrics {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextAttemptTime: number;
  totalRequests: number;
  failureRate: number;
}

export const DEFAULT_RECOVERY_STRATEGIES: Record<string, RecoveryStrategy> = {
  network: {
    name: 'Network Error Recovery',
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBackoff: true,
    jitterEnabled: true,
    circuitBreakerEnabled: true
  },
  timeout: {
    name: 'Timeout Recovery',
    maxRetries: 2,
    baseDelayMs: 2000,
    maxDelayMs: 8000,
    exponentialBackoff: true,
    jitterEnabled: false,
    circuitBreakerEnabled: true
  },
  permission: {
    name: 'Permission Error Recovery',
    maxRetries: 1,
    baseDelayMs: 5000,
    maxDelayMs: 5000,
    exponentialBackoff: false,
    jitterEnabled: false,
    circuitBreakerEnabled: false
  },
  quota: {
    name: 'Quota Error Recovery',
    maxRetries: 5,
    baseDelayMs: 30000,
    maxDelayMs: 300000,
    exponentialBackoff: true,
    jitterEnabled: true,
    circuitBreakerEnabled: true
  },
  unknown: {
    name: 'Generic Error Recovery',
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    exponentialBackoff: true,
    jitterEnabled: true,
    circuitBreakerEnabled: false
  }
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringWindow: 300000, // 5 minutes
  minimumRequests: 10
};

export class ErrorRecoveryManager {
  private errorHistory: Array<{
    timestamp: number;
    error: Error;
    classification: ErrorClassification;
    operation: string;
    recoveryAttempted: boolean;
    recoverySuccessful: boolean;
    recoveryTime?: number;
  }> = [];

  private circuitBreakers = new Map<string, CircuitBreakerMetrics>();
  private recoveryStrategies = new Map<string, RecoveryStrategy>();
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsBySeverity: {},
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    averageRecoveryTime: 0,
    circuitBreakerTrips: 0
  };

  constructor(
    private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
    customStrategies?: Record<string, RecoveryStrategy>
  ) {
    // Initialize recovery strategies
    for (const [type, strategy] of Object.entries(DEFAULT_RECOVERY_STRATEGIES)) {
      this.recoveryStrategies.set(type, strategy);
    }
    
    if (customStrategies) {
      for (const [type, strategy] of Object.entries(customStrategies)) {
        this.recoveryStrategies.set(type, strategy);
      }
    }
  }

  /**
   * Classify an error based on its characteristics
   */
  classifyError(error: Error, context?: any): ErrorClassification {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || name.includes('networkerror')) {
      return {
        type: 'network',
        severity: 'medium',
        recoverable: true,
        retryable: true
      };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out') ||
        name.includes('timeouterror')) {
      return {
        type: 'timeout',
        severity: 'medium',
        recoverable: true,
        retryable: true
      };
    }

    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized') ||
        message.includes('forbidden') || message.includes('403') ||
        message.includes('401')) {
      return {
        type: 'permission',
        severity: 'high',
        recoverable: false,
        retryable: false
      };
    }

    // Quota errors
    if (message.includes('quota') || message.includes('rate limit') ||
        message.includes('too many requests') || message.includes('429')) {
      return {
        type: 'quota',
        severity: 'medium',
        recoverable: true,
        retryable: true
      };
    }

    // Default classification
    return {
      type: 'unknown',
      severity: 'medium',
      recoverable: true,
      retryable: true
    };
  }

  /**
   * Record an error and update metrics
   */
  recordError(error: Error, operation: string, context?: any): ErrorClassification {
    const classification = this.classifyError(error, context);
    const timestamp = Date.now();

    // Add to error history
    this.errorHistory.push({
      timestamp,
      error,
      classification,
      operation,
      recoveryAttempted: false,
      recoverySuccessful: false
    });

    // Update metrics
    this.metrics.totalErrors++;
    this.metrics.errorsByType[classification.type] = (this.metrics.errorsByType[classification.type] || 0) + 1;
    this.metrics.errorsBySeverity[classification.severity] = (this.metrics.errorsBySeverity[classification.severity] || 0) + 1;

    // Update circuit breaker
    this.updateCircuitBreaker(operation, false);

    // Clean up old history
    this.cleanupHistory();

    return classification;
  }

  /**
   * Record a successful operation
   */
  recordSuccess(operation: string): void {
    this.updateCircuitBreaker(operation, true);
  }

  /**
   * Check if circuit breaker allows operation
   */
  isOperationAllowed(operation: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(operation);
    if (!circuitBreaker) return true;

    const now = Date.now();

    switch (circuitBreaker.state) {
      case 'closed':
        return true;
      
      case 'open':
        if (now >= circuitBreaker.nextAttemptTime) {
          // Transition to half-open
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

  /**
   * Execute operation with recovery strategy
   */
  async executeWithRecovery<T>(
    operation: string,
    fn: () => Promise<T>,
    customStrategy?: Partial<RecoveryStrategy>
  ): Promise<T> {
    if (!this.isOperationAllowed(operation)) {
      throw new Error(`Circuit breaker is open for operation: ${operation}`);
    }

    const errorClassification = this.classifyError(new Error('placeholder'));
    const strategy = customStrategy 
      ? { ...this.getRecoveryStrategy(errorClassification.type), ...customStrategy }
      : this.getRecoveryStrategy(errorClassification.type);

    let lastError: Error | null = null;
    let attempt = 0;
    const startTime = Date.now();

    while (attempt <= strategy.maxRetries) {
      try {
        const result = await fn();
        
        // Record success
        this.recordSuccess(operation);
        
        // Update recovery metrics if this was a retry
        if (attempt > 0) {
          this.updateRecoveryMetrics(true, Date.now() - startTime);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        const classification = this.recordError(lastError, operation);
        
        attempt++;
        
        // Check if error is retryable
        if (!classification.retryable || attempt > strategy.maxRetries) {
          this.updateRecoveryMetrics(false, Date.now() - startTime);
          throw lastError;
        }
        
        // Calculate delay for next attempt
        if (attempt <= strategy.maxRetries) {
          const delay = this.calculateDelay(attempt, strategy);
          await this.sleep(delay);
        }
      }
    }

    this.updateRecoveryMetrics(false, Date.now() - startTime);
    throw lastError || new Error(`Operation ${operation} failed after ${strategy.maxRetries} retries`);
  }

  /**
   * Get recovery strategy for error type
   */
  getRecoveryStrategy(errorType: string): RecoveryStrategy {
    return this.recoveryStrategies.get(errorType) || this.recoveryStrategies.get('unknown')!;
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get circuit breaker status for operation
   */
  getCircuitBreakerStatus(operation: string): CircuitBreakerMetrics | null {
    return this.circuitBreakers.get(operation) || null;
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllCircuitBreakerStatuses(): Map<string, CircuitBreakerMetrics> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Reset circuit breaker for operation
   */
  resetCircuitBreaker(operation: string): void {
    this.circuitBreakers.delete(operation);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  /**
   * Get error history
   */
  getErrorHistory(limit?: number): typeof this.errorHistory {
    const history = [...this.errorHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get error trends over time
   */
  getErrorTrends(windowMs: number = 3600000): {
    timestamp: number;
    errorCount: number;
    errorRate: number;
  }[] {
    const now = Date.now();
    const trends: { timestamp: number; errorCount: number; errorRate: number }[] = [];
    const bucketSize = windowMs / 10; // 10 buckets
    
    for (let i = 9; i >= 0; i--) {
      const bucketStart = now - (i + 1) * bucketSize;
      const bucketEnd = now - i * bucketSize;
      
      const errorsInBucket = this.errorHistory.filter(
        entry => entry.timestamp >= bucketStart && entry.timestamp < bucketEnd
      ).length;
      
      trends.push({
        timestamp: bucketEnd,
        errorCount: errorsInBucket,
        errorRate: errorsInBucket / (bucketSize / 1000) // errors per second
      });
    }
    
    return trends;
  }

  // Private methods

  private updateCircuitBreaker(operation: string, success: boolean): void {
    let circuitBreaker = this.circuitBreakers.get(operation);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
        nextAttemptTime: 0,
        totalRequests: 0,
        failureRate: 0
      };
      this.circuitBreakers.set(operation, circuitBreaker);
    }

    const now = Date.now();
    circuitBreaker.totalRequests++;

    if (success) {
      circuitBreaker.successCount++;
      circuitBreaker.lastSuccessTime = now;
      
      if (circuitBreaker.state === 'half-open') {
        // Successful request in half-open state - close the circuit
        circuitBreaker.state = 'closed';
        circuitBreaker.failureCount = 0;
      }
    } else {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = now;
      
      // Calculate failure rate
      const windowStart = now - this.config.monitoringWindow;
      const recentRequests = Math.max(circuitBreaker.totalRequests, this.config.minimumRequests);
      circuitBreaker.failureRate = circuitBreaker.failureCount / recentRequests;
      
      // Check if we should open the circuit
      if (circuitBreaker.state === 'closed' && 
          circuitBreaker.failureCount >= this.config.failureThreshold &&
          circuitBreaker.totalRequests >= this.config.minimumRequests) {
        circuitBreaker.state = 'open';
        circuitBreaker.nextAttemptTime = now + this.config.recoveryTimeout;
        this.metrics.circuitBreakerTrips++;
      } else if (circuitBreaker.state === 'half-open') {
        // Failure in half-open state - back to open
        circuitBreaker.state = 'open';
        circuitBreaker.nextAttemptTime = now + this.config.recoveryTimeout;
      }
    }
  }

  private updateRecoveryMetrics(successful: boolean, recoveryTime: number): void {
    this.metrics.recoveryAttempts++;
    
    if (successful) {
      this.metrics.successfulRecoveries++;
    } else {
      this.metrics.failedRecoveries++;
    }
    
    // Update average recovery time
    const totalRecoveryTime = this.metrics.averageRecoveryTime * (this.metrics.recoveryAttempts - 1) + recoveryTime;
    this.metrics.averageRecoveryTime = totalRecoveryTime / this.metrics.recoveryAttempts;
  }

  private calculateDelay(attempt: number, strategy: RecoveryStrategy): number {
    let delay = strategy.baseDelayMs;
    
    if (strategy.exponentialBackoff) {
      delay = Math.min(strategy.baseDelayMs * Math.pow(2, attempt - 1), strategy.maxDelayMs);
    }
    
    if (strategy.jitterEnabled) {
      // Add random jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      delay = Math.max(0, delay + jitter);
    }
    
    return Math.round(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanupHistory(): void {
    const maxHistorySize = 1000;
    if (this.errorHistory.length > maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-maxHistorySize);
    }
  }
}

// Singleton instance
let errorRecoveryManagerInstance: ErrorRecoveryManager | null = null;

/**
 * Get the global error recovery manager instance
 */
export function getErrorRecoveryManager(
  config?: CircuitBreakerConfig,
  customStrategies?: Record<string, RecoveryStrategy>
): ErrorRecoveryManager {
  if (!errorRecoveryManagerInstance) {
    errorRecoveryManagerInstance = new ErrorRecoveryManager(config, customStrategies);
  }
  return errorRecoveryManagerInstance;
}

/**
 * Reset the error recovery manager instance (useful for testing)
 */
export function resetErrorRecoveryManager(): void {
  errorRecoveryManagerInstance = null;
}