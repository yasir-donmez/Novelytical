/**
 * Subcollection Traversal Optimizer
 * 
 * Bu modül Firebase subcollection traversal'ını optimize eder.
 * Nested collection erişimini minimize etmek için efficient reference
 * yapıları ve denormalized data kullanır.
 * 
 * **Validates: Requirements 6.4**
 */

import { 
  doc, 
  collection, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCacheManager } from '@/lib/cache/cache-manager-impl';

/**
 * Reference Structure Interface
 * Subcollection traversal'ı minimize eden reference yapısı
 */
export interface OptimizedReference {
  id: string;
  type: 'direct' | 'indexed' | 'denormalized';
  targetCollection: string;
  targetId: string;
  
  // Direct reference data (denormalized)
  directData?: {
    title: string;
    summary: string;
    metadata: Record<string, any>;
    lastUpdated: Timestamp;
  };
  
  // Indexed reference data
  indexData?: {
    sortKey: string;
    filterKeys: Record<string, any>;
    relationshipType: string;
    weight: number;
  };
  
  // Reference metadata
  referenceMetadata: {
    createdAt: Timestamp;
    lastAccessed: Timestamp;
    accessCount: number;
    cacheHit: boolean;
    traversalDepth: number;
  };
}

/**
 * Subcollection Query Options
 */
export interface SubcollectionQueryOptions {
  // Traversal optimization
  maxDepth: number;
  useDirectReferences: boolean;
  useDenormalizedData: boolean;
  enableIndexedAccess: boolean;
  
  // Query parameters
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
  
  // Performance settings
  enableCaching: boolean;
  cacheTimeout: number; // milliseconds
  enableMetrics: boolean;
  
  // Fallback settings
  enableFallback: boolean;
  fallbackTimeout: number; // milliseconds
}

/**
 * Subcollection Query Result
 */
export interface SubcollectionQueryResult<T = any> {
  data: T[];
  metadata: {
    totalCount: number;
    traversalDepth: number;
    queryTime: number;
    cacheHit: boolean;
    optimizationUsed: 'direct' | 'indexed' | 'denormalized' | 'fallback';
    readOperations: number;
  };
  pagination?: {
    hasMore: boolean;
    nextCursor?: string;
    totalPages?: number;
    currentPage?: number;
  };
}

/**
 * Subcollection Optimizer Class
 */
export class SubcollectionOptimizer {
  private cacheManager = getCacheManager();
  private readonly defaultOptions: SubcollectionQueryOptions = {
    maxDepth: 2,
    useDirectReferences: true,
    useDenormalizedData: true,
    enableIndexedAccess: true,
    limit: 50,
    enableCaching: true,
    cacheTimeout: 15 * 60 * 1000, // 15 minutes
    enableMetrics: true,
    enableFallback: true,
    fallbackTimeout: 5000
  };

  /**
   * Optimize edilmiş subcollection query
   */
  async queryOptimized<T = any>(
    parentCollection: string,
    parentId: string,
    subcollection: string,
    options: Partial<SubcollectionQueryOptions> = {}
  ): Promise<SubcollectionQueryResult<T>> {
    const startTime = Date.now();
    const config = { ...this.defaultOptions, ...options };
    let readOperations = 0;
    let cacheHit = false;
    let optimizationUsed: 'direct' | 'indexed' | 'denormalized' | 'fallback' = 'fallback';

    try {
      // Cache key oluştur
      const cacheKey = this.generateCacheKey(parentCollection, parentId, subcollection, config);
      
      // Cache'i kontrol et
      if (config.enableCaching) {
        const cachedResult = await this.cacheManager.get<SubcollectionQueryResult<T>>(cacheKey);
        if (cachedResult) {
          return {
            ...cachedResult,
            metadata: {
              ...cachedResult.metadata,
              cacheHit: true,
              queryTime: Date.now() - startTime
            }
          };
        }
      }

      // 1. Direct references'ı dene (en optimize)
      if (config.useDirectReferences) {
        const directResult = await this.queryDirectReferences<T>(
          parentCollection, 
          parentId, 
          subcollection, 
          config
        );
        
        if (directResult.data.length > 0) {
          readOperations = directResult.metadata.readOperations;
          optimizationUsed = 'direct';
          
          const result: SubcollectionQueryResult<T> = {
            ...directResult,
            metadata: {
              ...directResult.metadata,
              queryTime: Date.now() - startTime,
              cacheHit,
              optimizationUsed
            }
          };

          // Cache'e kaydet
          if (config.enableCaching) {
            await this.cacheManager.set(cacheKey, result, 'subcollection', config.cacheTimeout);
          }

          return result;
        }
      }

      // 2. Denormalized data'yı dene
      if (config.useDenormalizedData) {
        const denormalizedResult = await this.queryDenormalizedData<T>(
          parentCollection,
          parentId,
          subcollection,
          config
        );
        
        if (denormalizedResult.data.length > 0) {
          readOperations = denormalizedResult.metadata.readOperations;
          optimizationUsed = 'denormalized';
          
          const result: SubcollectionQueryResult<T> = {
            ...denormalizedResult,
            metadata: {
              ...denormalizedResult.metadata,
              queryTime: Date.now() - startTime,
              cacheHit,
              optimizationUsed
            }
          };

          // Cache'e kaydet
          if (config.enableCaching) {
            await this.cacheManager.set(cacheKey, result, 'subcollection', config.cacheTimeout);
          }

          return result;
        }
      }

      // 3. Indexed access'i dene
      if (config.enableIndexedAccess) {
        const indexedResult = await this.queryIndexedAccess<T>(
          parentCollection,
          parentId,
          subcollection,
          config
        );
        
        if (indexedResult.data.length > 0) {
          readOperations = indexedResult.metadata.readOperations;
          optimizationUsed = 'indexed';
          
          const result: SubcollectionQueryResult<T> = {
            ...indexedResult,
            metadata: {
              ...indexedResult.metadata,
              queryTime: Date.now() - startTime,
              cacheHit,
              optimizationUsed
            }
          };

          // Cache'e kaydet
          if (config.enableCaching) {
            await this.cacheManager.set(cacheKey, result, 'subcollection', config.cacheTimeout);
          }

          return result;
        }
      }

      // 4. Fallback: Traditional subcollection query
      if (config.enableFallback) {
        const fallbackResult = await this.queryFallback<T>(
          parentCollection,
          parentId,
          subcollection,
          config
        );
        
        readOperations = fallbackResult.metadata.readOperations;
        optimizationUsed = 'fallback';
        
        const result: SubcollectionQueryResult<T> = {
          ...fallbackResult,
          metadata: {
            ...fallbackResult.metadata,
            queryTime: Date.now() - startTime,
            cacheHit,
            optimizationUsed
          }
        };

        // Cache'e kaydet (daha kısa süre)
        if (config.enableCaching) {
          await this.cacheManager.set(cacheKey, result, 'subcollection', config.cacheTimeout / 2);
        }

        return result;
      }

      // Hiçbir method çalışmazsa boş result döndür
      return {
        data: [],
        metadata: {
          totalCount: 0,
          traversalDepth: 0,
          queryTime: Date.now() - startTime,
          cacheHit,
          optimizationUsed: 'fallback',
          readOperations: 0
        }
      };

    } catch (error) {
      console.error('Subcollection query optimization failed:', error);
      
      // Error durumunda fallback dene
      if (config.enableFallback) {
        try {
          const fallbackResult = await this.queryFallback<T>(
            parentCollection,
            parentId,
            subcollection,
            config
          );
          
          return {
            ...fallbackResult,
            metadata: {
              ...fallbackResult.metadata,
              queryTime: Date.now() - startTime,
              cacheHit: false,
              optimizationUsed: 'fallback'
            }
          };
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      }

      // Son çare: boş result
      return {
        data: [],
        metadata: {
          totalCount: 0,
          traversalDepth: 0,
          queryTime: Date.now() - startTime,
          cacheHit: false,
          optimizationUsed: 'fallback',
          readOperations: 0
        }
      };
    }
  }

  /**
   * Batch subcollection queries - birden fazla parent için optimize edilmiş query
   */
  async batchQueryOptimized<T = any>(
    queries: Array<{
      parentCollection: string;
      parentId: string;
      subcollection: string;
      options?: Partial<SubcollectionQueryOptions>;
    }>
  ): Promise<Array<SubcollectionQueryResult<T>>> {
    const startTime = Date.now();
    
    try {
      // Paralel query'leri çalıştır
      const results = await Promise.all(
        queries.map(query => 
          this.queryOptimized<T>(
            query.parentCollection,
            query.parentId,
            query.subcollection,
            query.options
          )
        )
      );

      console.log(`Batch query completed in ${Date.now() - startTime}ms for ${queries.length} queries`);
      return results;
    } catch (error) {
      console.error('Batch subcollection query failed:', error);
      
      // Error durumunda boş results döndür
      return queries.map(() => ({
        data: [],
        metadata: {
          totalCount: 0,
          traversalDepth: 0,
          queryTime: Date.now() - startTime,
          cacheHit: false,
          optimizationUsed: 'fallback' as const,
          readOperations: 0
        }
      }));
    }
  }

  /**
   * Subcollection reference'larını optimize eder
   */
  async optimizeReferences(
    parentCollection: string,
    parentId: string,
    subcollection: string
  ): Promise<{
    directReferences: OptimizedReference[];
    indexedReferences: OptimizedReference[];
    denormalizedReferences: OptimizedReference[];
    optimizationReport: {
      totalReferences: number;
      directCount: number;
      indexedCount: number;
      denormalizedCount: number;
      estimatedSavings: {
        readOperations: number;
        queryTime: number;
      };
    };
  }> {
    try {
      // Mevcut subcollection'ı analiz et
      const subcollectionRef = collection(db, parentCollection, parentId, subcollection);
      const snapshot = await getDocs(query(subcollectionRef, limit(100)));
      
      const directReferences: OptimizedReference[] = [];
      const indexedReferences: OptimizedReference[] = [];
      const denormalizedReferences: OptimizedReference[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Direct reference oluştur
        const directRef: OptimizedReference = {
          id: doc.id,
          type: 'direct',
          targetCollection: subcollection,
          targetId: doc.id,
          directData: {
            title: data.title || data.name || doc.id,
            summary: data.summary || data.description || '',
            metadata: data,
            lastUpdated: data.lastUpdated || Timestamp.now()
          },
          referenceMetadata: {
            createdAt: Timestamp.now(),
            lastAccessed: Timestamp.now(),
            accessCount: 0,
            cacheHit: false,
            traversalDepth: 1
          }
        };
        directReferences.push(directRef);

        // Indexed reference oluştur
        const indexedRef: OptimizedReference = {
          id: doc.id,
          type: 'indexed',
          targetCollection: subcollection,
          targetId: doc.id,
          indexData: {
            sortKey: data.createdAt?.toMillis?.() || Date.now(),
            filterKeys: {
              status: data.status,
              category: data.category,
              priority: data.priority
            },
            relationshipType: 'subcollection',
            weight: data.weight || 1
          },
          referenceMetadata: {
            createdAt: Timestamp.now(),
            lastAccessed: Timestamp.now(),
            accessCount: 0,
            cacheHit: false,
            traversalDepth: 1
          }
        };
        indexedReferences.push(indexedRef);

        // Denormalized reference oluştur
        const denormalizedRef: OptimizedReference = {
          id: doc.id,
          type: 'denormalized',
          targetCollection: subcollection,
          targetId: doc.id,
          directData: {
            title: data.title || data.name || doc.id,
            summary: data.summary || data.description || '',
            metadata: {
              ...data,
              parentId,
              parentCollection,
              subcollection
            },
            lastUpdated: data.lastUpdated || Timestamp.now()
          },
          referenceMetadata: {
            createdAt: Timestamp.now(),
            lastAccessed: Timestamp.now(),
            accessCount: 0,
            cacheHit: false,
            traversalDepth: 0 // Denormalized data doesn't require traversal
          }
        };
        denormalizedReferences.push(denormalizedRef);
      });

      // Optimization report oluştur
      const totalReferences = snapshot.docs.length;
      const estimatedReadSavings = totalReferences * 2; // Her reference için 2 read tasarrufu
      const estimatedTimeSavings = totalReferences * 50; // Her reference için 50ms tasarrufu

      return {
        directReferences,
        indexedReferences,
        denormalizedReferences,
        optimizationReport: {
          totalReferences,
          directCount: directReferences.length,
          indexedCount: indexedReferences.length,
          denormalizedCount: denormalizedReferences.length,
          estimatedSavings: {
            readOperations: estimatedReadSavings,
            queryTime: estimatedTimeSavings
          }
        }
      };
    } catch (error) {
      console.error('Reference optimization failed:', error);
      return {
        directReferences: [],
        indexedReferences: [],
        denormalizedReferences: [],
        optimizationReport: {
          totalReferences: 0,
          directCount: 0,
          indexedCount: 0,
          denormalizedCount: 0,
          estimatedSavings: {
            readOperations: 0,
            queryTime: 0
          }
        }
      };
    }
  }

  // Private helper methods

  private async queryDirectReferences<T>(
    parentCollection: string,
    parentId: string,
    subcollection: string,
    config: SubcollectionQueryOptions
  ): Promise<SubcollectionQueryResult<T>> {
    try {
      // Direct references collection'dan çek
      const directRefsRef = collection(db, 'direct_references');
      const directQuery = query(
        directRefsRef,
        where('parentCollection', '==', parentCollection),
        where('parentId', '==', parentId),
        where('subcollection', '==', subcollection),
        limit(config.limit || 50)
      );

      const snapshot = await getDocs(directQuery);
      const data = snapshot.docs.map(doc => doc.data().directData) as T[];

      return {
        data,
        metadata: {
          totalCount: data.length,
          traversalDepth: 1,
          queryTime: 0, // Will be set by caller
          cacheHit: false,
          optimizationUsed: 'direct',
          readOperations: 1
        }
      };
    } catch (error) {
      console.error('Direct references query failed:', error);
      return {
        data: [],
        metadata: {
          totalCount: 0,
          traversalDepth: 1,
          queryTime: 0,
          cacheHit: false,
          optimizationUsed: 'direct',
          readOperations: 1
        }
      };
    }
  }

  private async queryDenormalizedData<T>(
    parentCollection: string,
    parentId: string,
    subcollection: string,
    config: SubcollectionQueryOptions
  ): Promise<SubcollectionQueryResult<T>> {
    try {
      // Denormalized data collection'dan çek
      const denormalizedRef = doc(db, 'denormalized_subcollections', `${parentCollection}_${parentId}_${subcollection}`);
      const snapshot = await getDoc(denormalizedRef);

      if (snapshot.exists()) {
        const data = snapshot.data().items as T[];
        return {
          data: data.slice(0, config.limit || 50),
          metadata: {
            totalCount: data.length,
            traversalDepth: 0, // No traversal needed
            queryTime: 0,
            cacheHit: false,
            optimizationUsed: 'denormalized',
            readOperations: 1
          }
        };
      }

      return {
        data: [],
        metadata: {
          totalCount: 0,
          traversalDepth: 0,
          queryTime: 0,
          cacheHit: false,
          optimizationUsed: 'denormalized',
          readOperations: 1
        }
      };
    } catch (error) {
      console.error('Denormalized data query failed:', error);
      return {
        data: [],
        metadata: {
          totalCount: 0,
          traversalDepth: 0,
          queryTime: 0,
          cacheHit: false,
          optimizationUsed: 'denormalized',
          readOperations: 1
        }
      };
    }
  }

  private async queryIndexedAccess<T>(
    parentCollection: string,
    parentId: string,
    subcollection: string,
    config: SubcollectionQueryOptions
  ): Promise<SubcollectionQueryResult<T>> {
    try {
      // Indexed access collection'dan çek
      const indexedRef = collection(db, 'indexed_subcollections');
      const indexedQuery = query(
        indexedRef,
        where('parentCollection', '==', parentCollection),
        where('parentId', '==', parentId),
        where('subcollection', '==', subcollection),
        orderBy('indexData.sortKey', config.orderDirection || 'desc'),
        limit(config.limit || 50)
      );

      const snapshot = await getDocs(indexedQuery);
      const data = snapshot.docs.map(doc => doc.data().targetData) as T[];

      return {
        data,
        metadata: {
          totalCount: data.length,
          traversalDepth: 1,
          queryTime: 0,
          cacheHit: false,
          optimizationUsed: 'indexed',
          readOperations: 1
        }
      };
    } catch (error) {
      console.error('Indexed access query failed:', error);
      return {
        data: [],
        metadata: {
          totalCount: 0,
          traversalDepth: 1,
          queryTime: 0,
          cacheHit: false,
          optimizationUsed: 'indexed',
          readOperations: 1
        }
      };
    }
  }

  private async queryFallback<T>(
    parentCollection: string,
    parentId: string,
    subcollection: string,
    config: SubcollectionQueryOptions
  ): Promise<SubcollectionQueryResult<T>> {
    try {
      // Traditional subcollection query
      const subcollectionRef = collection(db, parentCollection, parentId, subcollection);
      let subcollectionQuery = query(subcollectionRef);

      // Apply filters
      if (config.orderBy) {
        subcollectionQuery = query(
          subcollectionQuery,
          orderBy(config.orderBy, config.orderDirection || 'desc')
        );
      }

      if (config.limit) {
        subcollectionQuery = query(subcollectionQuery, limit(config.limit));
      }

      const snapshot = await getDocs(subcollectionQuery);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];

      return {
        data,
        metadata: {
          totalCount: data.length,
          traversalDepth: 2, // Parent + subcollection
          queryTime: 0,
          cacheHit: false,
          optimizationUsed: 'fallback',
          readOperations: 2 // Parent read + subcollection read
        }
      };
    } catch (error) {
      console.error('Fallback subcollection query failed:', error);
      return {
        data: [],
        metadata: {
          totalCount: 0,
          traversalDepth: 2,
          queryTime: 0,
          cacheHit: false,
          optimizationUsed: 'fallback',
          readOperations: 2
        }
      };
    }
  }

  private generateCacheKey(
    parentCollection: string,
    parentId: string,
    subcollection: string,
    config: SubcollectionQueryOptions
  ): string {
    const configHash = JSON.stringify({
      limit: config.limit,
      orderBy: config.orderBy,
      orderDirection: config.orderDirection,
      filters: config.filters
    });
    
    return `subcollection_${parentCollection}_${parentId}_${subcollection}_${btoa(configHash).slice(0, 8)}`;
  }
}

// Singleton instance
let subcollectionOptimizer: SubcollectionOptimizer | null = null;

/**
 * Global subcollection optimizer instance'ını döndürür
 */
export function getSubcollectionOptimizer(): SubcollectionOptimizer {
  if (!subcollectionOptimizer) {
    subcollectionOptimizer = new SubcollectionOptimizer();
  }
  return subcollectionOptimizer;
}

/**
 * Subcollection optimizer instance'ını sıfırlar (test için)
 */
export function resetSubcollectionOptimizer(): void {
  subcollectionOptimizer = null;
}