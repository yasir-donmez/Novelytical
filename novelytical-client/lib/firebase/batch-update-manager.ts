/**
 * Batch Update Manager
 * 
 * Bu sistem Firebase real-time listener güncellemelerini toplu halde işler:
 * - Bireysel güncelleme olaylarını minimize etmek için ilgili değişiklikleri toplar
 * - Bellek sızıntısı önleme ile listener cleanup yönetimi
 * - Debounce ve throttling ile performans optimizasyonu
 * - Error handling ve retry mekanizmaları
 */

import { DocumentChange, FirestoreError } from 'firebase/firestore';

// Interfaces for batch update management
export interface BatchUpdateItem {
  id: string;
  type: 'added' | 'modified' | 'removed';
  data: any;
  timestamp: Date;
  source: string; // Source listener/query identifier
  retryCount: number;
}

export interface BatchUpdateGroup {
  groupId: string;
  source: string;
  updates: BatchUpdateItem[];
  createdAt: Date;
  lastModified: Date;
  processingState: 'pending' | 'processing' | 'completed' | 'failed';
  errorCount: number;
}

export interface BatchProcessingOptions {
  batchSize: number; // Maximum items per batch
  debounceMs: number; // Debounce delay for batching
  throttleMs: number; // Throttle interval for processing
  maxRetries: number; // Maximum retry attempts
  errorThreshold: number; // Error threshold before circuit breaker
  cleanupInterval: number; // Cleanup interval for old batches
}

export interface BatchUpdateCallback {
  (updates: BatchUpdateItem[], metadata: BatchUpdateMetadata): void;
}

export interface BatchUpdateMetadata {
  groupId: string;
  source: string;
  totalUpdates: number;
  processingTime: number;
  isRetry: boolean;
  errorCount: number;
}

export interface BatchUpdateMetrics {
  totalBatches: number;
  totalUpdates: number;
  averageBatchSize: number;
  averageProcessingTime: number;
  errorRate: number;
  memoryUsage: number;
  activeGroups: number;
}

// Default batch processing options
const DEFAULT_BATCH_OPTIONS: BatchProcessingOptions = {
  batchSize: 50, // Process up to 50 updates per batch
  debounceMs: 100, // Wait 100ms for more updates
  throttleMs: 50, // Process batches every 50ms
  maxRetries: 3, // Retry failed batches up to 3 times
  errorThreshold: 5, // Circuit breaker after 5 consecutive errors
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
};

/**
 * Batch Update Manager Class
 * 
 * Firebase real-time güncellemelerini toplu halde işleyen sistem
 */
export class BatchUpdateManager {
  private updateGroups = new Map<string, BatchUpdateGroup>(); // Active batch groups
  private callbacks = new Map<string, BatchUpdateCallback>(); // Registered callbacks
  private debounceTimers = new Map<string, NodeJS.Timeout>(); // Debounce timers
  private throttleTimers = new Map<string, NodeJS.Timeout>(); // Throttle timers
  private cleanupTimer: NodeJS.Timeout | null = null; // Cleanup timer
  private circuitBreaker = new Map<string, number>(); // Circuit breaker state
  private options: BatchProcessingOptions;
  private metrics: BatchUpdateMetrics = {
    totalBatches: 0,
    totalUpdates: 0,
    averageBatchSize: 0,
    averageProcessingTime: 0,
    errorRate: 0,
    memoryUsage: 0,
    activeGroups: 0
  };

  constructor(options: Partial<BatchProcessingOptions> = {}) {
    this.options = { ...DEFAULT_BATCH_OPTIONS, ...options };
    this.startCleanupTimer();
  }

  /**
   * Register callback for batch updates from specific source
   * Requirement 7.2: Efficient update handling
   */
  registerCallback(source: string, callback: BatchUpdateCallback): void {
    this.callbacks.set(source, callback);
  }

  /**
   * Unregister callback for specific source
   * Requirement 7.3: Listener cleanup management
   */
  unregisterCallback(source: string): void {
    this.callbacks.delete(source);
    
    // Clear related timers
    this.clearTimersForSource(source);
    
    // Remove related update groups
    for (const [groupId, group] of this.updateGroups.entries()) {
      if (group.source === source) {
        this.updateGroups.delete(groupId);
      }
    }
    
    // Reset circuit breaker
    this.circuitBreaker.delete(source);
  }

  /**
   * Add update to batch processing queue
   * Requirement 7.2: Batch related changes to minimize individual update events
   */
  addUpdate(
    source: string,
    type: 'added' | 'modified' | 'removed',
    id: string,
    data: any
  ): void {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(source)) {
      console.warn(`Circuit breaker open for source: ${source}`);
      return;
    }

    // Create update item
    const updateItem: BatchUpdateItem = {
      id,
      type,
      data,
      timestamp: new Date(),
      source,
      retryCount: 0
    };

    // Add to appropriate group
    this.addToGroup(source, updateItem);
    
    // Schedule batch processing with debounce
    this.scheduleBatchProcessing(source);
  }

  /**
   * Process Firebase document changes as batch
   * Requirement 7.2: Process related changes efficiently
   */
  processDocumentChanges(source: string, changes: DocumentChange[]): void {
    if (changes.length === 0) return;

    // Convert document changes to batch updates
    changes.forEach(change => {
      this.addUpdate(
        source,
        change.type,
        change.doc.id,
        {
          ...change.doc.data(),
          _firestore_id: change.doc.id,
          _change_type: change.type,
          _old_index: change.oldIndex,
          _new_index: change.newIndex
        }
      );
    });
  }

  /**
   * Add update to appropriate batch group
   */
  private addToGroup(source: string, update: BatchUpdateItem): void {
    // Find or create group for this source
    let group = this.findActiveGroup(source);
    
    if (!group) {
      const groupId = this.generateGroupId(source);
      group = {
        groupId,
        source,
        updates: [],
        createdAt: new Date(),
        lastModified: new Date(),
        processingState: 'pending',
        errorCount: 0
      };
      this.updateGroups.set(groupId, group);
      this.metrics.activeGroups++;
    }

    // Add update to group
    group.updates.push(update);
    group.lastModified = new Date();
    
    // Check if group is ready for processing
    if (group.updates.length >= this.options.batchSize) {
      this.processBatchGroup(group.groupId);
    }
  }

  /**
   * Find active group for source that's not full
   */
  private findActiveGroup(source: string): BatchUpdateGroup | null {
    for (const group of this.updateGroups.values()) {
      if (
        group.source === source &&
        group.processingState === 'pending' &&
        group.updates.length < this.options.batchSize
      ) {
        return group;
      }
    }
    return null;
  }

  /**
   * Schedule batch processing with debounce
   * Requirement 7.2: Debounce rapid updates
   */
  private scheduleBatchProcessing(source: string): void {
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(source);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processAllPendingGroups(source);
    }, this.options.debounceMs);

    this.debounceTimers.set(source, timer);
  }

  /**
   * Process all pending groups for source
   */
  private processAllPendingGroups(source: string): void {
    const pendingGroups = Array.from(this.updateGroups.values())
      .filter(group => 
        group.source === source && 
        group.processingState === 'pending' &&
        group.updates.length > 0
      );

    pendingGroups.forEach(group => {
      this.processBatchGroup(group.groupId);
    });
  }

  /**
   * Process specific batch group
   * Requirement 7.2: Efficient batch processing
   */
  private async processBatchGroup(groupId: string): Promise<void> {
    const group = this.updateGroups.get(groupId);
    if (!group || group.processingState !== 'pending') return;

    const callback = this.callbacks.get(group.source);
    if (!callback) {
      console.warn(`No callback registered for source: ${group.source}`);
      return;
    }

    // Mark as processing
    group.processingState = 'processing';
    const startTime = Date.now();

    try {
      // Create batch metadata
      const metadata: BatchUpdateMetadata = {
        groupId: group.groupId,
        source: group.source,
        totalUpdates: group.updates.length,
        processingTime: 0,
        isRetry: group.errorCount > 0,
        errorCount: group.errorCount
      };

      // Process batch with throttling
      await this.throttledProcess(group.source, () => {
        callback(group.updates, metadata);
      });

      // Update processing time
      const processingTime = Date.now() - startTime;
      metadata.processingTime = processingTime;

      // Mark as completed
      group.processingState = 'completed';
      
      // Update metrics
      this.updateMetrics(group, processingTime, false);
      
      // Schedule cleanup
      setTimeout(() => {
        this.updateGroups.delete(groupId);
        this.metrics.activeGroups--;
      }, 1000);

    } catch (error) {
      console.error('Batch processing error:', error);
      
      // Handle error
      group.errorCount++;
      group.processingState = 'failed';
      
      // Update metrics
      this.updateMetrics(group, Date.now() - startTime, true);
      
      // Retry if within limits
      if (group.errorCount <= this.options.maxRetries) {
        setTimeout(() => {
          group.processingState = 'pending';
          this.processBatchGroup(groupId);
        }, Math.pow(2, group.errorCount) * 1000); // Exponential backoff
      } else {
        // Update circuit breaker
        this.updateCircuitBreaker(group.source);
      }
    }
  }

  /**
   * Throttled processing to prevent overwhelming
   */
  private async throttledProcess(source: string, processor: () => void): Promise<void> {
    return new Promise((resolve) => {
      const existingThrottle = this.throttleTimers.get(source);
      
      if (existingThrottle) {
        // Already throttling, queue this process
        setTimeout(() => {
          processor();
          resolve();
        }, this.options.throttleMs);
      } else {
        // Process immediately and set throttle
        processor();
        
        const throttleTimer = setTimeout(() => {
          this.throttleTimers.delete(source);
        }, this.options.throttleMs);
        
        this.throttleTimers.set(source, throttleTimer);
        resolve();
      }
    });
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(group: BatchUpdateGroup, processingTime: number, isError: boolean): void {
    this.metrics.totalBatches++;
    this.metrics.totalUpdates += group.updates.length;
    
    // Update average batch size
    this.metrics.averageBatchSize = this.metrics.totalUpdates / this.metrics.totalBatches;
    
    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime + processingTime) / 2;
    
    // Update error rate
    if (isError) {
      const errorCount = this.metrics.totalBatches * this.metrics.errorRate + 1;
      this.metrics.errorRate = errorCount / this.metrics.totalBatches;
    } else {
      const errorCount = this.metrics.totalBatches * this.metrics.errorRate;
      this.metrics.errorRate = errorCount / this.metrics.totalBatches;
    }
    
    // Update memory usage (approximate)
    this.metrics.memoryUsage = this.updateGroups.size * 1024 + 
      Array.from(this.updateGroups.values())
        .reduce((sum, g) => sum + g.updates.length * 256, 0);
  }

  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen(source: string): boolean {
    const errorCount = this.circuitBreaker.get(source) || 0;
    return errorCount >= this.options.errorThreshold;
  }

  private updateCircuitBreaker(source: string): void {
    const currentCount = this.circuitBreaker.get(source) || 0;
    this.circuitBreaker.set(source, currentCount + 1);
    
    // Auto-reset circuit breaker after timeout
    setTimeout(() => {
      this.circuitBreaker.set(source, 0);
    }, 60000); // Reset after 1 minute
  }

  /**
   * Clear all timers for specific source
   * Requirement 7.3: Proper cleanup to prevent memory leaks
   */
  private clearTimersForSource(source: string): void {
    const debounceTimer = this.debounceTimers.get(source);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      this.debounceTimers.delete(source);
    }

    const throttleTimer = this.throttleTimers.get(source);
    if (throttleTimer) {
      clearTimeout(throttleTimer);
      this.throttleTimers.delete(source);
    }
  }

  /**
   * Start periodic cleanup timer
   * Requirement 7.3: Memory leak prevention
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Perform periodic cleanup of old batch groups
   */
  private performCleanup(): void {
    const now = Date.now();
    const cleanupThreshold = 10 * 60 * 1000; // 10 minutes
    
    for (const [groupId, group] of this.updateGroups.entries()) {
      const age = now - group.createdAt.getTime();
      
      if (
        age > cleanupThreshold &&
        (group.processingState === 'completed' || group.processingState === 'failed')
      ) {
        this.updateGroups.delete(groupId);
        this.metrics.activeGroups--;
      }
    }
  }

  /**
   * Generate unique group ID
   */
  private generateGroupId(source: string): string {
    return `batch_${source}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get batch processing metrics
   */
  getMetrics(): BatchUpdateMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active batch groups (for debugging)
   */
  getActiveGroups(): BatchUpdateGroup[] {
    return Array.from(this.updateGroups.values());
  }

  /**
   * Force process all pending batches
   */
  flushAll(): void {
    const pendingGroups = Array.from(this.updateGroups.values())
      .filter(group => group.processingState === 'pending');
    
    pendingGroups.forEach(group => {
      this.processBatchGroup(group.groupId);
    });
  }

  /**
   * Complete cleanup and shutdown
   * Requirement 7.3: Complete resource cleanup
   */
  cleanup(): void {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.clear();
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear all data structures
    this.updateGroups.clear();
    this.callbacks.clear();
    this.circuitBreaker.clear();

    // Reset metrics
    this.metrics = {
      totalBatches: 0,
      totalUpdates: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      activeGroups: 0
    };
  }
}

// Singleton instance
export const batchUpdateManager = new BatchUpdateManager();

// Helper function to create batch update manager with custom options
export const createBatchUpdateManager = (options: Partial<BatchProcessingOptions> = {}) => {
  return new BatchUpdateManager(options);
};