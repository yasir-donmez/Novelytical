/**
 * Firebase Query Optimizer Implementation
 * 
 * Implements optimized Firebase queries with caching and batch operations
 */

import { 
  DocumentData, 
  Query, 
  QuerySnapshot, 
  getDocs,
  doc,
  getDoc,
  documentId,
  where,
  query as firestoreQuery,
  collection
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { getCacheManager } from '@/lib/cache';
import { 
  FirebaseQueryOptimizer,
  BatchReadRequest,
  BatchReadResult,
  QueryOptimizationMetrics,
  OptimizationConfig,
  DEFAULT_OPTIMIZATION_CONFIG
} from './query-optimizer';

export class FirebaseQueryOptimizerImpl implements FirebaseQueryOptimizer {
  private metrics: QueryOptimizationMetrics = {
    totalQueries: 0,
    totalReads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    optimizationRatio: 0
  };

  private totalResponseTime = 0;
  private optimizationEnabled = true;

  constructor(private config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG) {}

  /**
   * Batch multiple document reads into a single optimized operation
   */
  async batchRead<T = DocumentData>(requests: BatchReadRequest[]): Promise<BatchReadResult<T>[]> {
    if (!this.optimizationEnabled || !this.config.enableBatchReads) {
      return this.executeBatchReadUnoptimized<T>(requests);
    }

    const startTime = Date.now();
    const cacheManager = getCacheManager();
    const results: BatchReadResult<T>[] = [];

    try {
      // Group requests by collection for efficient batching
      const requestsByCollection = this.groupRequestsByCollection(requests);

      for (const [collectionName, collectionRequests] of requestsByCollection) {
        for (const request of collectionRequests) {
          let result: BatchReadResult<T>;

          // Try cache first if cacheKey is provided
          if (request.cacheKey && this.config.cacheEnabled) {
            const cached = await cacheManager.get<T[]>(request.cacheKey, request.dataType || this.config.defaultDataType);
            if (cached) {
              result = {
                collection: collectionName,
                data: cached,
                fromCache: true,
                readCount: 0
              };
              this.metrics.cacheHits++;
            } else {
              result = await this.executeBatchReadForCollection<T>(collectionName, request);
              // Cache the result
              await cacheManager.set(request.cacheKey, result.data, request.dataType || this.config.defaultDataType);
              this.metrics.cacheMisses++;
            }
          } else {
            result = await this.executeBatchReadForCollection<T>(collectionName, request);
          }

          results.push(result);
          this.metrics.totalReads += result.readCount;
        }
      }

      this.updateMetrics(startTime);
      return results;
    } catch (error) {
      console.error('Batch read error:', error);
      this.updateMetrics(startTime);
      throw error;
    }
  }

  /**
   * Execute a single optimized query with caching
   */
  async optimizedQuery<T = DocumentData>(
    query: Query<DocumentData>,
    cacheKey: string,
    dataType: string = this.config.defaultDataType
  ): Promise<T[]> {
    const startTime = Date.now();
    const cacheManager = getCacheManager();

    try {
      // Try cache first
      if (this.config.cacheEnabled) {
        const cached = await cacheManager.get<T[]>(cacheKey, dataType);
        if (cached) {
          this.metrics.cacheHits++;
          this.updateMetrics(startTime);
          return cached;
        }
      }

      // Execute query
      const snapshot = await getDocs(query);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

      // Cache result
      if (this.config.cacheEnabled) {
        await cacheManager.set(cacheKey, data, dataType);
      }

      this.metrics.cacheMisses++;
      this.metrics.totalReads += snapshot.size;
      this.updateMetrics(startTime);

      return data;
    } catch (error) {
      console.error('Optimized query error:', error);
      this.updateMetrics(startTime);
      throw error;
    }
  }

  /**
   * Consolidate multiple queries into a single efficient query when possible
   */
  async consolidateQueries<T = DocumentData>(
    queries: Query<DocumentData>[],
    cacheKey: string,
    dataType: string = this.config.defaultDataType
  ): Promise<T[]> {
    if (!this.optimizationEnabled || !this.config.enableQueryConsolidation) {
      return this.executeQueriesUnconsolidated<T>(queries, cacheKey, dataType);
    }

    const startTime = Date.now();
    const cacheManager = getCacheManager();

    try {
      // Try cache first
      if (this.config.cacheEnabled) {
        const cached = await cacheManager.get<T[]>(cacheKey, dataType);
        if (cached) {
          this.metrics.cacheHits++;
          this.updateMetrics(startTime);
          return cached;
        }
      }

      // Analyze queries to see if they can be consolidated
      const consolidatedQuery = this.analyzeAndConsolidateQueries(queries);
      
      let data: T[];
      if (consolidatedQuery) {
        // Execute single consolidated query
        const snapshot = await getDocs(consolidatedQuery);
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        this.metrics.totalReads += snapshot.size;
      } else {
        // Execute queries separately if consolidation not possible
        data = await this.executeQueriesUnconsolidated<T>(queries, cacheKey, dataType);
      }

      // Cache result
      if (this.config.cacheEnabled) {
        await cacheManager.set(cacheKey, data, dataType);
      }

      this.metrics.cacheMisses++;
      this.updateMetrics(startTime);

      return data;
    } catch (error) {
      console.error('Query consolidation error:', error);
      this.updateMetrics(startTime);
      throw error;
    }
  }

  /**
   * Get optimization metrics
   */
  getMetrics(): QueryOptimizationMetrics {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const optimizationRatio = totalRequests > 0 
      ? (this.metrics.cacheHits / totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      averageResponseTime: this.metrics.totalQueries > 0 
        ? this.totalResponseTime / this.metrics.totalQueries 
        : 0,
      optimizationRatio
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      totalReads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      optimizationRatio: 0
    };
    this.totalResponseTime = 0;
  }

  /**
   * Enable/disable query optimization
   */
  setOptimizationEnabled(enabled: boolean): void {
    this.optimizationEnabled = enabled;
  }

  // Private helper methods

  private groupRequestsByCollection(requests: BatchReadRequest[]): Map<string, BatchReadRequest[]> {
    const grouped = new Map<string, BatchReadRequest[]>();
    
    for (const request of requests) {
      if (!grouped.has(request.collection)) {
        grouped.set(request.collection, []);
      }
      grouped.get(request.collection)!.push(request);
    }
    
    return grouped;
  }

  private async executeBatchReadForCollection<T>(
    collectionName: string,
    request: BatchReadRequest
  ): Promise<BatchReadResult<T>> {
    try {
      let data: T[] = [];
      let readCount = 0;

      if (request.docIds && request.docIds.length > 0) {
        // Batch read specific documents
        const chunks = this.chunkArray(request.docIds, this.config.maxBatchSize);
        
        for (const chunk of chunks) {
          const batchQuery = firestoreQuery(
            collection(db, collectionName),
            where(documentId(), 'in', chunk)
          );
          
          const snapshot = await getDocs(batchQuery);
          const chunkData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
          data.push(...chunkData);
          readCount += snapshot.size;
        }
      } else if (request.query) {
        // Execute provided query
        const snapshot = await getDocs(request.query);
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        readCount = snapshot.size;
      }

      return {
        collection: collectionName,
        data,
        fromCache: false,
        readCount
      };
    } catch (error) {
      console.error(`Batch read error for collection ${collectionName}:`, error);
      return {
        collection: collectionName,
        data: [],
        fromCache: false,
        readCount: 0
      };
    }
  }

  private async executeBatchReadUnoptimized<T>(requests: BatchReadRequest[]): Promise<BatchReadResult<T>[]> {
    const results: BatchReadResult<T>[] = [];
    
    for (const request of requests) {
      const result = await this.executeBatchReadForCollection<T>(request.collection, request);
      results.push(result);
      this.metrics.totalReads += result.readCount;
    }
    
    return results;
  }

  private async executeQueriesUnconsolidated<T>(
    queries: Query<DocumentData>[],
    cacheKey: string,
    dataType: string
  ): Promise<T[]> {
    const allData: T[] = [];
    
    for (const query of queries) {
      const snapshot = await getDocs(query);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      allData.push(...data);
      this.metrics.totalReads += snapshot.size;
    }
    
    return allData;
  }

  private analyzeAndConsolidateQueries(queries: Query<DocumentData>[]): Query<DocumentData> | null {
    // Simple consolidation logic - in a real implementation, this would be more sophisticated
    // For now, return null to indicate queries cannot be consolidated
    // This is a placeholder for more complex query analysis
    return null;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private updateMetrics(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.totalResponseTime += responseTime;
    this.metrics.totalQueries++;
  }
}

// Singleton instance for global use
let queryOptimizerInstance: FirebaseQueryOptimizerImpl | null = null;

/**
 * Get the global query optimizer instance
 */
export function getQueryOptimizer(config?: OptimizationConfig): FirebaseQueryOptimizerImpl {
  if (!queryOptimizerInstance) {
    queryOptimizerInstance = new FirebaseQueryOptimizerImpl(config);
  }
  return queryOptimizerInstance;
}

/**
 * Reset the query optimizer instance (useful for testing)
 */
export function resetQueryOptimizer(): void {
  queryOptimizerInstance = null;
}