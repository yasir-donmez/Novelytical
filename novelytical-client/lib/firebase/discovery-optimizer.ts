/**
 * Discovery Page Optimizer
 * 
 * Discovery sayfası için 4 ayrı API çağrısını tek bir optimize edilmiş
 * endpoint'e dönüştürür ve Firebase okuma işlemlerini azaltır.
 */

import { getCompositeIndexOptimizer, DiscoveryQueryOptions } from './composite-index-optimizer';
import { getCacheManager } from '@/lib/cache';

export interface DiscoveryData {
  trending: NovelSummary[];
  newArrivals: NovelSummary[];
  editorsPick: NovelSummary[];
  fantasyNovels: NovelSummary[];
  metadata: {
    lastUpdated: number;
    cacheHit: boolean;
    totalReads: number;
    optimizationRatio: number;
  };
}

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
}

/**
 * Discovery Page Optimizer sınıfı
 * Tüm discovery verilerini tek bir çağrıda optimize eder
 */
export class DiscoveryOptimizer {
  private cacheManager = getCacheManager();
  private compositeOptimizer = getCompositeIndexOptimizer();
  private readCount = 0;

  /**
   * Discovery sayfası için tüm verileri tek seferde getirir
   * 4 ayrı API çağrısı yerine 1 optimize edilmiş çağrı
   */
  async getUnifiedDiscoveryData(): Promise<DiscoveryData> {
    const startTime = Date.now();
    const cacheKey = 'discovery_unified_data';
    
    // Cache'den kontrol et
    const cached = await this.cacheManager.get<DiscoveryData>(cacheKey, 'discovery');
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cacheHit: true
        }
      };
    }

    this.readCount = 0;

    // Discovery sorgu seçeneklerini tanımla
    const queryOptions: DiscoveryQueryOptions = {
      trendingNovels: {
        timeRange: 'weekly',
        minViews: 50,
        limit: 10
      },
      newArrivals: {
        daysBack: 30,
        minChapters: 1,
        limit: 7
      },
      editorsPick: {
        minRating: 4.0,
        featured: true,
        limit: 12
      },
      categorySpecific: {
        category: 'Fantastik',
        sortBy: 'rating',
        minRating: 3.5,
        limit: 12
      }
    };

    try {
      // Unified query ile tüm verileri paralel olarak getir
      const results = await this.compositeOptimizer.executeUnifiedDiscoveryQuery(queryOptions);
      
      // Veri dönüşümü
      const discoveryData: DiscoveryData = {
        trending: this.transformToNovelSummary(results.trending, true),
        newArrivals: this.transformToNovelSummary(results.newArrivals),
        editorsPick: this.transformToNovelSummary(results.editorsPick),
        fantasyNovels: this.transformToNovelSummary(results.categorySpecific || []),
        metadata: {
          lastUpdated: Date.now(),
          cacheHit: false,
          totalReads: this.readCount,
          optimizationRatio: this.calculateOptimizationRatio()
        }
      };

      // Cache'e kaydet (60 dakika TTL)
      await this.cacheManager.set(cacheKey, discoveryData, 'discovery');

      return discoveryData;
    } catch (error) {
      console.error('Discovery data fetch error:', error);
      
      // Hata durumunda boş veri döndür
      return {
        trending: [],
        newArrivals: [],
        editorsPick: [],
        fantasyNovels: [],
        metadata: {
          lastUpdated: Date.now(),
          cacheHit: false,
          totalReads: 0,
          optimizationRatio: 0
        }
      };
    }
  }

  /**
   * Belirli bir kategori için optimize edilmiş veri getirir
   */
  async getCategoryOptimizedData(category: string, sortBy: 'rating' | 'views' | 'date' | 'chapters' = 'rating'): Promise<NovelSummary[]> {
    const cacheKey = `category_${category}_${sortBy}`;
    
    // Cache'den kontrol et
    const cached = await this.cacheManager.get<NovelSummary[]>(cacheKey, 'discovery');
    if (cached) {
      return cached;
    }

    const queryOptions: DiscoveryQueryOptions = {
      categorySpecific: {
        category,
        sortBy,
        minRating: 3.0,
        limit: 20
      }
    };

    try {
      const results = await this.compositeOptimizer.executeUnifiedDiscoveryQuery(queryOptions);
      const novels = this.transformToNovelSummary(results.categorySpecific || []);
      
      // Cache'e kaydet (30 dakika TTL)
      await this.cacheManager.set(cacheKey, novels, 'discovery', 30 * 60 * 1000);
      
      return novels;
    } catch (error) {
      console.error(`Category ${category} data fetch error:`, error);
      return [];
    }
  }

  /**
   * Trending veriler için özel optimizasyon
   */
  async getTrendingOptimized(timeRange: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<NovelSummary[]> {
    const cacheKey = `trending_${timeRange}`;
    
    // Cache'den kontrol et
    const cached = await this.cacheManager.get<NovelSummary[]>(cacheKey, 'discovery');
    if (cached) {
      return cached;
    }

    const queryOptions: DiscoveryQueryOptions = {
      trendingNovels: {
        timeRange,
        minViews: timeRange === 'daily' ? 10 : timeRange === 'weekly' ? 50 : 200,
        limit: 15
      }
    };

    try {
      const results = await this.compositeOptimizer.executeUnifiedDiscoveryQuery(queryOptions);
      const novels = this.transformToNovelSummary(results.trending, true);
      
      // Cache TTL: daily=30min, weekly=60min, monthly=120min
      const ttlMap = { daily: 30, weekly: 60, monthly: 120 };
      await this.cacheManager.set(cacheKey, novels, 'discovery', ttlMap[timeRange] * 60 * 1000);
      
      return novels;
    } catch (error) {
      console.error(`Trending ${timeRange} data fetch error:`, error);
      return [];
    }
  }

  /**
   * Firebase verilerini NovelSummary formatına dönüştürür
   */
  private transformToNovelSummary(data: any[], addRank: boolean = false): NovelSummary[] {
    return data.map((item, index) => ({
      id: item.id,
      title: item.title || '',
      author: item.author || '',
      coverUrl: item.coverUrl,
      rating: item.rating || 0,
      reviewCount: item.reviewCount || 0,
      viewCount: item.viewCount || 0,
      chapterCount: item.chapterCount || 0,
      categories: item.categories || [],
      publishedDate: item.publishedDate?.toDate?.() || new Date(item.publishedDate),
      lastUpdated: item.lastUpdated?.toDate?.() || new Date(item.lastUpdated),
      featured: item.featured || false,
      ...(addRank && { rank: index + 1 })
    }));
  }

  /**
   * Optimizasyon oranını hesaplar
   * Önceki 4 ayrı çağrı vs şimdiki 1 çağrı
   */
  private calculateOptimizationRatio(): number {
    const previousReads = 4; // Önceki sistem: 4 ayrı API çağrısı
    const currentReads = 1;  // Yeni sistem: 1 unified çağrı
    return ((previousReads - currentReads) / previousReads) * 100;
  }

  /**
   * Cache invalidation için pattern-based temizlik
   */
  async invalidateDiscoveryCache(): Promise<void> {
    await this.cacheManager.invalidate('discovery_*');
    await this.cacheManager.invalidate('category_*');
    await this.cacheManager.invalidate('trending_*');
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
    const stats = await this.cacheManager.getStats();
    
    return {
      cacheHitRate: stats.overall.overallHitRate,
      averageResponseTime: stats.overall.avgResponseTime,
      totalOptimizedReads: this.readCount,
      estimatedCostSaving: this.calculateOptimizationRatio()
    };
  }

  /**
   * A/B test için farklı discovery stratejileri
   */
  async getDiscoveryVariant(variant: 'default' | 'personalized' | 'trending-focused'): Promise<DiscoveryData> {
    const cacheKey = `discovery_variant_${variant}`;
    
    // Cache'den kontrol et
    const cached = await this.cacheManager.get<DiscoveryData>(cacheKey, 'discovery');
    if (cached) {
      return cached;
    }

    let queryOptions: DiscoveryQueryOptions;

    switch (variant) {
      case 'personalized':
        // Kişiselleştirilmiş içerik (gelecekte user preferences ile)
        queryOptions = {
          trendingNovels: { timeRange: 'daily', limit: 8 },
          newArrivals: { daysBack: 14, limit: 6 },
          editorsPick: { minRating: 4.5, limit: 10 },
          categorySpecific: { category: 'Romantik', sortBy: 'rating', limit: 8 }
        };
        break;
        
      case 'trending-focused':
        // Trend odaklı içerik
        queryOptions = {
          trendingNovels: { timeRange: 'daily', limit: 15 },
          newArrivals: { daysBack: 7, limit: 5 },
          editorsPick: { minRating: 4.0, limit: 8 },
          categorySpecific: { category: 'Aksiyon', sortBy: 'views', limit: 10 }
        };
        break;
        
      default:
        // Varsayılan strateji
        return this.getUnifiedDiscoveryData();
    }

    try {
      const results = await this.compositeOptimizer.executeUnifiedDiscoveryQuery(queryOptions);
      
      const discoveryData: DiscoveryData = {
        trending: this.transformToNovelSummary(results.trending, true),
        newArrivals: this.transformToNovelSummary(results.newArrivals),
        editorsPick: this.transformToNovelSummary(results.editorsPick),
        fantasyNovels: this.transformToNovelSummary(results.categorySpecific || []),
        metadata: {
          lastUpdated: Date.now(),
          cacheHit: false,
          totalReads: this.readCount,
          optimizationRatio: this.calculateOptimizationRatio()
        }
      };

      // Variant cache'i (30 dakika TTL)
      await this.cacheManager.set(cacheKey, discoveryData, 'discovery', 30 * 60 * 1000);

      return discoveryData;
    } catch (error) {
      console.error(`Discovery variant ${variant} error:`, error);
      return this.getUnifiedDiscoveryData(); // Fallback to default
    }
  }
}

// Singleton instance
let discoveryOptimizer: DiscoveryOptimizer | null = null;

/**
 * Global discovery optimizer instance'ını döndürür
 */
export function getDiscoveryOptimizer(): DiscoveryOptimizer {
  if (!discoveryOptimizer) {
    discoveryOptimizer = new DiscoveryOptimizer();
  }
  return discoveryOptimizer;
}

/**
 * Discovery optimizer instance'ını sıfırlar (test için)
 */
export function resetDiscoveryOptimizer(): void {
  discoveryOptimizer = null;
}