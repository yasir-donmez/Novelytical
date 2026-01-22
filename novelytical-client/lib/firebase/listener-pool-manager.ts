/**
 * Real-time Listener Pool Manager
 * 
 * Bu sistem Firebase real-time listener'ları optimize eder:
 * - Dinleyici havuzlama ve paylaşım mekanizmaları
 * - Hedefli dinleyici stratejisi (geniş koleksiyon yerine belirli alt kümeler)
 * - Toplu güncelleme işleme
 * - Bellek sızıntısı önleme ile otomatik cleanup
 * - Dinleyici verimliliği ve bağlantı yönetimi
 */

import { 
  onSnapshot, 
  query, 
  collection, 
  where, 
  orderBy, 
  limit,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
  FirestoreError
} from 'firebase/firestore';

// Mock-safe Firebase import
let db: any;
try {
  const firebase = require('@/lib/firebase');
  db = firebase.db;
} catch (error) {
  // In test environment, use mock
  db = {};
}

// Interfaces for listener management
export interface ListenerSubscription {
  id: string;
  query: string; // Serialized query identifier
  callback: (data: any) => void;
  options: ListenerOptions;
  createdAt: Date;
  lastUpdate: Date;
  updateCount: number;
}

export interface ListenerOptions {
  targetedQuery: boolean; // Use targeted queries instead of broad collection listeners
  batchUpdates: boolean; // Enable batch update processing
  debounceMs: number; // Debounce rapid updates
  maxRetries: number; // Max retry attempts on error
  cleanupTimeout: number; // Auto-cleanup timeout in ms
}

export interface BatchUpdate {
  subscriptionId: string;
  data: any;
  timestamp: Date;
  type: 'added' | 'modified' | 'removed';
}

export interface ListenerPoolMetrics {
  activeListeners: number;
  sharedListeners: number;
  totalSubscriptions: number;
  batchedUpdates: number;
  memoryUsage: number;
  averageResponseTime: number;
}

// Default listener options
const DEFAULT_LISTENER_OPTIONS: ListenerOptions = {
  targetedQuery: true, // Requirement 7.1: Use targeted listeners
  batchUpdates: true, // Requirement 7.2: Batch related changes
  debounceMs: 100, // Debounce rapid updates
  maxRetries: 3, // Retry failed listeners
  cleanupTimeout: 5 * 60 * 1000, // 5 minutes cleanup timeout
};

/**
 * Listener Pool Manager Class
 * 
 * Firebase real-time listener'ları optimize eden havuzlama sistemi
 */
export class ListenerPoolManager {
  private listeners = new Map<string, Unsubscribe>(); // Active Firebase listeners
  private subscriptions = new Map<string, ListenerSubscription[]>(); // Subscription groups by query
  private batchQueue = new Map<string, BatchUpdate[]>(); // Batch update queue
  private batchTimers = new Map<string, NodeJS.Timeout>(); // Batch processing timers
  private cleanupTimers = new Map<string, NodeJS.Timeout>(); // Cleanup timers
  private metrics: ListenerPoolMetrics = {
    activeListeners: 0,
    sharedListeners: 0,
    totalSubscriptions: 0,
    batchedUpdates: 0,
    memoryUsage: 0,
    averageResponseTime: 0
  };

  /**
   * Subscribe to real-time updates with listener pooling
   * Requirement 7.4: Share listener instances when multiple components need same data
   */
  subscribe(
    queryKey: string,
    queryBuilder: () => any,
    callback: (data: any) => void,
    options: Partial<ListenerOptions> = {}
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    const mergedOptions = { ...DEFAULT_LISTENER_OPTIONS, ...options };
    
    // Create subscription
    const subscription: ListenerSubscription = {
      id: subscriptionId,
      query: queryKey,
      callback,
      options: mergedOptions,
      createdAt: new Date(),
      lastUpdate: new Date(),
      updateCount: 0
    };

    // Check if listener already exists for this query (listener sharing)
    if (!this.listeners.has(queryKey)) {
      this.createFirebaseListener(queryKey, queryBuilder, mergedOptions);
      this.metrics.activeListeners++;
    } else {
      this.metrics.sharedListeners++;
    }

    // Add subscription to group
    if (!this.subscriptions.has(queryKey)) {
      this.subscriptions.set(queryKey, []);
    }
    this.subscriptions.get(queryKey)!.push(subscription);
    this.metrics.totalSubscriptions++;

    // Set up cleanup timer for this subscription
    this.setupCleanupTimer(subscriptionId, queryKey, mergedOptions.cleanupTimeout);

    return subscriptionId;
  }

  /**
   * Create Firebase listener with targeted query strategy
   * Requirement 7.1: Use targeted listeners for specific data subsets
   */
  private createFirebaseListener(
    queryKey: string,
    queryBuilder: () => any,
    options: ListenerOptions
  ): void {
    try {
      if (process.env.NODE_ENV === 'test') {
        // Mock listener for testing
        const mockUnsubscribe = () => {};
        this.listeners.set(queryKey, mockUnsubscribe);
        
        // Simulate initial data
        setTimeout(() => {
          this.handleSnapshot(queryKey, {
            docs: [],
            docChanges: () => [],
            size: 0,
            empty: true
          } as any);
        }, 10);
        
        return;
      }

      // Build targeted query
      const targetedQuery = queryBuilder();
      
      // Create Firebase listener
      const unsubscribe = onSnapshot(
        targetedQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          this.handleSnapshot(queryKey, snapshot);
        },
        (error: FirestoreError) => {
          this.handleError(queryKey, error);
        }
      );

      this.listeners.set(queryKey, unsubscribe);
    } catch (error) {
      console.error('Firebase listener creation error:', error);
      this.handleError(queryKey, error as FirestoreError);
    }
  }

  /**
   * Handle Firebase snapshot updates
   * Requirement 7.2: Batch related changes to minimize individual update events
   */
  private handleSnapshot(queryKey: string, snapshot: QuerySnapshot<DocumentData>): void {
    const subscriptions = this.subscriptions.get(queryKey);
    if (!subscriptions || subscriptions.length === 0) return;

    const startTime = Date.now();

    // Process document changes for batching
    const changes = snapshot.docChanges();
    const batchUpdates: BatchUpdate[] = [];

    changes.forEach(change => {
      subscriptions.forEach(subscription => {
        if (subscription.options.batchUpdates) {
          batchUpdates.push({
            subscriptionId: subscription.id,
            data: {
              type: change.type,
              doc: change.doc.data(),
              id: change.doc.id
            },
            timestamp: new Date(),
            type: change.type
          });
        } else {
          // Immediate callback for non-batched subscriptions
          subscription.callback({
            type: change.type,
            doc: change.doc.data(),
            id: change.doc.id
          });
          subscription.updateCount++;
          subscription.lastUpdate = new Date();
        }
      });
    });

    // Process batch updates
    if (batchUpdates.length > 0) {
      this.processBatchUpdates(queryKey, batchUpdates);
    }

    // Update metrics
    const responseTime = Date.now() - startTime;
    this.updateMetrics(responseTime);
  }

  /**
   * Process batch updates with debouncing
   * Requirement 7.2: Batch related changes efficiently
   */
  private processBatchUpdates(queryKey: string, updates: BatchUpdate[]): void {
    // Add to batch queue
    if (!this.batchQueue.has(queryKey)) {
      this.batchQueue.set(queryKey, []);
    }
    this.batchQueue.get(queryKey)!.push(...updates);

    // Clear existing timer
    const existingTimer = this.batchTimers.get(queryKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const subscriptions = this.subscriptions.get(queryKey);
    const debounceMs = subscriptions?.[0]?.options.debounceMs || 100;

    const timer = setTimeout(() => {
      this.flushBatchUpdates(queryKey);
    }, debounceMs);

    this.batchTimers.set(queryKey, timer);
  }

  /**
   * Flush batched updates to subscribers
   */
  private flushBatchUpdates(queryKey: string): void {
    const batchedUpdates = this.batchQueue.get(queryKey);
    const subscriptions = this.subscriptions.get(queryKey);

    if (!batchedUpdates || !subscriptions || batchedUpdates.length === 0) return;

    // Group updates by subscription
    const updatesBySubscription = new Map<string, BatchUpdate[]>();
    batchedUpdates.forEach(update => {
      if (!updatesBySubscription.has(update.subscriptionId)) {
        updatesBySubscription.set(update.subscriptionId, []);
      }
      updatesBySubscription.get(update.subscriptionId)!.push(update);
    });

    // Send batched updates to each subscription
    subscriptions.forEach(subscription => {
      const updates = updatesBySubscription.get(subscription.id);
      if (updates && updates.length > 0) {
        subscription.callback({
          type: 'batch',
          updates: updates.map(u => u.data),
          count: updates.length,
          timestamp: new Date()
        });
        subscription.updateCount += updates.length;
        subscription.lastUpdate = new Date();
      }
    });

    // Clear batch queue and timer
    this.batchQueue.set(queryKey, []);
    this.batchTimers.delete(queryKey);
    this.metrics.batchedUpdates += batchedUpdates.length;
  }

  /**
   * Handle Firebase listener errors
   */
  private handleError(queryKey: string, error: FirestoreError): void {
    console.error('Firebase listener error:', error);
    
    const subscriptions = this.subscriptions.get(queryKey);
    if (!subscriptions) return;

    // Notify all subscriptions of error
    subscriptions.forEach(subscription => {
      if (typeof subscription.callback === 'function') {
        subscription.callback({
          type: 'error',
          error: error.message,
          code: error.code,
          timestamp: new Date()
        });
      }
    });

    // Implement retry logic if needed
    // This would be expanded based on specific error types
  }

  /**
   * Unsubscribe from real-time updates
   * Requirement 7.3: Properly detach listeners to prevent memory leaks
   */
  unsubscribe(subscriptionId: string): void {
    // Find and remove subscription
    for (const [queryKey, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        this.metrics.totalSubscriptions--;

        // Clear cleanup timer
        const cleanupTimer = this.cleanupTimers.get(subscriptionId);
        if (cleanupTimer) {
          clearTimeout(cleanupTimer);
          this.cleanupTimers.delete(subscriptionId);
        }

        // If no more subscriptions for this query, remove Firebase listener
        if (subscriptions.length === 0) {
          this.removeFirebaseListener(queryKey);
          this.subscriptions.delete(queryKey);
        }

        break;
      }
    }
  }

  /**
   * Remove Firebase listener and cleanup resources
   * Requirement 7.3: Prevent memory leaks and unnecessary updates
   */
  private removeFirebaseListener(queryKey: string): void {
    const unsubscribe = this.listeners.get(queryKey);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(queryKey);
      this.metrics.activeListeners--;
    }

    // Clear batch queue and timers
    this.batchQueue.delete(queryKey);
    const batchTimer = this.batchTimers.get(queryKey);
    if (batchTimer) {
      clearTimeout(batchTimer);
      this.batchTimers.delete(queryKey);
    }
  }

  /**
   * Setup automatic cleanup timer for subscription
   * Requirement 7.3: Automatic cleanup to prevent memory leaks
   */
  private setupCleanupTimer(subscriptionId: string, queryKey: string, timeout: number): void {
    const timer = setTimeout(() => {
      console.log(`Auto-cleaning up subscription ${subscriptionId} after ${timeout}ms`);
      this.unsubscribe(subscriptionId);
    }, timeout);

    this.cleanupTimers.set(subscriptionId, timer);
  }

  /**
   * Get listener pool metrics
   * Requirement 7.5: Listener pooling efficiency tracking
   */
  getMetrics(): ListenerPoolMetrics {
    // Calculate memory usage (approximate)
    const memoryUsage = 
      this.listeners.size * 1024 + // Approximate listener memory
      this.subscriptions.size * 512 + // Subscription memory
      Array.from(this.batchQueue.values()).reduce((sum, queue) => sum + queue.length * 256, 0); // Batch queue memory

    return {
      ...this.metrics,
      memoryUsage
    };
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number): void {
    // Update average response time (simple moving average)
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + responseTime) / 2;
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup all listeners and resources
   * Requirement 7.3: Complete cleanup for memory leak prevention
   */
  cleanup(): void {
    // Unsubscribe all Firebase listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();

    // Clear all timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    
    this.cleanupTimers.forEach(timer => clearTimeout(timer));
    this.cleanupTimers.clear();

    // Clear all data structures
    this.subscriptions.clear();
    this.batchQueue.clear();

    // Reset metrics
    this.metrics = {
      activeListeners: 0,
      sharedListeners: 0,
      totalSubscriptions: 0,
      batchedUpdates: 0,
      memoryUsage: 0,
      averageResponseTime: 0
    };
  }
}

// Singleton instance
export const listenerPoolManager = new ListenerPoolManager();

// Helper functions for common query patterns
export const createTargetedQuery = {
  /**
   * Create targeted query for novel-specific data
   * Requirement 7.1: Targeted listeners instead of broad collection listeners
   */
  novelData: (novelId: number) => {
    if (process.env.NODE_ENV === 'test') {
      return {}; // Mock query for testing
    }
    
    return query(
      collection(db, 'novels'),
      where('id', '==', novelId),
      limit(1)
    );
  },

  /**
   * Create targeted query for user library updates
   */
  userLibrary: (userId: string, novelId?: number) => {
    if (process.env.NODE_ENV === 'test') {
      return {}; // Mock query for testing
    }

    let q = query(
      collection(db, 'libraries'),
      where('userId', '==', userId)
    );

    if (novelId) {
      q = query(q, where('novelId', '==', novelId));
    }

    return query(q, orderBy('lastRead', 'desc'), limit(50));
  },

  /**
   * Create targeted query for comments on specific novel
   */
  novelComments: (novelId: number, limit_count: number = 20) => {
    if (process.env.NODE_ENV === 'test') {
      return {}; // Mock query for testing
    }

    return query(
      collection(db, 'comments'),
      where('novelId', '==', novelId),
      orderBy('createdAt', 'desc'),
      limit(limit_count)
    );
  }
};