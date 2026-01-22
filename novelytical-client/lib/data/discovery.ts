/**
 * Unified Discovery Data Model
 * 
 * Bu modül discovery sayfası için birleştirilmiş veri modelini tanımlar.
 * 4 ayrı API çağrısını tek bir optimize edilmiş endpoint'e dönüştürür.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.5**
 */

import { getDiscoveryOptimizer } from '@/lib/firebase/discovery-optimizer';
import { getCacheManager } from '@/lib/cache';
import type { NovelListDto } from '@/types/novel';

/**
 * Discovery Document Interface
 * Tüm discovery verilerini tek bir dokümanda toplar
 */
export interface DiscoveryDocument {
  id: string;
  version: string;
  lastUpdated: number;
  cacheMetadata: {
    createdAt: number;
    expiresAt: number;
    hitCount: number;
    source: 'cache' | 'firebase' | 'hybrid';
  };
  data: {
    trending: DiscoveryLaneData;
    newArrivals: DiscoveryLaneData;
    editorsPick: DiscoveryLaneData;
    fantasyNovels: DiscoveryLaneData;
  };
  performance: {
    totalReads: number;
    optimizationRatio: number;
    responseTime: number;
    cacheHitRate: number;
  };
}

/**
 * Discovery Lane Data Interface
 * Her bir lane için standart veri yapısı
 */
export interface DiscoveryLaneData {
  novels: NovelSummary[];
  metadata: {
    totalCount: number;
    lastUpdated: number;
    queryParams: Record<string, any>;
    cacheKey: string;
  };
}

/**
 * Novel Summary Interface
 * Discovery için optimize edilmiş novel verisi
 */
export interface NovelSummary {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  rating: number;
  reviewCount: number;
  viewCount: number;
  chapterCount: number;
  categories: string[];
  publishedDate: Date;
  lastUpdated: Date;
  featured?: boolean;
  rank?: number;
  // Denormalized data for efficiency
  authorId?: string;
  categoryIds?: string[];
  tags?: string[];
  status: 'active' | 'completed' | 'hiatus' | 'dropped';
}

/**
 * Discovery Query Options
 * Unified endpoint için sorgu parametreleri
 */
export interface UnifiedDiscoveryOptions {
  variant?: 'default' | 'personalized' | 'trending-focused';
  userId?: string;
  preferences?: {
    favoriteCategories?: string[];
    excludeCategories?: string[];
    minRating?: number;
    preferredAuthors?: string[];
  };
  limits?: {
    trending?: number;
    newArrivals?: number;
    editorsPick?: number;
    categorySpecific?: number;
  };
  timeRanges?: {
    trending?: 'daily' | 'weekly' | 'monthly';
    newArrivals?: number; // days back
  };
  cacheOptions?: {
    forceRefresh?: boolean;
    maxAge?: number;
    staleWhileRevalidate?: boolean;
  };
}

/**
 * Discovery Data Service
 * Unified discovery endpoint'i için ana servis sınıfı
 */
export class DiscoveryDataService {
  private discoveryOptimizer = getDiscoveryOptimizer();
  private cacheManager = getCacheManager();
  private readonly CACHE_VERSION = '1.0.0';

  /**
   * Ana unified discovery endpoint
   * 4 ayrı API çağrısını tek çağrıya dönüştürür
   */
  async getUnifiedDiscoveryData(options: UnifiedDiscoveryOptions = {}): Promise<DiscoveryDocument> {
    const startTime = Date.now();
    
    try {
      // Discovery optimizer'dan birleştirilmiş veriyi al
      const discoveryData = await this.discoveryOptimizer.getUnifiedDiscoveryData();
      
      // Unified discovery document'i oluştur
      const document: DiscoveryDocument = {
        id: `discovery_${Date.now()}`,
        version: this.CACHE_VERSION,
        lastUpdated: Date.now(),
        cacheMetadata: {
          createdAt: Date.now(),
          expiresAt: Date.now() + (60 * 60 * 1000), // 60 minutes
          hitCount: 0,
          source: discoveryData.metadata.cacheHit ? 'cache' : 'firebase'
        },
        data: {
          trending: {
            novels: this.transformToNovelSummary(discoveryData.trending),
            metadata: {
              totalCount: discoveryData.trending.length,
              lastUpdated: discoveryData.metadata.lastUpdated,
              queryParams: { sortOrder: 'rank_desc', pageSize: options.limits?.trending || 10 },
              cacheKey: 'trending_weekly'
            }
          },
          newArrivals: {
            novels: this.transformToNovelSummary(discoveryData.newArrivals),
            metadata: {
              totalCount: discoveryData.newArrivals.length,
              lastUpdated: discoveryData.metadata.lastUpdated,
              queryParams: { sortOrder: 'date_desc', pageSize: options.limits?.newArrivals || 7 },
              cacheKey: 'new_arrivals_30d'
            }
          },
          editorsPick: {
            novels: this.transformToNovelSummary(discoveryData.editorsPick),
            metadata: {
              totalCount: discoveryData.editorsPick.length,
              lastUpdated: discoveryData.metadata.lastUpdated,
              queryParams: { sortOrder: 'rating_desc', featured: true, pageSize: options.limits?.editorsPick || 12 },
              cacheKey: 'editors_pick'
            }
          },
          fantasyNovels: {
            novels: this.transformToNovelSummary(discoveryData.fantasyNovels),
            metadata: {
              totalCount: discoveryData.fantasyNovels.length,
              lastUpdated: discoveryData.metadata.lastUpdated,
              queryParams: { tags: ['Fantastik'], sortOrder: 'rating_desc', pageSize: options.limits?.categorySpecific || 12 },
              cacheKey: 'fantasy_novels'
            }
          }
        },
        performance: {
          totalReads: discoveryData.metadata.totalReads,
          optimizationRatio: discoveryData.metadata.optimizationRatio,
          responseTime: Date.now() - startTime,
          cacheHitRate: discoveryData.metadata.cacheHit ? 100 : 0
        }
      };

      return document;
    } catch (error) {
      console.error('Unified discovery data fetch error:', error);
      
      // Hata durumunda boş document döndür
      return this.createEmptyDiscoveryDocument(startTime);
    }
  }

  /**
   * Belirli bir lane için optimize edilmiş veri getirir
   */
  async getDiscoveryLane(
    laneType: 'trending' | 'newArrivals' | 'editorsPick' | 'fantasy',
    options: Partial<UnifiedDiscoveryOptions> = {}
  ): Promise<DiscoveryLaneData> {
    try {
      switch (laneType) {
        case 'trending':
          const trendingData = await this.discoveryOptimizer.getTrendingOptimized(
            options.timeRanges?.trending || 'weekly'
          );
          return {
            novels: this.transformToNovelSummary(trendingData),
            metadata: {
              totalCount: trendingData.length,
              lastUpdated: Date.now(),
              queryParams: { sortOrder: 'rank_desc', timeRange: options.timeRanges?.trending || 'weekly' },
              cacheKey: `trending_${options.timeRanges?.trending || 'weekly'}`
            }
          };

        case 'fantasy':
          const fantasyData = await this.discoveryOptimizer.getCategoryOptimizedData('Fantastik', 'rating');
          return {
            novels: this.transformToNovelSummary(fantasyData),
            metadata: {
              totalCount: fantasyData.length,
              lastUpdated: Date.now(),
              queryParams: { category: 'Fantastik', sortBy: 'rating' },
              cacheKey: 'category_Fantastik_rating'
            }
          };

        default:
          // Diğer lane'ler için unified data'dan çek
          const unifiedData = await this.getUnifiedDiscoveryData(options);
          return unifiedData.data[laneType];
      }
    } catch (error) {
      console.error(`Discovery lane ${laneType} fetch error:`, error);
      return {
        novels: [],
        metadata: {
          totalCount: 0,
          lastUpdated: Date.now(),
          queryParams: {},
          cacheKey: `${laneType}_error`
        }
      };
    }
  }

  /**
   * Kişiselleştirilmiş discovery verisi
   */
  async getPersonalizedDiscovery(userId: string, preferences: UnifiedDiscoveryOptions['preferences'] = {}): Promise<DiscoveryDocument> {
    const options: UnifiedDiscoveryOptions = {
      variant: 'personalized',
      userId,
      preferences,
      limits: {
        trending: 8,
        newArrivals: 6,
        editorsPick: 10,
        categorySpecific: 8
      }
    };

    // Kişiselleştirilmiş variant'ı kullan
    const variantData = await this.discoveryOptimizer.getDiscoveryVariant('personalized');
    
    return this.transformDiscoveryDataToDocument(variantData, options);
  }

  /**
   * A/B test için farklı discovery varyantları
   */
  async getDiscoveryVariant(variant: 'default' | 'personalized' | 'trending-focused'): Promise<DiscoveryDocument> {
    const variantData = await this.discoveryOptimizer.getDiscoveryVariant(variant);
    return this.transformDiscoveryDataToDocument(variantData, { variant });
  }

  /**
   * Discovery cache'ini invalidate eder
   */
  async invalidateDiscoveryCache(): Promise<void> {
    await this.discoveryOptimizer.invalidateDiscoveryCache();
  }

  /**
   * Discovery performans raporunu getirir
   */
  async getPerformanceReport(): Promise<{
    cacheHitRate: number;
    averageResponseTime: number;
    totalOptimizedReads: number;
    estimatedCostSaving: number;
  }> {
    return await this.discoveryOptimizer.getPerformanceReport();
  }

  /**
   * NovelSummary formatına dönüştürür
   */
  private transformToNovelSummary(novels: any[]): NovelSummary[] {
    return novels.map(novel => ({
      id: novel.id,
      title: novel.title || '',
      author: novel.author || '',
      coverUrl: novel.coverUrl,
      rating: novel.rating || 0,
      reviewCount: novel.reviewCount || 0,
      viewCount: novel.viewCount || 0,
      chapterCount: novel.chapterCount || 0,
      categories: novel.categories || [],
      publishedDate: novel.publishedDate instanceof Date ? novel.publishedDate : new Date(novel.publishedDate),
      lastUpdated: novel.lastUpdated instanceof Date ? novel.lastUpdated : new Date(novel.lastUpdated),
      featured: novel.featured || false,
      rank: novel.rank,
      authorId: novel.authorId,
      categoryIds: novel.categoryIds || [],
      tags: novel.tags || novel.categories || [],
      status: novel.status || 'active'
    }));
  }

  /**
   * DiscoveryData'yı DiscoveryDocument'e dönüştürür
   */
  private transformDiscoveryDataToDocument(
    discoveryData: any, 
    options: UnifiedDiscoveryOptions
  ): DiscoveryDocument {
    return {
      id: `discovery_${options.variant || 'default'}_${Date.now()}`,
      version: this.CACHE_VERSION,
      lastUpdated: discoveryData.metadata.lastUpdated,
      cacheMetadata: {
        createdAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000),
        hitCount: 0,
        source: discoveryData.metadata.cacheHit ? 'cache' : 'firebase'
      },
      data: {
        trending: {
          novels: this.transformToNovelSummary(discoveryData.trending),
          metadata: {
            totalCount: discoveryData.trending.length,
            lastUpdated: discoveryData.metadata.lastUpdated,
            queryParams: { variant: options.variant },
            cacheKey: `trending_${options.variant}`
          }
        },
        newArrivals: {
          novels: this.transformToNovelSummary(discoveryData.newArrivals),
          metadata: {
            totalCount: discoveryData.newArrivals.length,
            lastUpdated: discoveryData.metadata.lastUpdated,
            queryParams: { variant: options.variant },
            cacheKey: `new_arrivals_${options.variant}`
          }
        },
        editorsPick: {
          novels: this.transformToNovelSummary(discoveryData.editorsPick),
          metadata: {
            totalCount: discoveryData.editorsPick.length,
            lastUpdated: discoveryData.metadata.lastUpdated,
            queryParams: { variant: options.variant },
            cacheKey: `editors_pick_${options.variant}`
          }
        },
        fantasyNovels: {
          novels: this.transformToNovelSummary(discoveryData.fantasyNovels),
          metadata: {
            totalCount: discoveryData.fantasyNovels.length,
            lastUpdated: discoveryData.metadata.lastUpdated,
            queryParams: { variant: options.variant },
            cacheKey: `fantasy_${options.variant}`
          }
        }
      },
      performance: {
        totalReads: discoveryData.metadata.totalReads,
        optimizationRatio: discoveryData.metadata.optimizationRatio,
        responseTime: 0, // Will be calculated by caller
        cacheHitRate: discoveryData.metadata.cacheHit ? 100 : 0
      }
    };
  }

  /**
   * Selective cache invalidation - belirli pattern'lere göre cache'i temizler
   */
  async selectiveInvalidateCache(patterns: (string | RegExp)[], options: {
    dataTypes?: ('static' | 'dynamic' | 'discovery')[];
    tags?: string[];
    olderThan?: number;
  } = {}): Promise<string[]> {
    const invalidatedKeys: string[] = [];
    const dataTypes = options.dataTypes || ['static', 'dynamic', 'discovery'];
    
    try {
      // Her data type için cache'i kontrol et
      for (const dataType of dataTypes) {
        // Cache manager'dan tüm key'leri al (bu bir mock implementation)
        // Gerçek implementasyonda cache manager'ın getAllKeys metodunu kullanırız
        const allKeys = await this.getAllCacheKeys(dataType);
        
        for (const key of allKeys) {
          let shouldInvalidate = false;
          
          // Eğer pattern yoksa ve sadece dataType ile filtreleme yapılıyorsa
          if (patterns.length === 0 && dataTypes.includes(dataType)) {
            // DataType filtering için key'in dataType'ını kontrol et
            // Bu basit bir implementation - gerçekte cache metadata'dan alınmalı
            const keyDataType = this.inferDataTypeFromKey(key);
            if (keyDataType === dataType) {
              shouldInvalidate = true;
            }
          } else if (patterns.length > 0) {
            // Pattern matching - herhangi bir pattern match ederse invalidate et
            for (const pattern of patterns) {
              if (typeof pattern === 'string') {
                if (key.includes(pattern)) {
                  shouldInvalidate = true;
                  break;
                }
              } else if (pattern instanceof RegExp) {
                if (pattern.test(key)) {
                  shouldInvalidate = true;
                  break;
                }
              }
            }
          }
          
          // Tag-based invalidation
          if (!shouldInvalidate && options.tags && options.tags.length > 0) {
            for (const tag of options.tags) {
              if (key.includes(tag)) {
                shouldInvalidate = true;
                break;
              }
            }
          }
          
          // Time-based invalidation
          if (!shouldInvalidate && options.olderThan) {
            const cached = await this.cacheManager.get<{ timestamp?: number }>(key, dataType);
            if (cached && cached.timestamp && cached.timestamp < options.olderThan) {
              shouldInvalidate = true;
            }
          }
          
          if (shouldInvalidate) {
            // Key bazlı invalidation için memory ve localStorage'dan direkt sil
            await Promise.all([
              this.cacheManager.memory.delete(key),
              this.cacheManager.localStorage.delete(key)
            ]);
            invalidatedKeys.push(key);
          }
        }
      }
      
      return invalidatedKeys;
    } catch (error) {
      console.error('Selective cache invalidation error:', error);
      return invalidatedKeys;
    }
  }

  /**
   * Cache'deki tüm key'leri döndürür (mock implementation)
   */
  private async getAllCacheKeys(dataType: string): Promise<string[]> {
    // Bu bir mock implementation - gerçek cache manager'da getAllKeys metodu olmalı
    // Test ortamında mock edilecek
    return [];
  }

  /**
   * Key'den dataType'ını çıkarır (basit implementation)
   */
  private inferDataTypeFromKey(key: string): string {
    if (key.startsWith('discovery_') || key.includes('trending') || key.includes('novels')) {
      return 'discovery';
    }
    if (key.startsWith('user_')) {
      return 'user';
    }
    if (key.includes('stats') || key.includes('metadata') || key.includes('chapters')) {
      return 'stats';
    }
    return 'dynamic';
  }

  /**
   * Hata durumunda boş discovery document oluşturur
   */
  private createEmptyDiscoveryDocument(startTime: number): DiscoveryDocument {
    const now = Date.now();
    const emptyLane: DiscoveryLaneData = {
      novels: [],
      metadata: {
        totalCount: 0,
        lastUpdated: now,
        queryParams: {},
        cacheKey: 'empty'
      }
    };

    return {
      id: `discovery_empty_${now}`,
      version: this.CACHE_VERSION,
      lastUpdated: now,
      cacheMetadata: {
        createdAt: now,
        expiresAt: now + (5 * 60 * 1000), // 5 minutes for error cases
        hitCount: 0,
        source: 'firebase'
      },
      data: {
        trending: emptyLane,
        newArrivals: emptyLane,
        editorsPick: emptyLane,
        fantasyNovels: emptyLane
      },
      performance: {
        totalReads: 0,
        optimizationRatio: 0,
        responseTime: now - startTime,
        cacheHitRate: 0
      }
    };
  }
}

// Singleton instance
let discoveryDataService: DiscoveryDataService | null = null;

/**
 * Global discovery data service instance'ını döndürür
 */
export function getDiscoveryDataService(): DiscoveryDataService {
  if (!discoveryDataService) {
    discoveryDataService = new DiscoveryDataService();
  }
  return discoveryDataService;
}

/**
 * Discovery data service instance'ını sıfırlar (test için)
 */
export function resetDiscoveryDataService(): void {
  discoveryDataService = null;
}

/**
 * Legacy API uyumluluğu için wrapper fonksiyonlar
 * Mevcut kod değişikliklerini minimize eder
 */

/**
 * Trending novels için optimize edilmiş fetch
 */
export async function fetchTrendingNovels(options: { 
  pageSize?: number; 
  timeRange?: 'daily' | 'weekly' | 'monthly';
  revalidate?: number;
} = {}): Promise<{ data: NovelListDto[] }> {
  const service = getDiscoveryDataService();
  const laneData = await service.getDiscoveryLane('trending', {
    limits: { trending: options.pageSize || 10 },
    timeRanges: { trending: options.timeRange || 'weekly' }
  });
  
  return {
    data: laneData.novels.map(novel => ({
      id: parseInt(novel.id),
      slug: novel.id, // Use id as slug for now
      title: novel.title,
      author: novel.author,
      coverUrl: novel.coverUrl,
      rating: novel.rating,
      viewCount: novel.viewCount,
      chapterCount: novel.chapterCount,
      lastUpdated: novel.lastUpdated.toISOString(),
      rankPosition: novel.rank,
      tags: novel.tags || novel.categories || []
    }))
  };
}

/**
 * New arrivals için optimize edilmiş fetch
 */
export async function fetchNewArrivals(options: { 
  pageSize?: number; 
  daysBack?: number;
  revalidate?: number;
} = {}): Promise<{ data: NovelListDto[] }> {
  const service = getDiscoveryDataService();
  const laneData = await service.getDiscoveryLane('newArrivals', {
    limits: { newArrivals: options.pageSize || 7 },
    timeRanges: { newArrivals: options.daysBack || 30 }
  });
  
  return {
    data: laneData.novels.map(novel => ({
      id: parseInt(novel.id),
      slug: novel.id, // Use id as slug for now
      title: novel.title,
      author: novel.author,
      coverUrl: novel.coverUrl,
      rating: novel.rating,
      viewCount: novel.viewCount,
      chapterCount: novel.chapterCount,
      lastUpdated: novel.lastUpdated.toISOString(),
      tags: novel.tags || novel.categories || []
    }))
  };
}

/**
 * Editor's pick için optimize edilmiş fetch
 */
export async function fetchEditorsPick(options: { 
  pageSize?: number; 
  minRating?: number;
  revalidate?: number;
} = {}): Promise<{ data: NovelListDto[] }> {
  const service = getDiscoveryDataService();
  const laneData = await service.getDiscoveryLane('editorsPick', {
    limits: { editorsPick: options.pageSize || 12 },
    preferences: { minRating: options.minRating || 4.0 }
  });
  
  return {
    data: laneData.novels.map(novel => ({
      id: parseInt(novel.id),
      slug: novel.id, // Use id as slug for now
      title: novel.title,
      author: novel.author,
      coverUrl: novel.coverUrl,
      rating: novel.rating,
      viewCount: novel.viewCount,
      chapterCount: novel.chapterCount,
      lastUpdated: novel.lastUpdated.toISOString(),
      tags: novel.tags || novel.categories || []
    }))
  };
}

/**
 * Category-specific novels için optimize edilmiş fetch
 */
export async function fetchCategoryNovels(options: { 
  category: string;
  pageSize?: number; 
  sortBy?: 'rating' | 'views' | 'date' | 'chapters';
  revalidate?: number;
} = { category: 'Fantastik' }): Promise<{ data: NovelListDto[] }> {
  const service = getDiscoveryDataService();
  const laneData = await service.getDiscoveryLane('fantasy', {
    limits: { categorySpecific: options.pageSize || 12 }
  });
  
  return {
    data: laneData.novels.map(novel => ({
      id: parseInt(novel.id),
      slug: novel.id, // Use id as slug for now
      title: novel.title,
      author: novel.author,
      coverUrl: novel.coverUrl,
      rating: novel.rating,
      viewCount: novel.viewCount,
      chapterCount: novel.chapterCount,
      lastUpdated: novel.lastUpdated.toISOString(),
      tags: novel.tags || novel.categories || []
    }))
  };
}