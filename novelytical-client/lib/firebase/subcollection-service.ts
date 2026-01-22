/**
 * Subcollection Service
 * 
 * Bu servis subcollection optimizer'ı kullanarak
 * optimize edilmiş subcollection erişimi sağlar.
 * 
 * **Validates: Requirements 6.4**
 */

import { getSubcollectionOptimizer, SubcollectionQueryOptions, SubcollectionQueryResult } from './subcollection-optimizer';
import { getCacheManager } from '@/lib/cache/cache-manager-impl';

/**
 * Common Subcollection Patterns
 * Sık kullanılan subcollection pattern'leri
 */
export interface SubcollectionPatterns {
  // Novel related subcollections
  novelComments: {
    parentCollection: 'novels';
    subcollection: 'comments';
    defaultOptions: SubcollectionQueryOptions;
  };
  novelReviews: {
    parentCollection: 'novels';
    subcollection: 'reviews';
    defaultOptions: SubcollectionQueryOptions;
  };
  novelChapters: {
    parentCollection: 'novels';
    subcollection: 'chapters';
    defaultOptions: SubcollectionQueryOptions;
  };
  
  // User related subcollections
  userLibraries: {
    parentCollection: 'users';
    subcollection: 'libraries';
    defaultOptions: SubcollectionQueryOptions;
  };
  userNotifications: {
    parentCollection: 'users';
    subcollection: 'notifications';
    defaultOptions: SubcollectionQueryOptions;
  };
  userFollows: {
    parentCollection: 'users';
    subcollection: 'follows';
    defaultOptions: SubcollectionQueryOptions;
  };
  
  // Community related subcollections
  postComments: {
    parentCollection: 'community_posts';
    subcollection: 'comments';
    defaultOptions: SubcollectionQueryOptions;
  };
  postVotes: {
    parentCollection: 'community_posts';
    subcollection: 'votes';
    defaultOptions: SubcollectionQueryOptions;
  };
}

/**
 * Subcollection Service Class
 */
export class SubcollectionService {
  private optimizer = getSubcollectionOptimizer();
  private cacheManager = getCacheManager();
  
  // Predefined patterns for common subcollections
  private patterns: SubcollectionPatterns = {
    novelComments: {
      parentCollection: 'novels',
      subcollection: 'comments',
      defaultOptions: {
        maxDepth: 2,
        useDirectReferences: true,
        useDenormalizedData: true,
        enableIndexedAccess: true,
        limit: 20,
        orderBy: 'createdAt',
        orderDirection: 'desc',
        enableCaching: true,
        cacheTimeout: 10 * 60 * 1000, // 10 minutes
        enableMetrics: true,
        enableFallback: true,
        fallbackTimeout: 3000
      }
    },
    novelReviews: {
      parentCollection: 'novels',
      subcollection: 'reviews',
      defaultOptions: {
        maxDepth: 2,
        useDirectReferences: true,
        useDenormalizedData: true,
        enableIndexedAccess: true,
        limit: 15,
        orderBy: 'rating',
        orderDirection: 'desc',
        enableCaching: true,
        cacheTimeout: 15 * 60 * 1000, // 15 minutes
        enableMetrics: true,
        enableFallback: true,
        fallbackTimeout: 3000
      }
    },
    novelChapters: {
      parentCollection: 'novels',
      subcollection: 'chapters',
      defaultOptions: {
        maxDepth: 1, // Chapters are frequently accessed, optimize heavily
        useDirectReferences: true,
        useDenormalizedData: true,
        enableIndexedAccess: true,
        limit: 50,
        orderBy: 'chapterNumber',
        orderDirection: 'asc',
        enableCaching: true,
        cacheTimeout: 30 * 60 * 1000, // 30 minutes
        enableMetrics: true,
        enableFallback: true,
        fallbackTimeout: 2000
      }
    },
    userLibraries: {
      parentCollection: 'users',
      subcollection: 'libraries',
      defaultOptions: {
        maxDepth: 2,
        useDirectReferences: true,
        useDenormalizedData: true,
        enableIndexedAccess: true,
        limit: 30,
        orderBy: 'lastUpdated',
        orderDirection: 'desc',
        enableCaching: true,
        cacheTimeout: 20 * 60 * 1000, // 20 minutes
        enableMetrics: true,
        enableFallback: true,
        fallbackTimeout: 3000
      }
    },
    userNotifications: {
      parentCollection: 'users',
      subcollection: 'notifications',
      defaultOptions: {
        maxDepth: 1, // Notifications need fast access
        useDirectReferences: true,
        useDenormalizedData: true,
        enableIndexedAccess: true,
        limit: 25,
        orderBy: 'createdAt',
        orderDirection: 'desc',
        enableCaching: true,
        cacheTimeout: 5 * 60 * 1000, // 5 minutes (more dynamic)
        enableMetrics: true,
        enableFallback: true,
        fallbackTimeout: 2000
      }
    },
    userFollows: {
      parentCollection: 'users',
      subcollection: 'follows',
      defaultOptions: {
        maxDepth: 2,
        useDirectReferences: true,
        useDenormalizedData: true,
        enableIndexedAccess: true,
        limit: 100,
        orderBy: 'createdAt',
        orderDirection: 'desc',
        enableCaching: true,
        cacheTimeout: 60 * 60 * 1000, // 1 hour (relatively static)
        enableMetrics: true,
        enableFallback: true,
        fallbackTimeout: 3000
      }
    },
    postComments: {
      parentCollection: 'community_posts',
      subcollection: 'comments',
      defaultOptions: {
        maxDepth: 2,
        useDirectReferences: true,
        useDenormalizedData: true,
        enableIndexedAccess: true,
        limit: 20,
        orderBy: 'createdAt',
        orderDirection: 'desc',
        enableCaching: true,
        cacheTimeout: 8 * 60 * 1000, // 8 minutes
        enableMetrics: true,
        enableFallback: true,
        fallbackTimeout: 3000
      }
    },
    postVotes: {
      parentCollection: 'community_posts',
      subcollection: 'votes',
      defaultOptions: {
        maxDepth: 1, // Votes need fast access for real-time updates
        useDirectReferences: true,
        useDenormalizedData: true,
        enableIndexedAccess: true,
        limit: 50,
        orderBy: 'createdAt',
        orderDirection: 'desc',
        enableCaching: true,
        cacheTimeout: 3 * 60 * 1000, // 3 minutes (very dynamic)
        enableMetrics: true,
        enableFallback: true,
        fallbackTimeout: 2000
      }
    }
  };

  /**
   * Novel comments'larını optimize edilmiş şekilde getirir
   */
  async getNovelComments(novelId: string, options?: Partial<SubcollectionQueryOptions>): Promise<SubcollectionQueryResult> {
    const pattern = this.patterns.novelComments;
    const mergedOptions = { ...pattern.defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized(
      pattern.parentCollection,
      novelId,
      pattern.subcollection,
      mergedOptions
    );
  }

  /**
   * Novel reviews'larını optimize edilmiş şekilde getirir
   */
  async getNovelReviews(novelId: string, options?: Partial<SubcollectionQueryOptions>): Promise<SubcollectionQueryResult> {
    const pattern = this.patterns.novelReviews;
    const mergedOptions = { ...pattern.defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized(
      pattern.parentCollection,
      novelId,
      pattern.subcollection,
      mergedOptions
    );
  }

  /**
   * Novel chapters'larını optimize edilmiş şekilde getirir
   */
  async getNovelChapters(novelId: string, options?: Partial<SubcollectionQueryOptions>): Promise<SubcollectionQueryResult> {
    const pattern = this.patterns.novelChapters;
    const mergedOptions = { ...pattern.defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized(
      pattern.parentCollection,
      novelId,
      pattern.subcollection,
      mergedOptions
    );
  }

  /**
   * User libraries'ini optimize edilmiş şekilde getirir
   */
  async getUserLibraries(userId: string, options?: Partial<SubcollectionQueryOptions>): Promise<SubcollectionQueryResult> {
    const pattern = this.patterns.userLibraries;
    const mergedOptions = { ...pattern.defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized(
      pattern.parentCollection,
      userId,
      pattern.subcollection,
      mergedOptions
    );
  }

  /**
   * User notifications'larını optimize edilmiş şekilde getirir
   */
  async getUserNotifications(userId: string, options?: Partial<SubcollectionQueryOptions>): Promise<SubcollectionQueryResult> {
    const pattern = this.patterns.userNotifications;
    const mergedOptions = { ...pattern.defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized(
      pattern.parentCollection,
      userId,
      pattern.subcollection,
      mergedOptions
    );
  }

  /**
   * User follows'larını optimize edilmiş şekilde getirir
   */
  async getUserFollows(userId: string, options?: Partial<SubcollectionQueryOptions>): Promise<SubcollectionQueryResult> {
    const pattern = this.patterns.userFollows;
    const mergedOptions = { ...pattern.defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized(
      pattern.parentCollection,
      userId,
      pattern.subcollection,
      mergedOptions
    );
  }

  /**
   * Community post comments'larını optimize edilmiş şekilde getirir
   */
  async getPostComments(postId: string, options?: Partial<SubcollectionQueryOptions>): Promise<SubcollectionQueryResult> {
    const pattern = this.patterns.postComments;
    const mergedOptions = { ...pattern.defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized(
      pattern.parentCollection,
      postId,
      pattern.subcollection,
      mergedOptions
    );
  }

  /**
   * Community post votes'larını optimize edilmiş şekilde getirir
   */
  async getPostVotes(postId: string, options?: Partial<SubcollectionQueryOptions>): Promise<SubcollectionQueryResult> {
    const pattern = this.patterns.postVotes;
    const mergedOptions = { ...pattern.defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized(
      pattern.parentCollection,
      postId,
      pattern.subcollection,
      mergedOptions
    );
  }

  /**
   * Generic subcollection query - pattern'i olmayan subcollection'lar için
   */
  async getSubcollection<T = any>(
    parentCollection: string,
    parentId: string,
    subcollection: string,
    options?: Partial<SubcollectionQueryOptions>
  ): Promise<SubcollectionQueryResult<T>> {
    const defaultOptions: SubcollectionQueryOptions = {
      maxDepth: 2,
      useDirectReferences: true,
      useDenormalizedData: true,
      enableIndexedAccess: true,
      limit: 25,
      enableCaching: true,
      cacheTimeout: 15 * 60 * 1000, // 15 minutes
      enableMetrics: true,
      enableFallback: true,
      fallbackTimeout: 3000
    };

    const mergedOptions = { ...defaultOptions, ...options };
    
    return await this.optimizer.queryOptimized<T>(
      parentCollection,
      parentId,
      subcollection,
      mergedOptions
    );
  }

  /**
   * Batch subcollection queries - birden fazla subcollection'ı aynı anda getirir
   */
  async batchGetSubcollections<T = any>(
    queries: Array<{
      parentCollection: string;
      parentId: string;
      subcollection: string;
      options?: Partial<SubcollectionQueryOptions>;
    }>
  ): Promise<Array<SubcollectionQueryResult<T>>> {
    return await this.optimizer.batchQueryOptimized<T>(queries);
  }

  /**
   * Subcollection performance raporunu getirir
   */
  async getPerformanceReport(): Promise<{
    totalQueries: number;
    optimizationBreakdown: {
      direct: number;
      indexed: number;
      denormalized: number;
      fallback: number;
    };
    averageResponseTime: number;
    averageTraversalDepth: number;
    cacheHitRate: number;
    estimatedSavings: {
      readOperations: number;
      queryTime: number;
    };
  }> {
    try {
      // Cache'den performance metrics'leri al
      const performanceKey = 'subcollection_performance_metrics';
      const cachedMetrics = await this.cacheManager.get<any>(performanceKey);
      
      if (cachedMetrics) {
        return cachedMetrics;
      }

      // Gerçek implementasyonda metrics collection'dan veri toplanacak
      // Şimdilik mock data döndürüyoruz
      const mockReport = {
        totalQueries: 1000,
        optimizationBreakdown: {
          direct: 400,
          indexed: 250,
          denormalized: 200,
          fallback: 150
        },
        averageResponseTime: 85, // milliseconds
        averageTraversalDepth: 1.3,
        cacheHitRate: 68, // percentage
        estimatedSavings: {
          readOperations: 1200, // Total read operations saved
          queryTime: 45000 // Total milliseconds saved
        }
      };

      // Cache'e kaydet
      await this.cacheManager.set(performanceKey, mockReport, 'performance', 30 * 60 * 1000); // 30 minutes
      
      return mockReport;
    } catch (error) {
      console.error('Failed to get subcollection performance report:', error);
      return {
        totalQueries: 0,
        optimizationBreakdown: {
          direct: 0,
          indexed: 0,
          denormalized: 0,
          fallback: 0
        },
        averageResponseTime: 0,
        averageTraversalDepth: 0,
        cacheHitRate: 0,
        estimatedSavings: {
          readOperations: 0,
          queryTime: 0
        }
      };
    }
  }

  /**
   * Subcollection reference'larını optimize eder
   */
  async optimizeSubcollectionReferences(
    parentCollection: string,
    parentId: string,
    subcollection: string
  ): Promise<{
    success: boolean;
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
      const optimizationResult = await this.optimizer.optimizeReferences(
        parentCollection,
        parentId,
        subcollection
      );

      return {
        success: true,
        optimizationReport: optimizationResult.optimizationReport
      };
    } catch (error) {
      console.error('Failed to optimize subcollection references:', error);
      return {
        success: false,
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

  /**
   * Cache'i invalidate eder
   */
  async invalidateCache(
    parentCollection?: string,
    parentId?: string,
    subcollection?: string
  ): Promise<void> {
    try {
      if (parentCollection && parentId && subcollection) {
        // Specific subcollection cache'ini invalidate et
        const pattern = `subcollection_${parentCollection}_${parentId}_${subcollection}_*`;
        await this.cacheManager.invalidate(pattern);
      } else {
        // Tüm subcollection cache'ini invalidate et
        await this.cacheManager.invalidate('subcollection_*');
      }
      
      console.log('Subcollection cache invalidated');
    } catch (error) {
      console.error('Failed to invalidate subcollection cache:', error);
    }
  }
}

// Singleton instance
let subcollectionService: SubcollectionService | null = null;

/**
 * Global subcollection service instance'ını döndürür
 */
export function getSubcollectionService(): SubcollectionService {
  if (!subcollectionService) {
    subcollectionService = new SubcollectionService();
  }
  return subcollectionService;
}

/**
 * Subcollection service instance'ını sıfırlar (test için)
 */
export function resetSubcollectionService(): void {
  subcollectionService = null;
}