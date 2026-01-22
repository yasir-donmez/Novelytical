/**
 * Firebase Query Optimizer Interface
 * 
 * Provides optimized query operations to reduce Firebase reads and improve performance
 */

import { 
  DocumentData, 
  Query, 
  QuerySnapshot, 
  DocumentSnapshot,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';

export interface BatchReadRequest {
  collection: string;
  docIds?: string[];
  query?: Query<DocumentData>;
  cacheKey?: string;
  dataType?: string;
}

export interface BatchReadResult<T = DocumentData> {
  collection: string;
  data: T[];
  fromCache: boolean;
  readCount: number;
}

export interface QueryOptimizationMetrics {
  totalQueries: number;
  totalReads: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  optimizationRatio: number; // Percentage of reads saved through optimization
}

export interface FirebaseQueryOptimizer {
  /**
   * Batch multiple document reads into a single optimized operation
   */
  batchRead<T = DocumentData>(requests: BatchReadRequest[]): Promise<BatchReadResult<T>[]>;

  /**
   * Execute a single optimized query with caching
   */
  optimizedQuery<T = DocumentData>(
    query: Query<DocumentData>,
    cacheKey: string,
    dataType?: string
  ): Promise<T[]>;

  /**
   * Consolidate multiple queries into a single efficient query when possible
   */
  consolidateQueries<T = DocumentData>(
    queries: Query<DocumentData>[],
    cacheKey: string,
    dataType?: string
  ): Promise<T[]>;

  /**
   * Get optimization metrics
   */
  getMetrics(): QueryOptimizationMetrics;

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void;

  /**
   * Enable/disable query optimization
   */
  setOptimizationEnabled(enabled: boolean): void;
}

/**
 * Query optimization strategies
 */
export enum OptimizationStrategy {
  BATCH_READS = 'batch_reads',
  QUERY_CONSOLIDATION = 'query_consolidation',
  COMPOSITE_INDEX = 'composite_index',
  DENORMALIZATION = 'denormalization'
}

export interface OptimizationConfig {
  enableBatchReads: boolean;
  enableQueryConsolidation: boolean;
  enableCompositeIndexes: boolean;
  maxBatchSize: number;
  cacheEnabled: boolean;
  defaultDataType: string;
}

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  enableBatchReads: true,
  enableQueryConsolidation: true,
  enableCompositeIndexes: true,
  maxBatchSize: 10,
  cacheEnabled: true,
  defaultDataType: 'dynamic'
};