/**
 * Composite Index Optimizer for Firebase Queries
 * 
 * Bu modül Firebase'de bileşik indeksler kullanarak discovery verilerini
 * optimize eder ve karmaşık çok alanlı sorguları verimli hale getirir.
 */

import { 
  Query, 
  DocumentData, 
  where, 
  orderBy, 
  limit, 
  query as firestoreQuery,
  collection,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCacheManager } from '@/lib/cache';

export interface CompositeQueryConfig {
  collection: string;
  filters: QueryFilter[];
  orderFields: OrderField[];
  limitCount?: number;
  cacheKey?: string;
  dataType?: string;
}

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';
  value: any;
}

export interface OrderField {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DiscoveryQueryOptions {
  trendingNovels?: {
    timeRange: 'daily' | 'weekly' | 'monthly';
    minViews?: number;
    categories?: string[];
    limit?: number;
  };
  newArrivals?: {
    daysBack: number;
    minChapters?: number;
    categories?: string[];
    limit?: number;
  };
  editorsPick?: {
    minRating?: number;
    categories?: string[];
    featured?: boolean;
    limit?: number;
  };
  categorySpecific?: {
    category: string;
    sortBy: 'rating' | 'views' | 'date' | 'chapters';
    minRating?: number;
    limit?: number;
  };
}

/**
 * Composite Index Optimizer sınıfı
 * Firebase bileşik indekslerini kullanarak optimize edilmiş sorgular oluşturur
 */
export class CompositeIndexOptimizer {
  private cacheManager = getCacheManager();

  /**
   * Bileşik indeks kullanarak optimize edilmiş sorgu oluşturur
   */
  createOptimizedQuery(config: CompositeQueryConfig): Query<DocumentData> {
    const collectionRef = collection(db, config.collection);
    const constraints: QueryConstraint[] = [];

    // Filtreleri ekle
    config.filters.forEach(filter => {
      constraints.push(where(filter.field, filter.operator, filter.value));
    });

    // Sıralama alanlarını ekle
    config.orderFields.forEach(orderField => {
      constraints.push(orderBy(orderField.field, orderField.direction));
    });

    // Limit ekle
    if (config.limitCount) {
      constraints.push(limit(config.limitCount));
    }

    return firestoreQuery(collectionRef, ...constraints);
  }

  /**
   * Discovery sayfası için optimize edilmiş sorgu seti oluşturur
   */
  createDiscoveryQueries(options: DiscoveryQueryOptions): Map<string, Query<DocumentData>> {
    const queries = new Map<string, Query<DocumentData>>();

    // 1. Trending Novels Query - Bileşik indeks: [category, viewCount, lastUpdated]
    if (options.trendingNovels) {
      const trendingConfig: CompositeQueryConfig = {
        collection: 'novels',
        filters: [
          { field: 'status', operator: '==', value: 'active' },
          { field: 'viewCount', operator: '>=', value: options.trendingNovels.minViews || 100 }
        ],
        orderFields: [
          { field: 'viewCount', direction: 'desc' },
          { field: 'lastUpdated', direction: 'desc' }
        ],
        limitCount: options.trendingNovels.limit || 10
      };

      // Kategori filtresi ekle
      if (options.trendingNovels.categories && options.trendingNovels.categories.length > 0) {
        trendingConfig.filters.push({
          field: 'categories',
          operator: 'array-contains-any',
          value: options.trendingNovels.categories
        });
      }

      queries.set('trending', this.createOptimizedQuery(trendingConfig));
    }

    // 2. New Arrivals Query - Bileşik indeks: [publishedDate, chapterCount, rating]
    if (options.newArrivals) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - options.newArrivals.daysBack);

      const newArrivalsConfig: CompositeQueryConfig = {
        collection: 'novels',
        filters: [
          { field: 'status', operator: '==', value: 'active' },
          { field: 'publishedDate', operator: '>=', value: daysAgo },
          { field: 'chapterCount', operator: '>=', value: options.newArrivals.minChapters || 1 }
        ],
        orderFields: [
          { field: 'publishedDate', direction: 'desc' },
          { field: 'rating', direction: 'desc' }
        ],
        limitCount: options.newArrivals.limit || 7
      };

      // Kategori filtresi ekle
      if (options.newArrivals.categories && options.newArrivals.categories.length > 0) {
        newArrivalsConfig.filters.push({
          field: 'categories',
          operator: 'array-contains-any',
          value: options.newArrivals.categories
        });
      }

      queries.set('newArrivals', this.createOptimizedQuery(newArrivalsConfig));
    }

    // 3. Editor's Pick Query - Bileşik indeks: [featured, rating, reviewCount]
    if (options.editorsPick) {
      const editorsPickConfig: CompositeQueryConfig = {
        collection: 'novels',
        filters: [
          { field: 'status', operator: '==', value: 'active' },
          { field: 'rating', operator: '>=', value: options.editorsPick.minRating || 4.0 }
        ],
        orderFields: [
          { field: 'rating', direction: 'desc' },
          { field: 'reviewCount', direction: 'desc' }
        ],
        limitCount: options.editorsPick.limit || 12
      };

      // Featured filtresi ekle
      if (options.editorsPick.featured) {
        editorsPickConfig.filters.push({
          field: 'featured',
          operator: '==',
          value: true
        });
      }

      // Kategori filtresi ekle
      if (options.editorsPick.categories && options.editorsPick.categories.length > 0) {
        editorsPickConfig.filters.push({
          field: 'categories',
          operator: 'array-contains-any',
          value: options.editorsPick.categories
        });
      }

      queries.set('editorsPick', this.createOptimizedQuery(editorsPickConfig));
    }

    // 4. Category Specific Query - Bileşik indeks: [category, sortField, rating]
    if (options.categorySpecific) {
      const sortFieldMap = {
        'rating': 'rating',
        'views': 'viewCount',
        'date': 'publishedDate',
        'chapters': 'chapterCount'
      };

      const categoryConfig: CompositeQueryConfig = {
        collection: 'novels',
        filters: [
          { field: 'status', operator: '==', value: 'active' },
          { field: 'categories', operator: 'array-contains', value: options.categorySpecific.category }
        ],
        orderFields: [
          { field: sortFieldMap[options.categorySpecific.sortBy], direction: 'desc' }
        ],
        limitCount: options.categorySpecific.limit || 12
      };

      // Minimum rating filtresi ekle
      if (options.categorySpecific.minRating) {
        categoryConfig.filters.push({
          field: 'rating',
          operator: '>=',
          value: options.categorySpecific.minRating
        });
      }

      queries.set('categorySpecific', this.createOptimizedQuery(categoryConfig));
    }

    return queries;
  }

  /**
   * Tek bir discovery endpoint için birleştirilmiş sorgu oluşturur
   */
  async executeUnifiedDiscoveryQuery(options: DiscoveryQueryOptions): Promise<{
    trending: any[];
    newArrivals: any[];
    editorsPick: any[];
    categorySpecific?: any[];
  }> {
    const cacheKey = `discovery_unified_${JSON.stringify(options)}`;
    
    // Cache'den kontrol et
    const cached = await this.cacheManager.get<{
      trending: any[];
      newArrivals: any[];
      editorsPick: any[];
      categorySpecific?: any[];
    }>(cacheKey, 'discovery');
    if (cached) {
      return cached;
    }

    const queries = this.createDiscoveryQueries(options);
    const results: {
      trending: any[];
      newArrivals: any[];
      editorsPick: any[];
      categorySpecific?: any[];
    } = {
      trending: [],
      newArrivals: [],
      editorsPick: [],
      categorySpecific: []
    };

    // Paralel olarak tüm sorguları çalıştır
    const queryPromises = Array.from(queries.entries()).map(async ([key, query]) => {
      try {
        const { getDocs } = await import('firebase/firestore');
        const snapshot = await getDocs(query);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { key, data };
      } catch (error) {
        console.error(`Discovery query error for ${key}:`, error);
        return { key, data: [] };
      }
    });

    const queryResults = await Promise.all(queryPromises);
    
    // Sonuçları organize et
    queryResults.forEach(({ key, data }) => {
      if (key === 'trending') results.trending = data;
      else if (key === 'newArrivals') results.newArrivals = data;
      else if (key === 'editorsPick') results.editorsPick = data;
      else if (key === 'categorySpecific') results.categorySpecific = data;
    });

    // Cache'e kaydet (60 dakika)
    await this.cacheManager.set(cacheKey, results, 'discovery');

    return results;
  }

  /**
   * Bileşik indeks performansını analiz eder
   */
  analyzeIndexPerformance(config: CompositeQueryConfig): {
    indexFields: string[];
    estimatedCost: number;
    recommendations: string[];
  } {
    const indexFields: string[] = [];
    const recommendations: string[] = [];
    let estimatedCost = 1;

    // Filtre alanlarını topla
    config.filters.forEach(filter => {
      if (!indexFields.includes(filter.field)) {
        indexFields.push(filter.field);
        estimatedCost += 0.5;
      }
    });

    // Sıralama alanlarını topla
    config.orderFields.forEach(orderField => {
      if (!indexFields.includes(orderField.field)) {
        indexFields.push(orderField.field);
        estimatedCost += 0.3;
      }
    });

    // Öneriler oluştur
    if (indexFields.length > 3) {
      recommendations.push('Çok fazla alan kullanılıyor, indeks karmaşıklığını azaltmayı düşünün');
    }

    if (config.filters.some(f => f.operator === 'array-contains-any')) {
      recommendations.push('array-contains-any operatörü pahalıdır, mümkünse array-contains kullanın');
    }

    if (config.orderFields.length > 1) {
      recommendations.push('Çoklu sıralama alanları indeks boyutunu artırır');
    }

    return {
      indexFields,
      estimatedCost,
      recommendations
    };
  }

  /**
   * Gerekli Firebase indekslerini önerir
   */
  generateIndexRecommendations(options: DiscoveryQueryOptions): string[] {
    const recommendations: string[] = [];

    recommendations.push('// Firebase Console\'da aşağıdaki bileşik indeksleri oluşturun:');
    recommendations.push('');

    if (options.trendingNovels) {
      recommendations.push('// Trending Novels için:');
      recommendations.push('// Collection: novels');
      recommendations.push('// Fields: status (Ascending), viewCount (Descending), lastUpdated (Descending)');
      if (options.trendingNovels.categories) {
        recommendations.push('// Ek indeks: categories (Array), viewCount (Descending), lastUpdated (Descending)');
      }
      recommendations.push('');
    }

    if (options.newArrivals) {
      recommendations.push('// New Arrivals için:');
      recommendations.push('// Collection: novels');
      recommendations.push('// Fields: status (Ascending), publishedDate (Descending), rating (Descending)');
      recommendations.push('// Ek indeks: chapterCount (Ascending), publishedDate (Descending)');
      recommendations.push('');
    }

    if (options.editorsPick) {
      recommendations.push('// Editor\'s Pick için:');
      recommendations.push('// Collection: novels');
      recommendations.push('// Fields: status (Ascending), rating (Descending), reviewCount (Descending)');
      if (options.editorsPick.featured) {
        recommendations.push('// Ek indeks: featured (Ascending), rating (Descending)');
      }
      recommendations.push('');
    }

    if (options.categorySpecific) {
      recommendations.push('// Category Specific için:');
      recommendations.push('// Collection: novels');
      recommendations.push('// Fields: categories (Array), rating (Descending), viewCount (Descending)');
      recommendations.push('// Fields: categories (Array), publishedDate (Descending)');
      recommendations.push('// Fields: categories (Array), chapterCount (Descending)');
      recommendations.push('');
    }

    return recommendations;
  }
}

// Singleton instance
let compositeIndexOptimizer: CompositeIndexOptimizer | null = null;

/**
 * Global composite index optimizer instance'ını döndürür
 */
export function getCompositeIndexOptimizer(): CompositeIndexOptimizer {
  if (!compositeIndexOptimizer) {
    compositeIndexOptimizer = new CompositeIndexOptimizer();
  }
  return compositeIndexOptimizer;
}

/**
 * Composite index optimizer instance'ını sıfırlar (test için)
 */
export function resetCompositeIndexOptimizer(): void {
  compositeIndexOptimizer = null;
}