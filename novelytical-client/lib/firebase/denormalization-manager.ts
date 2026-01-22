/**
 * Firebase Denormalization Manager
 * 
 * Bu modül Firebase'de denormalizasyon stratejisini yönetir.
 * Sık erişilen verileri optimize edilmiş yapılarda depolar ve
 * otomatik senkronizasyon süreçleri sağlar.
 * 
 * **Validates: Requirements 6.2, 6.5**
 */

import { 
  doc, 
  collection, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Denormalized Novel Document Interface
 * Sık erişilen novel verilerini tek dokümanda toplar
 */
export interface DenormalizedNovel {
  // Ana novel bilgileri
  id: string;
  title: string;
  slug: string;
  description: string;
  coverUrl?: string;
  status: 'active' | 'completed' | 'hiatus' | 'dropped';
  
  // Denormalized author bilgileri
  author: {
    id: string;
    name: string;
    profileUrl?: string;
    followerCount: number;
    novelCount: number;
  };
  
  // Denormalized category bilgileri
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    novelCount: number;
  }>;
  
  // Denormalized stats
  stats: {
    rating: number;
    reviewCount: number;
    viewCount: number;
    likeCount: number;
    chapterCount: number;
    wordCount: number;
    readingTime: number; // minutes
  };
  
  // Discovery için optimize edilmiş metadata
  discoveryMetadata: {
    trendingScore: number;
    isNewArrival: boolean;
    isEditorsChoice: boolean;
    primaryGenre: string;
    popularityRank: number;
    qualityScore: number;
    engagementScore: number;
  };
  
  // Timestamps
  publishedAt: Timestamp;
  lastUpdated: Timestamp;
  lastChapterAt?: Timestamp;
  
  // Denormalization metadata
  denormalizationMetadata: {
    version: string;
    lastSyncAt: Timestamp;
    sourceCollections: string[];
    syncStatus: 'synced' | 'pending' | 'error';
    errorCount: number;
  };
}

/**
 * Denormalized User Document Interface
 * Kullanıcı profil verilerini optimize eder
 */
export interface DenormalizedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  profileImageUrl?: string;
  bio?: string;
  
  // Denormalized activity stats
  activityStats: {
    reviewCount: number;
    commentCount: number;
    likeCount: number;
    followerCount: number;
    followingCount: number;
    libraryCount: number;
    readingTime: number; // total minutes
  };
  
  // Denormalized preferences
  preferences: {
    favoriteGenres: string[];
    preferredAuthors: string[];
    readingGoals: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    notificationSettings: {
      newChapters: boolean;
      reviews: boolean;
      follows: boolean;
    };
  };
  
  // Recent activity (denormalized)
  recentActivity: Array<{
    type: 'review' | 'comment' | 'like' | 'follow';
    targetId: string;
    targetTitle: string;
    timestamp: Timestamp;
  }>;
  
  // Timestamps
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
  
  // Denormalization metadata
  denormalizationMetadata: {
    version: string;
    lastSyncAt: Timestamp;
    sourceCollections: string[];
    syncStatus: 'synced' | 'pending' | 'error';
    errorCount: number;
  };
}

/**
 * Denormalized Discovery Document Interface
 * Discovery sayfası için optimize edilmiş veri yapısı
 */
export interface DenormalizedDiscovery {
  id: string;
  version: string;
  
  // Tüm lane'leri tek dokümanda
  lanes: {
    trending: {
      novels: DenormalizedNovelSummary[];
      metadata: {
        algorithm: string;
        timeRange: 'daily' | 'weekly' | 'monthly';
        lastCalculated: Timestamp;
        totalCandidates: number;
      };
    };
    newArrivals: {
      novels: DenormalizedNovelSummary[];
      metadata: {
        daysBack: number;
        minChapterCount: number;
        lastCalculated: Timestamp;
        totalCandidates: number;
      };
    };
    editorsChoice: {
      novels: DenormalizedNovelSummary[];
      metadata: {
        selectionCriteria: string[];
        lastReviewed: Timestamp;
        reviewedBy: string;
        totalCandidates: number;
      };
    };
    categoryFeatured: Record<string, {
      novels: DenormalizedNovelSummary[];
      metadata: {
        category: string;
        sortBy: 'rating' | 'views' | 'recent';
        lastCalculated: Timestamp;
        totalCandidates: number;
      };
    }>;
  };
  
  // Global metadata
  metadata: {
    totalNovels: number;
    totalAuthors: number;
    totalCategories: number;
    lastFullRefresh: Timestamp;
    nextScheduledRefresh: Timestamp;
    cacheVersion: string;
  };
  
  // Performance tracking
  performance: {
    generationTime: number; // milliseconds
    dataFreshness: number; // minutes since last source update
    compressionRatio: number;
    estimatedSavings: {
      readOperations: number;
      responseTime: number;
      bandwidth: number;
    };
  };
  
  // Denormalization metadata
  denormalizationMetadata: {
    version: string;
    lastSyncAt: Timestamp;
    sourceCollections: string[];
    syncStatus: 'synced' | 'pending' | 'error';
    errorCount: number;
  };
}

/**
 * Denormalized Novel Summary Interface
 * Discovery ve listing için optimize edilmiş novel özeti
 */
export interface DenormalizedNovelSummary {
  id: string;
  title: string;
  slug: string;
  author: string;
  authorId: string;
  coverUrl?: string;
  rating: number;
  reviewCount: number;
  viewCount: number;
  chapterCount: number;
  categories: string[];
  categoryIds: string[];
  tags: string[];
  status: string;
  publishedAt: Timestamp;
  lastUpdated: Timestamp;
  
  // Discovery-specific fields
  trendingScore?: number;
  popularityRank?: number;
  qualityScore?: number;
  isNewArrival?: boolean;
  isEditorsChoice?: boolean;
  isFeatured?: boolean;
}

/**
 * Denormalization Configuration Interface
 */
export interface DenormalizationConfig {
  // Sync intervals (minutes)
  syncIntervals: {
    novels: number;
    users: number;
    discovery: number;
    stats: number;
  };
  
  // Batch sizes
  batchSizes: {
    novels: number;
    users: number;
    discovery: number;
  };
  
  // Error handling
  maxRetries: number;
  retryDelay: number; // milliseconds
  errorThreshold: number; // max errors before disabling sync
  
  // Performance settings
  enableCompression: boolean;
  enableMetrics: boolean;
  enableAutoCleanup: boolean;
  
  // Collection names
  collections: {
    denormalizedNovels: string;
    denormalizedUsers: string;
    denormalizedDiscovery: string;
    syncLog: string;
  };
}

/**
 * Sync Log Entry Interface
 */
export interface SyncLogEntry {
  id: string;
  operation: 'create' | 'update' | 'delete' | 'batch_sync';
  collection: string;
  documentId: string;
  sourceCollections: string[];
  status: 'success' | 'error' | 'partial';
  startTime: Timestamp;
  endTime: Timestamp;
  duration: number; // milliseconds
  recordsProcessed: number;
  errorMessage?: string;
  metadata: {
    version: string;
    triggeredBy: 'manual' | 'scheduled' | 'realtime' | 'batch';
    dataSize: number; // bytes
    compressionRatio?: number;
  };
}

/**
 * Denormalization Manager Class
 * Ana denormalizasyon yönetim sınıfı
 */
export class DenormalizationManager {
  private config: DenormalizationConfig;
  private syncListeners: Map<string, () => void> = new Map();
  private isInitialized = false;

  constructor(config?: Partial<DenormalizationConfig>) {
    this.config = {
      syncIntervals: {
        novels: 30, // 30 minutes
        users: 60, // 1 hour
        discovery: 15, // 15 minutes
        stats: 5 // 5 minutes
      },
      batchSizes: {
        novels: 50,
        users: 100,
        discovery: 10
      },
      maxRetries: 3,
      retryDelay: 5000,
      errorThreshold: 10,
      enableCompression: true,
      enableMetrics: true,
      enableAutoCleanup: true,
      collections: {
        denormalizedNovels: 'denormalized_novels',
        denormalizedUsers: 'denormalized_users',
        denormalizedDiscovery: 'denormalized_discovery',
        syncLog: 'denormalization_sync_log'
      },
      ...config
    };
  }

  /**
   * Denormalization manager'ı başlatır
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Real-time sync listener'larını kur
      await this.setupRealtimeSyncListeners();
      
      // Scheduled sync'leri başlat
      this.startScheduledSyncs();
      
      // İlk full sync'i çalıştır
      await this.performInitialSync();
      
      this.isInitialized = true;
      console.log('Denormalization Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Denormalization Manager:', error);
      throw error;
    }
  }

  /**
   * Belirli bir novel için denormalized data oluşturur/günceller
   */
  async syncNovel(novelId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Source data'yı topla
      const sourceData = await this.gatherNovelSourceData(novelId);
      
      if (!sourceData) {
        console.warn(`No source data found for novel ${novelId}`);
        return;
      }

      // Denormalized document oluştur
      const denormalizedNovel = this.createDenormalizedNovel(sourceData);
      
      // Firestore'a kaydet
      const docRef = doc(db, this.config.collections.denormalizedNovels, novelId);
      await setDoc(docRef, denormalizedNovel, { merge: true });
      
      // Sync log'a kaydet
      await this.logSyncOperation({
        operation: 'update',
        collection: this.config.collections.denormalizedNovels,
        documentId: novelId,
        sourceCollections: ['novels', 'authors', 'categories', 'novel_stats'],
        status: 'success',
        startTime: Timestamp.fromMillis(startTime),
        endTime: Timestamp.now(),
        duration: Date.now() - startTime,
        recordsProcessed: 1,
        metadata: {
          version: '1.0.0',
          triggeredBy: 'manual',
          dataSize: JSON.stringify(denormalizedNovel).length
        }
      });

      console.log(`Successfully synced novel ${novelId}`);
    } catch (error) {
      console.error(`Failed to sync novel ${novelId}:`, error);
      
      // Error log'a kaydet
      await this.logSyncOperation({
        operation: 'update',
        collection: this.config.collections.denormalizedNovels,
        documentId: novelId,
        sourceCollections: ['novels', 'authors', 'categories', 'novel_stats'],
        status: 'error',
        startTime: Timestamp.fromMillis(startTime),
        endTime: Timestamp.now(),
        duration: Date.now() - startTime,
        recordsProcessed: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          version: '1.0.0',
          triggeredBy: 'manual',
          dataSize: 0
        }
      });
      
      throw error;
    }
  }

  /**
   * Discovery data için denormalized document oluşturur
   */
  async syncDiscoveryData(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Tüm discovery lane'leri için data topla
      const discoveryData = await this.gatherDiscoverySourceData();
      
      // Denormalized discovery document oluştur
      const denormalizedDiscovery = this.createDenormalizedDiscovery(discoveryData);
      
      // Firestore'a kaydet
      const docRef = doc(db, this.config.collections.denormalizedDiscovery, 'main');
      await setDoc(docRef, denormalizedDiscovery);
      
      // Sync log'a kaydet
      await this.logSyncOperation({
        operation: 'update',
        collection: this.config.collections.denormalizedDiscovery,
        documentId: 'main',
        sourceCollections: ['novels', 'authors', 'categories', 'novel_stats'],
        status: 'success',
        startTime: Timestamp.fromMillis(startTime),
        endTime: Timestamp.now(),
        duration: Date.now() - startTime,
        recordsProcessed: 1,
        metadata: {
          version: '1.0.0',
          triggeredBy: 'scheduled',
          dataSize: JSON.stringify(denormalizedDiscovery).length,
          compressionRatio: this.config.enableCompression ? 0.7 : 1.0
        }
      });

      console.log('Successfully synced discovery data');
    } catch (error) {
      console.error('Failed to sync discovery data:', error);
      throw error;
    }
  }

  /**
   * Batch sync işlemi - birden fazla document'i aynı anda sync eder
   */
  async batchSyncNovels(novelIds: string[]): Promise<void> {
    const startTime = Date.now();
    const batch = writeBatch(db);
    let processedCount = 0;
    
    try {
      // Batch'leri böl (Firestore 500 operation limiti)
      const batchSize = Math.min(this.config.batchSizes.novels, 500);
      const batches = this.chunkArray(novelIds, batchSize);
      
      for (const batchIds of batches) {
        const batchPromises = batchIds.map(async (novelId) => {
          try {
            const sourceData = await this.gatherNovelSourceData(novelId);
            if (sourceData) {
              const denormalizedNovel = this.createDenormalizedNovel(sourceData);
              const docRef = doc(db, this.config.collections.denormalizedNovels, novelId);
              batch.set(docRef, denormalizedNovel, { merge: true });
              processedCount++;
            }
          } catch (error) {
            console.error(`Failed to prepare batch sync for novel ${novelId}:`, error);
          }
        });
        
        await Promise.all(batchPromises);
      }
      
      // Batch'i commit et
      await batch.commit();
      
      // Sync log'a kaydet
      await this.logSyncOperation({
        operation: 'batch_sync',
        collection: this.config.collections.denormalizedNovels,
        documentId: `batch_${Date.now()}`,
        sourceCollections: ['novels', 'authors', 'categories', 'novel_stats'],
        status: 'success',
        startTime: Timestamp.fromMillis(startTime),
        endTime: Timestamp.now(),
        duration: Date.now() - startTime,
        recordsProcessed: processedCount,
        metadata: {
          version: '1.0.0',
          triggeredBy: 'batch',
          dataSize: processedCount * 1024 // Estimated
        }
      });

      console.log(`Successfully batch synced ${processedCount} novels`);
    } catch (error) {
      console.error('Batch sync failed:', error);
      throw error;
    }
  }

  /**
   * Denormalized novel data'yı getirir
   */
  async getDenormalizedNovel(novelId: string): Promise<DenormalizedNovel | null> {
    try {
      const docRef = doc(db, this.config.collections.denormalizedNovels, novelId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as DenormalizedNovel;
      }
      
      // Denormalized data yoksa sync'i tetikle
      console.log(`Denormalized data not found for novel ${novelId}, triggering sync`);
      await this.syncNovel(novelId);
      
      // Tekrar dene
      const retrySnap = await getDoc(docRef);
      return retrySnap.exists() ? retrySnap.data() as DenormalizedNovel : null;
    } catch (error) {
      console.error(`Failed to get denormalized novel ${novelId}:`, error);
      return null;
    }
  }

  /**
   * Denormalized discovery data'yı getirir
   */
  async getDenormalizedDiscovery(): Promise<DenormalizedDiscovery | null> {
    try {
      const docRef = doc(db, this.config.collections.denormalizedDiscovery, 'main');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as DenormalizedDiscovery;
        
        // Data freshness kontrolü
        const now = Date.now();
        const lastSync = data.denormalizationMetadata.lastSyncAt.toMillis();
        const maxAge = this.config.syncIntervals.discovery * 60 * 1000; // minutes to ms
        
        if (now - lastSync > maxAge) {
          console.log('Discovery data is stale, triggering refresh');
          // Background'da refresh et
          this.syncDiscoveryData().catch(console.error);
        }
        
        return data;
      }
      
      // Data yoksa sync'i tetikle
      console.log('Denormalized discovery data not found, triggering sync');
      await this.syncDiscoveryData();
      
      // Tekrar dene
      const retrySnap = await getDoc(docRef);
      return retrySnap.exists() ? retrySnap.data() as DenormalizedDiscovery : null;
    } catch (error) {
      console.error('Failed to get denormalized discovery data:', error);
      return null;
    }
  }

  /**
   * Sync performans raporunu getirir
   */
  async getSyncPerformanceReport(): Promise<{
    totalSyncs: number;
    successRate: number;
    averageDuration: number;
    totalDataSize: number;
    estimatedSavings: {
      readOperations: number;
      responseTime: number;
      bandwidth: number;
    };
  }> {
    try {
      // Son 24 saat içindeki sync log'larını al
      const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
      const syncLogRef = collection(db, this.config.collections.syncLog);
      const recentSyncsQuery = query(
        syncLogRef,
        where('startTime', '>=', oneDayAgo),
        orderBy('startTime', 'desc'),
        limit(1000)
      );
      
      const querySnapshot = await getDocs(recentSyncsQuery);
      const syncLogs = querySnapshot.docs.map(doc => doc.data() as SyncLogEntry);
      
      const totalSyncs = syncLogs.length;
      const successfulSyncs = syncLogs.filter(log => log.status === 'success').length;
      const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;
      const averageDuration = syncLogs.reduce((sum, log) => sum + log.duration, 0) / totalSyncs;
      const totalDataSize = syncLogs.reduce((sum, log) => sum + log.metadata.dataSize, 0);
      
      // Estimated savings calculation
      const estimatedReadSavings = totalSyncs * 3; // Assume each denormalized read saves 3 regular reads
      const estimatedTimeSavings = totalSyncs * 150; // Assume 150ms saved per denormalized read
      const estimatedBandwidthSavings = totalDataSize * 0.3; // 30% bandwidth savings from denormalization
      
      return {
        totalSyncs,
        successRate,
        averageDuration,
        totalDataSize,
        estimatedSavings: {
          readOperations: estimatedReadSavings,
          responseTime: estimatedTimeSavings,
          bandwidth: estimatedBandwidthSavings
        }
      };
    } catch (error) {
      console.error('Failed to get sync performance report:', error);
      return {
        totalSyncs: 0,
        successRate: 0,
        averageDuration: 0,
        totalDataSize: 0,
        estimatedSavings: {
          readOperations: 0,
          responseTime: 0,
          bandwidth: 0
        }
      };
    }
  }

  /**
   * Cleanup işlemi - eski sync log'larını ve stale data'yı temizler
   */
  async cleanup(): Promise<void> {
    if (!this.config.enableAutoCleanup) return;

    try {
      // 30 günden eski sync log'larını sil
      const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const syncLogRef = collection(db, this.config.collections.syncLog);
      const oldLogsQuery = query(
        syncLogRef,
        where('startTime', '<', thirtyDaysAgo),
        limit(100)
      );
      
      const querySnapshot = await getDocs(oldLogsQuery);
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (querySnapshot.docs.length > 0) {
        await batch.commit();
        console.log(`Cleaned up ${querySnapshot.docs.length} old sync log entries`);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Manager'ı durdurur ve listener'ları temizler
   */
  async shutdown(): Promise<void> {
    // Real-time listener'ları durdur
    this.syncListeners.forEach(unsubscribe => unsubscribe());
    this.syncListeners.clear();
    
    // Final cleanup
    await this.cleanup();
    
    this.isInitialized = false;
    console.log('Denormalization Manager shut down');
  }

  // Private helper methods

  private async setupRealtimeSyncListeners(): Promise<void> {
    // Novel updates için listener
    const novelsRef = collection(db, 'novels');
    const novelListener = onSnapshot(novelsRef, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
          // Background'da sync et
          this.syncNovel(change.doc.id).catch(console.error);
        }
      });
    });
    
    this.syncListeners.set('novels', novelListener);
    
    // Diğer collection'lar için de benzer listener'lar eklenebilir
  }

  private startScheduledSyncs(): void {
    // Discovery data için scheduled sync
    setInterval(() => {
      this.syncDiscoveryData().catch(console.error);
    }, this.config.syncIntervals.discovery * 60 * 1000);
    
    // Cleanup için scheduled task
    setInterval(() => {
      this.cleanup().catch(console.error);
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private async performInitialSync(): Promise<void> {
    console.log('Performing initial denormalization sync...');
    
    try {
      // Discovery data'yı sync et
      await this.syncDiscoveryData();
      
      console.log('Initial sync completed');
    } catch (error) {
      console.error('Initial sync failed:', error);
    }
  }

  private async gatherNovelSourceData(novelId: string): Promise<any> {
    // Bu method gerçek implementasyonda source collection'lardan veri toplayacak
    // Şimdilik mock data döndürüyoruz
    return {
      id: novelId,
      title: `Novel ${novelId}`,
      author: { id: 'author1', name: 'Test Author' },
      categories: [{ id: 'cat1', name: 'Fantasy' }],
      stats: { rating: 4.5, reviewCount: 100, viewCount: 1000 }
    };
  }

  private createDenormalizedNovel(sourceData: any): DenormalizedNovel {
    return {
      id: sourceData.id,
      title: sourceData.title,
      slug: sourceData.slug || sourceData.id,
      description: sourceData.description || '',
      coverUrl: sourceData.coverUrl,
      status: sourceData.status || 'active',
      author: {
        id: sourceData.author.id,
        name: sourceData.author.name,
        profileUrl: sourceData.author.profileUrl,
        followerCount: sourceData.author.followerCount || 0,
        novelCount: sourceData.author.novelCount || 1
      },
      categories: sourceData.categories || [],
      stats: {
        rating: sourceData.stats.rating || 0,
        reviewCount: sourceData.stats.reviewCount || 0,
        viewCount: sourceData.stats.viewCount || 0,
        likeCount: sourceData.stats.likeCount || 0,
        chapterCount: sourceData.stats.chapterCount || 0,
        wordCount: sourceData.stats.wordCount || 0,
        readingTime: sourceData.stats.readingTime || 0
      },
      discoveryMetadata: {
        trendingScore: sourceData.discoveryMetadata?.trendingScore || 0,
        isNewArrival: sourceData.discoveryMetadata?.isNewArrival || false,
        isEditorsChoice: sourceData.discoveryMetadata?.isEditorsChoice || false,
        primaryGenre: sourceData.discoveryMetadata?.primaryGenre || 'Unknown',
        popularityRank: sourceData.discoveryMetadata?.popularityRank || 0,
        qualityScore: sourceData.discoveryMetadata?.qualityScore || 0,
        engagementScore: sourceData.discoveryMetadata?.engagementScore || 0
      },
      publishedAt: sourceData.publishedAt || Timestamp.now(),
      lastUpdated: Timestamp.now(),
      lastChapterAt: sourceData.lastChapterAt,
      denormalizationMetadata: {
        version: '1.0.0',
        lastSyncAt: Timestamp.now(),
        sourceCollections: ['novels', 'authors', 'categories', 'novel_stats'],
        syncStatus: 'synced',
        errorCount: 0
      }
    };
  }

  private async gatherDiscoverySourceData(): Promise<any> {
    // Bu method gerçek implementasyonda discovery için gerekli tüm veriyi toplayacak
    // Şimdilik mock data döndürüyoruz
    return {
      trending: [],
      newArrivals: [],
      editorsChoice: [],
      categoryFeatured: {}
    };
  }

  private createDenormalizedDiscovery(sourceData: any): DenormalizedDiscovery {
    return {
      id: `discovery_${Date.now()}`,
      version: '1.0.0',
      lanes: {
        trending: {
          novels: [],
          metadata: {
            algorithm: 'weighted_score',
            timeRange: 'weekly',
            lastCalculated: Timestamp.now(),
            totalCandidates: 0
          }
        },
        newArrivals: {
          novels: [],
          metadata: {
            daysBack: 30,
            minChapterCount: 1,
            lastCalculated: Timestamp.now(),
            totalCandidates: 0
          }
        },
        editorsChoice: {
          novels: [],
          metadata: {
            selectionCriteria: ['quality', 'engagement', 'uniqueness'],
            lastReviewed: Timestamp.now(),
            reviewedBy: 'editorial_team',
            totalCandidates: 0
          }
        },
        categoryFeatured: {}
      },
      metadata: {
        totalNovels: 0,
        totalAuthors: 0,
        totalCategories: 0,
        lastFullRefresh: Timestamp.now(),
        nextScheduledRefresh: Timestamp.fromMillis(Date.now() + 15 * 60 * 1000),
        cacheVersion: '1.0.0'
      },
      performance: {
        generationTime: 0,
        dataFreshness: 0,
        compressionRatio: 0.7,
        estimatedSavings: {
          readOperations: 0,
          responseTime: 0,
          bandwidth: 0
        }
      },
      denormalizationMetadata: {
        version: '1.0.0',
        lastSyncAt: Timestamp.now(),
        sourceCollections: ['novels', 'authors', 'categories', 'novel_stats'],
        syncStatus: 'synced',
        errorCount: 0
      }
    };
  }

  private async logSyncOperation(entry: Omit<SyncLogEntry, 'id'>): Promise<void> {
    try {
      const logEntry: SyncLogEntry = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...entry
      };
      
      const docRef = doc(db, this.config.collections.syncLog, logEntry.id);
      await setDoc(docRef, logEntry);
    } catch (error) {
      console.error('Failed to log sync operation:', error);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Singleton instance
let denormalizationManager: DenormalizationManager | null = null;

/**
 * Global denormalization manager instance'ını döndürür
 */
export function getDenormalizationManager(config?: Partial<DenormalizationConfig>): DenormalizationManager {
  if (!denormalizationManager) {
    denormalizationManager = new DenormalizationManager(config);
  }
  return denormalizationManager;
}

/**
 * Denormalization manager instance'ını sıfırlar (test için)
 */
export function resetDenormalizationManager(): void {
  if (denormalizationManager) {
    denormalizationManager.shutdown().catch(console.error);
    denormalizationManager = null;
  }
}