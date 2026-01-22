/**
 * Error Recovery Manager Tests
 * 
 * Unit tests for error monitoring, classification, circuit breaker pattern,
 * exponential backoff retry mechanism, and graceful degradation scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  ErrorRecoveryManager, 
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RECOVERY_STRATEGIES 
} from '../error-recovery-manager';

describe('Error Recovery Manager', () => {
  let errorRecoveryManager: ErrorRecoveryManager;

  beforeEach(() => {
    errorRecoveryManager = new ErrorRecoveryManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Network request failed');
      const classification = errorRecoveryManager.classifyError(networkError);

      expect(classification.type).toBe('network');
      expect(classification.severity).toBe('medium');
      expect(classification.recoverable).toBe(true);
      expect(classification.retryable).toBe(true);
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Request timed out');
      const classification = errorRecoveryManager.classifyError(timeoutError);

      expect(classification.type).toBe('timeout');
      expect(classification.severity).toBe('medium');
      expect(classification.recoverable).toBe(true);
      expect(classification.retryable).toBe(true);
    });

    it('should classify permission errors correctly', () => {
      const permissionError = new Error('Unauthorized access - 401');
      const classification = errorRecoveryManager.classifyError(permissionError);

      expect(classification.type).toBe('permission');
      expect(classification.severity).toBe('high');
      expect(classification.recoverable).toBe(false);
      expect(classification.retryable).toBe(false);
    });

    it('should classify quota errors correctly', () => {
      const quotaError = new Error('Rate limit exceeded - too many requests');
      const classification = errorRecoveryManager.classifyError(quotaError);

      expect(classification.type).toBe('quota');
      expect(classification.severity).toBe('medium');
      expect(classification.recoverable).toBe(true);
      expect(classification.retryable).toBe(true);
    });

    it('should classify unknown errors with default classification', () => {
      const unknownError = new Error('Something went wrong');
      const classification = errorRecoveryManager.classifyError(unknownError);

      expect(classification.type).toBe('unknown');
      expect(classification.severity).toBe('medium');
      expect(classification.recoverable).toBe(true);
      expect(classification.retryable).toBe(true);
    });
  });

  describe('Error Recording and Metrics', () => {
    it('should record errors and update metrics', () => {
      const error1 = new Error('Network error');
      const error2 = new Error('Timeout error');
      const error3 = new Error('Network error');

      errorRecoveryManager.recordError(error1, 'test_operation_1');
      errorRecoveryManager.recordError(error2, 'test_operation_2');
      errorRecoveryManager.recordError(error3, 'test_operation_1');

      const metrics = errorRecoveryManager.getMetrics();

      expect(metrics.totalErrors).toBe(3);
      expect(metrics.errorsByType.network).toBe(2);
      expect(metrics.errorsByType.timeout).toBe(1);
      expect(metrics.errorsBySeverity.medium).toBe(3);
    });

    it('should maintain error history', () => {
      const error = new Error('Test error');
      errorRecoveryManager.recordError(error, 'test_operation');

      const history = errorRecoveryManager.getErrorHistory();

      expect(history.length).toBe(1);
      expect(history[0].error.message).toBe('Test error');
      expect(history[0].operation).toBe('test_operation');
      expect(history[0].recoveryAttempted).toBe(false);
      expect(history[0].recoverySuccessful).toBe(false);
    });

    it('should limit error history size', () => {
      // Add more than 1000 errors to test cleanup
      for (let i = 0; i < 1100; i++) {
        const error = new Error(`Error ${i}`);
        errorRecoveryManager.recordError(error, 'test_operation');
      }

      const history = errorRecoveryManager.getErrorHistory();
      expect(history.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should allow operations when circuit is closed', () => {
      const isAllowed = errorRecoveryManager.isOperationAllowed('test_operation');
      expect(isAllowed).toBe(true);
    });

    it('should open circuit breaker after threshold failures', () => {
      const operation = 'test_operation';
      
      // Record failures to reach threshold (default is 5)
      for (let i = 0; i < 5; i++) {
        const error = new Error(`Failure ${i}`);
        errorRecoveryManager.recordError(error, operation);
      }

      // Circuit should still be closed as we need minimum requests
      let isAllowed = errorRecoveryManager.isOperationAllowed(operation);
      expect(isAllowed).toBe(true);

      // Add more requests to meet minimum threshold
      for (let i = 0; i < 10; i++) {
        const error = new Error(`Failure ${i + 5}`);
        errorRecoveryManager.recordError(error, operation);
      }

      // Now circuit should be open
      isAllowed = errorRecoveryManager.isOperationAllowed(operation);
      expect(isAllowed).toBe(false);

      const status = errorRecoveryManager.getCircuitBreakerStatus(operation);
      expect(status?.state).toBe('open');
    });

    it('should transition to half-open after recovery timeout', async () => {
      const operation = 'test_operation';
      const shortConfig = {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        recoveryTimeout: 100, // 100ms for testing
        minimumRequests: 2,
        failureThreshold: 2
      };
      
      const manager = new ErrorRecoveryManager(shortConfig);

      // Trigger circuit breaker
      for (let i = 0; i < 4; i++) {
        const error = new Error(`Failure ${i}`);
        manager.recordError(error, operation);
      }

      // Circuit should be open
      expect(manager.isOperationAllowed(operation)).toBe(false);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Circuit should transition to half-open
      expect(manager.isOperationAllowed(operation)).toBe(true);
      
      const status = manager.getCircuitBreakerStatus(operation);
      expect(status?.state).toBe('half-open');
    });

    it('should close circuit after successful operation in half-open state', async () => {
      const operation = 'test_operation';
      const shortConfig = {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        recoveryTimeout: 50,
        minimumRequests: 2,
        failureThreshold: 2
      };
      
      const manager = new ErrorRecoveryManager(shortConfig);

      // Trigger circuit breaker
      for (let i = 0; i < 4; i++) {
        const error = new Error(`Failure ${i}`);
        manager.recordError(error, operation);
      }

      // Verify circuit is open
      expect(manager.isOperationAllowed(operation)).toBe(false);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify circuit is half-open
      expect(manager.isOperationAllowed(operation)).toBe(true);
      let status = manager.getCircuitBreakerStatus(operation);
      expect(status?.state).toBe('half-open');

      // Record successful operation
      manager.recordSuccess(operation);

      status = manager.getCircuitBreakerStatus(operation);
      expect(status?.state).toBe('closed');
    });

    it('should reset circuit breaker', () => {
      const operation = 'test_operation';
      
      // Trigger some failures
      for (let i = 0; i < 3; i++) {
        const error = new Error(`Failure ${i}`);
        errorRecoveryManager.recordError(error, operation);
      }

      // Reset circuit breaker
      errorRecoveryManager.resetCircuitBreaker(operation);

      const status = errorRecoveryManager.getCircuitBreakerStatus(operation);
      expect(status).toBeNull();
    });
  });

  describe('Exponential Backoff Retry Mechanism', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return 'success';
      });

      const result = await errorRecoveryManager.executeWithRecovery(
        'test_operation',
        mockOperation
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      
      const metrics = errorRecoveryManager.getMetrics();
      expect(metrics.successfulRecoveries).toBe(1);
    });

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(
        errorRecoveryManager.executeWithRecovery('test_operation', mockOperation)
      ).rejects.toThrow('Persistent error');

      // Should try initial + maxRetries (default is 2 for unknown errors)
      expect(mockOperation).toHaveBeenCalledTimes(3);
      
      const metrics = errorRecoveryManager.getMetrics();
      expect(metrics.failedRecoveries).toBe(1);
    });

    it('should not retry non-retryable errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Unauthorized - 401'));

      await expect(
        errorRecoveryManager.executeWithRecovery('test_operation', mockOperation)
      ).rejects.toThrow('Unauthorized - 401');

      // Should only try once for permission errors
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use custom recovery strategy', async () => {
      const customStrategy = {
        maxRetries: 5,
        baseDelayMs: 100,
        exponentialBackoff: false
      };

      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 4) {
          throw new Error('Network error');
        }
        return 'success';
      });

      const result = await errorRecoveryManager.executeWithRecovery(
        'test_operation',
        mockOperation,
        customStrategy
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(4);
    });

    it('should respect circuit breaker in retry mechanism', async () => {
      const operation = 'test_operation';
      const shortConfig = {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        minimumRequests: 1,
        failureThreshold: 1
      };
      
      const manager = new ErrorRecoveryManager(shortConfig);
      
      // First operation fails and opens circuit
      const mockOperation1 = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(
        manager.executeWithRecovery(operation, mockOperation1)
      ).rejects.toThrow();

      // Second operation should fail immediately due to open circuit
      const mockOperation2 = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(
        manager.executeWithRecovery(operation, mockOperation2)
      ).rejects.toThrow('Circuit breaker is open');

      // Second operation should not be called
      expect(mockOperation2).not.toHaveBeenCalled();
    });
  });

  describe('Recovery Strategies', () => {
    it('should have default recovery strategies for all error types', () => {
      const networkStrategy = errorRecoveryManager.getRecoveryStrategy('network');
      const timeoutStrategy = errorRecoveryManager.getRecoveryStrategy('timeout');
      const permissionStrategy = errorRecoveryManager.getRecoveryStrategy('permission');
      const quotaStrategy = errorRecoveryManager.getRecoveryStrategy('quota');
      const unknownStrategy = errorRecoveryManager.getRecoveryStrategy('unknown');

      expect(networkStrategy.name).toBe('Network Error Recovery');
      expect(timeoutStrategy.name).toBe('Timeout Recovery');
      expect(permissionStrategy.name).toBe('Permission Error Recovery');
      expect(quotaStrategy.name).toBe('Quota Error Recovery');
      expect(unknownStrategy.name).toBe('Generic Error Recovery');
    });

    it('should allow custom recovery strategies', () => {
      const customStrategies = {
        custom: {
          name: 'Custom Strategy',
          maxRetries: 10,
          baseDelayMs: 500,
          maxDelayMs: 5000,
          exponentialBackoff: true,
          jitterEnabled: false,
          circuitBreakerEnabled: true
        }
      };

      const manager = new ErrorRecoveryManager(DEFAULT_CIRCUIT_BREAKER_CONFIG, customStrategies);
      const customStrategy = manager.getRecoveryStrategy('custom');

      expect(customStrategy.name).toBe('Custom Strategy');
      expect(customStrategy.maxRetries).toBe(10);
    });
  });

  describe('Error Trends and Analytics', () => {
    it('should provide error trends over time', () => {
      // Add errors with current timestamp
      for (let i = 0; i < 5; i++) {
        const error = new Error(`Error ${i}`);
        errorRecoveryManager.recordError(error, 'test_operation');
      }

      const trends = errorRecoveryManager.getErrorTrends(3600000); // 1 hour window
      
      expect(trends).toHaveLength(10); // 10 buckets
      expect(Array.isArray(trends)).toBe(true);
      
      // Each trend should have the required properties
      trends.forEach(trend => {
        expect(trend).toHaveProperty('timestamp');
        expect(trend).toHaveProperty('errorCount');
        expect(trend).toHaveProperty('errorRate');
        expect(typeof trend.timestamp).toBe('number');
        expect(typeof trend.errorCount).toBe('number');
        expect(typeof trend.errorRate).toBe('number');
      });
    });

    it('should provide comprehensive metrics', () => {
      // Add various types of errors
      errorRecoveryManager.recordError(new Error('Network error'), 'op1');
      errorRecoveryManager.recordError(new Error('Timeout error'), 'op2');
      errorRecoveryManager.recordError(new Error('Unauthorized'), 'op3');

      const metrics = errorRecoveryManager.getMetrics();

      expect(metrics.totalErrors).toBe(3);
      expect(metrics.errorsByType.network).toBe(1);
      expect(metrics.errorsByType.timeout).toBe(1);
      expect(metrics.errorsByType.permission).toBe(1);
      expect(metrics.errorsBySeverity.medium).toBe(2);
      expect(metrics.errorsBySeverity.high).toBe(1);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle operations gracefully when circuit is open', async () => {
      const operation = 'test_operation';
      const shortConfig = {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        minimumRequests: 1,
        failureThreshold: 1
      };
      
      const manager = new ErrorRecoveryManager(shortConfig);
      
      // Open the circuit
      const error = new Error('Network error');
      manager.recordError(error, operation);

      // Operation should fail gracefully with circuit breaker message
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      await expect(
        manager.executeWithRecovery(operation, mockOperation)
      ).rejects.toThrow('Circuit breaker is open');

      // Operation should not be executed
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should provide fallback behavior for critical operations', async () => {
      // This test demonstrates how graceful degradation could work
      // In practice, the calling code would catch the circuit breaker error
      // and provide fallback behavior
      
      const operation = 'critical_operation';
      const shortConfig = {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        minimumRequests: 1,
        failureThreshold: 1
      };
      
      const manager = new ErrorRecoveryManager(shortConfig);
      
      // Open the circuit
      manager.recordError(new Error('Network error'), operation);

      const mockOperation = jest.fn().mockResolvedValue('primary_result');
      const fallbackOperation = jest.fn().mockResolvedValue('fallback_result');

      let result;
      try {
        result = await manager.executeWithRecovery(operation, mockOperation);
      } catch (error) {
        if (error.message.includes('Circuit breaker is open')) {
          // Graceful degradation - use fallback
          result = await fallbackOperation();
        } else {
          throw error;
        }
      }

      expect(result).toBe('fallback_result');
      expect(mockOperation).not.toHaveBeenCalled();
      expect(fallbackOperation).toHaveBeenCalled();
    });
  });
});