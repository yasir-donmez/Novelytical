/**
 * Property-Based Tests for Discovery Data Service
 * 
 * Tests universal properties for discovery endpoint optimizations
 */

import { 
  DiscoveryDataService, 
  getDiscoveryDataService, 
  resetDiscoveryDataService,
  UnifiedDiscoveryOptions 
} from '../discovery';
import { getCacheManager } from '@/lib/cache';

// Mock Firebase discovery optimizer
jest.mock('@/lib/firebase/discovery-optimizer', () => {
  const mockOptimizer = {
    getUnifiedDiscoveryData: jest.fn(),
    getTrendingOptimized: jest.fn(),
    getCategoryOptimizedData: jest.fn(),
    getDiscoveryVariant: jest.fn(),
    invalidateDiscoveryCache: jest.fn(),
    getPerformanceReport: jest.fn()
  };
  
  return {
    getDiscoveryOptimizer: jest.fn(() => mockOptimizer),
    resetDiscoveryOptimizer: jest.fn(),
    DiscoveryOptimizer: jest.fn(() => mockOptimizer)
  };
});

describe('Discovery Data Service Properties', () => {
  let discoveryService: DiscoveryDataService;
  let mockOptimizer: any;

  beforeEach(() => {
    resetDiscoveryDataService();
    
    const { getDiscoveryOptimizer } = require('@/lib/firebase/discovery-optimizer');
    mockOptimizer = getDiscoveryOptimizer();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create service after mocks are set up
    discoveryService = getDiscoveryDataService();
  });

  afterEach(() => {
    resetDiscoveryDataService();
  });

  /**
   * Property 12: Denormalization Query Optimization
   * Denormalized data structures should reduce query complexity and improve response times
   * **Validates: Requirements 3.5**
   */
  describe('Property 12: Denormalization Query Optimization', () => {
    it('should use denormalized data to reduce query complexity', async () => {
      // Arrange
      const mockDenormalizedData = {
        trending: [
          {
            id: 'novel1',
            title: 'Test Novel 1',
            author: 'Test Author 1',
            rating: 4.5,
            reviewCount: 100,
            viewCount: 1000,
            chapterCount: 50,
            categories: ['Fantastik', 'Aksiyon'],
            publishedDate: new Date('2024-01-01'),
            lastUpdated: new Date('2024-01-15'),
            // Denormalized fields
            authorId: 'author1',
            categoryIds: ['cat1', 'cat2'],
            tags: ['fantasy', 'action'],
            status: 'active',
            featured: true,
            rank: 1
          }
        ],
        newArrivals: [
          {
            id: 'novel2',
            title: 'Test Novel 2',
            author: 'Test Author 2',
            rating: 4.2,
            reviewCount: 80,
            viewCount: 800,
            chapterCount: 30,
            categories: ['Romantik'],
            publishedDate: new Date('2024-02-01'),
            lastUpdated: new Date('2024-02-10'),
            // Denormalized fields
            authorId: 'author2',
            categoryIds: ['cat3'],
            tags: ['romance'],
            status: 'active'
          }
        ],
        editorsPick: [
          {
            id: 'novel3',
            title: 'Test Novel 3',
            author: 'Test Author 3',
            rating: 4.8,
            reviewCount: 150,
            viewCount: 1500,
            chapterCount: 75,
            categories: ['Bilim Kurgu'],
            publishedDate: new Date('2024-01-20'),
            lastUpdated: new Date('2024-02-05'),
            // Denormalized fields
            authorId: 'author3',
            categoryIds: ['cat4'],
            tags: ['sci-fi'],
            status: 'active',
            featured: true
          }
        ],
        fantasyNovels: [
          {
            id: 'novel4',
            title: 'Test Novel 4',
            author: 'Test Author 4',
            rating: 4.3,
            reviewCount: 90,
            viewCount: 900,
            chapterCount: 40,
            categories: ['Fantastik'],
            publishedDate: new Date('2024-01-10'),
            lastUpdated: new Date('2024-01-25'),
            // Denormalized fields
            authorId: 'author4',
            categoryIds: ['cat1'],
            tags: ['fantasy'],
            status: 'active'
          }
        ],
        metadata: {
          lastUpdated: Date.now(),
          cacheHit: false,
          totalReads: 4, // Reduced from potential 16+ reads due to denormalization
          optimizationRatio: 75 // 75% optimization
        }
      };

      mockOptimizer.getUnifiedDiscoveryData.mockResolvedValue(mockDenormalizedData);

      // Act
      const result = await discoveryService.getUnifiedDiscoveryData();

      // Assert
      expect(result).toBeDefined();
      expect(result.data.trending.novels).toHaveLength(1);
      expect(result.data.newArrivals.novels).toHaveLength(1);
      expect(result.data.editorsPick.novels).toHaveLength(1);
      expect(result.data.fantasyNovels.novels).toHaveLength(1);

      // Verify denormalized fields are preserved
      const trendingNovel = result.data.trending.novels[0];
      expect(trendingNovel.authorId).toBe('author1');
      expect(trendingNovel.categoryIds).toEqual(['cat1', 'cat2']);
      expect(trendingNovel.tags).toEqual(['fantasy', 'action']);
      expect(trendingNovel.status).toBe('active');

      // Verify optimization metrics show reduced complexity
      expect(result.performance.totalReads).toBe(4);
      expect(result.performance.optimizationRatio).toBe(75);

      // Verify single call to optimizer (denormalized data fetched in one operation)
      expect(mockOptimizer.getUnifiedDiscoveryData).toHaveBeenCalledTimes(1);
    });

    it('should handle denormalized category data efficiently', async () => {
      // Arrange
      const mockCategoryData = Array.from({ length: 20 }, (_, i) => ({
        id: `novel_${i}`,
        title: `Fantasy Novel ${i}`,
        author: `Author ${i}`,
        rating: 4.0 + (i % 10) * 0.1,
        reviewCount: 50 + i * 5,
        viewCount: 500 + i * 50,
        chapterCount: 20 + i * 2,
        categories: ['Fantastik'],
        publishedDate: new Date(2024, 0, 1 + i),
        lastUpdated: new Date(2024, 0, 15 + i),
        // Denormalized category data
        categoryIds: ['fantasy_cat'],
        tags: ['fantasy', 'adventure'],
        status: 'active',
        // Pre-computed aggregations
        categoryRank: i + 1,
        categoryScore: 4.0 + (i % 10) * 0.1
      }));

      mockOptimizer.getCategoryOptimizedData.mockResolvedValue(mockCategoryData);

      // Act
      const result = await discoveryService.getDiscoveryLane('fantasy');

      // Assert
      expect(result.novels).toHaveLength(20);
      
      // Verify denormalized category data is used
      result.novels.forEach((novel, index) => {
        expect(novel.categoryIds).toEqual(['fantasy_cat']);
        expect(novel.tags).toContain('fantasy');
        expect(novel.status).toBe('active');
      });

      // Verify efficient single query execution
      expect(mockOptimizer.getCategoryOptimizedData).toHaveBeenCalledTimes(1);
      expect(mockOptimizer.getCategoryOptimizedData).toHaveBeenCalledWith('Fantastik', 'rating');
    });

    it('should optimize author data through denormalization', async () => {
      // Arrange
      const mockAuthorDenormalizedData = {
        trending: [
          {
            id: 'novel1',
            title: 'Novel by Popular Author',
            author: 'Popular Author',
            rating: 4.7,
            reviewCount: 200,
            viewCount: 2000,
            chapterCount: 60,
            categories: ['Fantastik'],
            publishedDate: new Date('2024-01-01'),
            lastUpdated: new Date('2024-01-20'),
            // Denormalized author data
            authorId: 'author_123',
            tags: ['fantasy'],
            status: 'active'
          }
        ],
        newArrivals: [],
        editorsPick: [],
        fantasyNovels: [],
        metadata: {
          lastUpdated: Date.now(),
          cacheHit: false,
          totalReads: 1,
          optimizationRatio: 90
        }
      };

      mockOptimizer.getUnifiedDiscoveryData.mockResolvedValue(mockAuthorDenormalizedData);

      // Act
      const result = await discoveryService.getUnifiedDiscoveryData();

      // Assert
      const trendingNovel = result.data.trending.novels[0];
      
      // Verify author denormalized data is available
      expect(trendingNovel.authorId).toBe('author_123');
      expect(trendingNovel.tags).toBeDefined();
      expect(trendingNovel.status).toBe('active');

      // Verify optimization through denormalization
      expect(result.performance.optimizationRatio).toBe(90);
      expect(result.performance.totalReads).toBe(1);
    });

    it('should handle complex denormalized queries with multiple constraints', async () => {
      // Arrange
      const complexDenormalizedData = {
        trending: Array.from({ length: 10 }, (_, i) => ({
          id: `trending_${i}`,
          title: `Trending Novel ${i}`,
          author: `Trending Author ${i}`,
          rating: 4.5 + (i % 5) * 0.1,
          reviewCount: 100 + i * 10,
          viewCount: 1000 + i * 100,
          chapterCount: 30 + i * 5,
          categories: i % 2 === 0 ? ['Fantastik'] : ['Aksiyon'],
          publishedDate: new Date(2024, 0, 1 + i),
          lastUpdated: new Date(2024, 0, 15 + i),
          // Complex denormalized constraints
          authorId: `author_${i}`,
          categoryIds: i % 2 === 0 ? ['cat_fantasy'] : ['cat_action'],
          tags: i % 2 === 0 ? ['fantasy', 'magic'] : ['action', 'adventure'],
          status: 'active',
          featured: i < 3
        })),
        newArrivals: [],
        editorsPick: [],
        fantasyNovels: [],
        metadata: {
          lastUpdated: Date.now(),
          cacheHit: false,
          totalReads: 1, // Single denormalized query instead of multiple joins
          optimizationRatio: 85
        }
      };

      mockOptimizer.getUnifiedDiscoveryData.mockResolvedValue(complexDenormalizedData);

      // Act
      const result = await discoveryService.getUnifiedDiscoveryData({
        limits: { trending: 10 },
        timeRanges: { trending: 'weekly' }
      });

      // Assert
      expect(result.data.trending.novels).toHaveLength(10);
      
      // Verify complex denormalized data is properly structured
      result.data.trending.novels.forEach((novel, index) => {
        expect(novel.authorId).toBe(`author_${index}`);
        expect(novel.categoryIds).toBeDefined();
        expect(novel.tags).toBeDefined();
        expect(novel.status).toBe('active');
        
        // Verify category-specific denormalization
        if (index % 2 === 0) {
          expect(novel.categoryIds).toEqual(['cat_fantasy']);
          expect(novel.tags).toContain('fantasy');
        } else {
          expect(novel.categoryIds).toEqual(['cat_action']);
          expect(novel.tags).toContain('action');
        }
      });

      // Verify optimization through denormalization
      expect(result.performance.totalReads).toBe(1);
      expect(result.performance.optimizationRatio).toBe(85);
    });

    it('should maintain data consistency across denormalized structures', async () => {
      // Arrange
      const consistentDenormalizedData = {
        trending: [
          {
            id: 'novel_consistent',
            title: 'Consistent Novel',
            author: 'Consistent Author',
            rating: 4.6,
            reviewCount: 120,
            viewCount: 1200,
            chapterCount: 45,
            categories: ['Fantastik', 'Macera'],
            publishedDate: new Date('2024-01-15'),
            lastUpdated: new Date('2024-02-01'),
            // Consistent denormalized data
            authorId: 'author_consistent',
            categoryIds: ['cat_fantasy', 'cat_adventure'],
            tags: ['fantasy', 'adventure', 'magic'],
            status: 'active',
            featured: true
          }
        ],
        newArrivals: [
          {
            id: 'novel_consistent', // Same novel in different lane
            title: 'Consistent Novel',
            author: 'Consistent Author',
            rating: 4.6,
            reviewCount: 120,
            viewCount: 1200,
            chapterCount: 45,
            categories: ['Fantastik', 'Macera'],
            publishedDate: new Date('2024-01-15'),
            lastUpdated: new Date('2024-02-01'),
            // Must be consistent across lanes
            authorId: 'author_consistent',
            categoryIds: ['cat_fantasy', 'cat_adventure'],
            tags: ['fantasy', 'adventure', 'magic'],
            status: 'active',
            featured: true
          }
        ],
        editorsPick: [],
        fantasyNovels: [],
        metadata: {
          lastUpdated: Date.now(),
          cacheHit: false,
          totalReads: 1,
          optimizationRatio: 80
        }
      };

      mockOptimizer.getUnifiedDiscoveryData.mockResolvedValue(consistentDenormalizedData);

      // Act
      const result = await discoveryService.getUnifiedDiscoveryData();

      // Assert
      const trendingNovel = result.data.trending.novels[0];
      const newArrivalNovel = result.data.newArrivals.novels[0];

      // Verify consistency across lanes
      expect(trendingNovel.id).toBe(newArrivalNovel.id);
      expect(trendingNovel.authorId).toBe(newArrivalNovel.authorId);
      expect(trendingNovel.categoryIds).toEqual(newArrivalNovel.categoryIds);
      expect(trendingNovel.tags).toEqual(newArrivalNovel.tags);
      expect(trendingNovel.status).toBe(newArrivalNovel.status);
      expect(trendingNovel.rating).toBe(newArrivalNovel.rating);

      // Verify denormalized data integrity
      expect(trendingNovel.categories).toEqual(['Fantastik', 'Macera']);
      expect(trendingNovel.categoryIds).toEqual(['cat_fantasy', 'cat_adventure']);
      expect(trendingNovel.tags).toEqual(['fantasy', 'adventure', 'magic']);
    });

    it('should optimize performance through denormalized aggregations', async () => {
      // Arrange
      const aggregatedDenormalizedData = {
        trending: Array.from({ length: 5 }, (_, i) => ({
          id: `novel_${i}`,
          title: `Novel ${i}`,
          author: `Author ${i}`,
          rating: 4.0 + i * 0.2,
          reviewCount: 80 + i * 20,
          viewCount: 800 + i * 200,
          chapterCount: 25 + i * 10,
          categories: ['Fantastik'],
          publishedDate: new Date(2024, 0, 1 + i * 5),
          lastUpdated: new Date(2024, 0, 10 + i * 5),
          // Pre-computed aggregations (denormalized)
          authorId: `author_${i}`,
          categoryIds: ['cat_fantasy'],
          tags: ['fantasy'],
          status: 'active'
        })),
        newArrivals: [],
        editorsPick: [],
        fantasyNovels: [],
        metadata: {
          lastUpdated: Date.now(),
          cacheHit: false,
          totalReads: 1, // Single query with pre-computed aggregations
          optimizationRatio: 95 // High optimization due to aggregations
        }
      };

      mockOptimizer.getUnifiedDiscoveryData.mockResolvedValue(aggregatedDenormalizedData);

      // Act
      const startTime = Date.now();
      const result = await discoveryService.getUnifiedDiscoveryData();
      const responseTime = Date.now() - startTime;

      // Assert
      expect(result.data.trending.novels).toHaveLength(5);
      
      // Verify aggregated data is available without additional queries
      result.data.trending.novels.forEach((novel, index) => {
        expect(novel.authorId).toBe(`author_${index}`);
        expect(novel.categoryIds).toEqual(['cat_fantasy']);
        expect(novel.tags).toEqual(['fantasy']);
        expect(novel.status).toBe('active');
      });

      // Verify performance optimization
      expect(result.performance.totalReads).toBe(1);
      expect(result.performance.optimizationRatio).toBe(95);
      expect(responseTime).toBeLessThan(100); // Should be fast due to denormalization

      // Verify single optimizer call
      expect(mockOptimizer.getUnifiedDiscoveryData).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Property 11: Selective Cache Invalidation
   * Cache sisteminin belirli pattern'lara göre seçici invalidation yapabilmesi
   * **Validates: Requirements 3.4**
   */
  describe('Property 11: Selective Cache Invalidation', () => {
    it('should invalidate cache entries matching specific patterns', async () => {
      // Arrange
      const cacheManager = getCacheManager();
      
      // Set up various cache entries with different patterns
      const cacheEntries = [
        { key: 'discovery_trending_weekly', data: { novels: ['novel1', 'novel2'] } },
        { key: 'discovery_new_arrivals_30d', data: { novels: ['novel3', 'novel4'] } },
        { key: 'discovery_editors_pick', data: { novels: ['novel5', 'novel6'] } },
        { key: 'user_profile_123', data: { name: 'User 123' } },
        { key: 'user_library_123', data: { books: ['book1', 'book2'] } },
        { key: 'novel_stats_456', data: { views: 1000, rating: 4.5 } }
      ];

      // Mock cache manager's memory and localStorage
      const mockMemoryDelete = jest.fn().mockResolvedValue(undefined);
      const mockLocalStorageDelete = jest.fn().mockResolvedValue(undefined);
      
      (cacheManager as any).memory = { delete: mockMemoryDelete };
      (cacheManager as any).localStorage = { delete: mockLocalStorageDelete };

      // Populate cache with test data
      for (const entry of cacheEntries) {
        await cacheManager.set(entry.key, entry.data, 'static');
      }

      // Act - Invalidate only discovery-related cache entries
      const discoveryPattern = /^discovery_/;
      
      // Mock getAllCacheKeys to return our test keys
      const mockGetAllCacheKeys = jest.spyOn(discoveryService as any, 'getAllCacheKeys')
        .mockResolvedValue(cacheEntries.map(e => e.key));
      
      const invalidatedKeys = await discoveryService.selectiveInvalidateCache([discoveryPattern], {
        dataTypes: ['static']
      });
      
      mockGetAllCacheKeys.mockRestore();

      // Assert - Discovery entries should be invalidated, others should remain
      const expectedInvalidatedKeys = [
        'discovery_trending_weekly',
        'discovery_new_arrivals_30d', 
        'discovery_editors_pick'
      ];
      
      expect(invalidatedKeys.sort()).toEqual(expectedInvalidatedKeys.sort());
      
      // Verify delete was called for discovery keys
      expect(mockMemoryDelete).toHaveBeenCalledTimes(3);
      expect(mockLocalStorageDelete).toHaveBeenCalledTimes(3);
    });

    it('should support multiple invalidation patterns simultaneously', async () => {
      // Arrange
      const cacheManager = getCacheManager();
      
      const cacheEntries = [
        { key: 'discovery_trending_daily', data: { type: 'trending' } },
        { key: 'discovery_new_weekly', data: { type: 'new' } },
        { key: 'user_profile_456', data: { type: 'profile' } },
        { key: 'user_settings_456', data: { type: 'settings' } },
        { key: 'novel_metadata_789', data: { type: 'metadata' } },
        { key: 'novel_chapters_789', data: { type: 'chapters' } }
      ];

      // Mock cache manager's memory and localStorage
      const mockMemoryDelete = jest.fn().mockResolvedValue(undefined);
      const mockLocalStorageDelete = jest.fn().mockResolvedValue(undefined);
      
      (cacheManager as any).memory = { delete: mockMemoryDelete };
      (cacheManager as any).localStorage = { delete: mockLocalStorageDelete };

      // Populate cache
      for (const entry of cacheEntries) {
        await cacheManager.set(entry.key, entry.data, 'dynamic');
      }

      // Act - Invalidate both discovery and user patterns
      const patterns = [/^discovery_/, /^user_/];
      
      // Mock getAllCacheKeys to return our test keys
      const mockGetAllCacheKeys = jest.spyOn(discoveryService as any, 'getAllCacheKeys')
        .mockResolvedValue(cacheEntries.map(e => e.key));
      
      const invalidatedKeys = await discoveryService.selectiveInvalidateCache(patterns, {
        dataTypes: ['dynamic']
      });
      
      mockGetAllCacheKeys.mockRestore();

      // Assert - Both discovery and user entries should be invalidated
      const expectedInvalidatedKeys = [
        'discovery_trending_daily',
        'discovery_new_weekly',
        'user_profile_456',
        'user_settings_456'
      ];
      
      expect(invalidatedKeys.sort()).toEqual(expectedInvalidatedKeys.sort());
    });

    it('should handle tag-based cache invalidation', async () => {
      // Arrange
      const cacheManager = getCacheManager();
      
      // Simulate cache entries with different data types (tags)
      const cacheEntries = [
        { key: 'trending_novels_fantasy', data: { category: 'fantasy' }, dataType: 'discovery' },
        { key: 'trending_novels_romance', data: { category: 'romance' }, dataType: 'discovery' },
        { key: 'user_preferences_123', data: { theme: 'dark' }, dataType: 'user' },
        { key: 'novel_stats_456', data: { views: 2000 }, dataType: 'stats' },
        { key: 'discovery_cache_v2', data: { version: 2 }, dataType: 'discovery' }
      ];

      // Mock cache manager's memory and localStorage
      const mockMemoryDelete = jest.fn().mockResolvedValue(undefined);
      const mockLocalStorageDelete = jest.fn().mockResolvedValue(undefined);
      
      (cacheManager as any).memory = { delete: mockMemoryDelete };
      (cacheManager as any).localStorage = { delete: mockLocalStorageDelete };

      // Populate cache with different data types
      for (const entry of cacheEntries) {
        await cacheManager.set(entry.key, entry.data, entry.dataType);
      }

      // Act - Invalidate all discovery-type cache entries
      const targetDataType = 'discovery';
      
      // Mock getAllCacheKeys to return our test keys
      const mockGetAllCacheKeys = jest.spyOn(discoveryService as any, 'getAllCacheKeys')
        .mockResolvedValue(cacheEntries.map(e => e.key));
      
      const invalidatedKeys = await discoveryService.selectiveInvalidateCache([], {
        dataTypes: [targetDataType]
      });
      
      mockGetAllCacheKeys.mockRestore();

      // Assert - Only discovery-type entries should be invalidated
      const expectedInvalidatedKeys = [
        'trending_novels_fantasy',
        'trending_novels_romance',
        'discovery_cache_v2'
      ];
      
      expect(invalidatedKeys.sort()).toEqual(expectedInvalidatedKeys.sort());
    });

    it('should support time-based selective invalidation', async () => {
      // Arrange
      const cacheManager = getCacheManager();
      const now = Date.now();
      
      // Create cache entries with different timestamps
      const oldTimestamp = now - (2 * 60 * 60 * 1000); // 2 hours ago
      const recentTimestamp = now - (30 * 60 * 1000); // 30 minutes ago
      
      const cacheEntries = [
        { key: 'old_discovery_data', data: { timestamp: oldTimestamp, content: 'old' } },
        { key: 'recent_discovery_data', data: { timestamp: recentTimestamp, content: 'recent' } },
        { key: 'current_discovery_data', data: { timestamp: now, content: 'current' } }
      ];

      // Mock cache manager's memory and localStorage
      const mockMemoryDelete = jest.fn().mockResolvedValue(undefined);
      const mockLocalStorageDelete = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockImplementation((key: string) => {
        const entry = cacheEntries.find(e => e.key === key);
        return Promise.resolve(entry ? entry.data : null);
      });
      
      (cacheManager as any).memory = { delete: mockMemoryDelete };
      (cacheManager as any).localStorage = { delete: mockLocalStorageDelete };
      (cacheManager as any).get = mockGet;

      // Populate cache
      for (const entry of cacheEntries) {
        await cacheManager.set(entry.key, entry.data, 'discovery');
      }

      // Act - Invalidate entries older than 1 hour
      const cutoffTime = now - (60 * 60 * 1000); // 1 hour ago
      
      // Mock getAllCacheKeys to return our test keys
      const mockGetAllCacheKeys = jest.spyOn(discoveryService as any, 'getAllCacheKeys')
        .mockResolvedValue(cacheEntries.map(e => e.key));
      
      // Override discovery service's cache manager with our mock
      (discoveryService as any).cacheManager = cacheManager;
      
      const invalidatedKeys = await discoveryService.selectiveInvalidateCache([], {
        dataTypes: ['discovery'],
        olderThan: cutoffTime
      });
      
      mockGetAllCacheKeys.mockRestore();

      // Assert - Only old entries should be invalidated
      expect(invalidatedKeys).toEqual(['old_discovery_data']);
    });

    it('should maintain cache consistency during selective invalidation', async () => {
      // Arrange
      const cacheManager = getCacheManager();
      
      // Create related cache entries that should be invalidated together
      const relatedEntries = [
        { key: 'discovery_trending_v1', data: { version: 1, novels: ['a', 'b'] } },
        { key: 'discovery_trending_metadata_v1', data: { version: 1, count: 2 } },
        { key: 'discovery_new_arrivals_v1', data: { version: 1, novels: ['c', 'd'] } },
        { key: 'discovery_new_arrivals_metadata_v1', data: { version: 1, count: 2 } },
        { key: 'user_cache_unrelated', data: { user: 'test' } }
      ];

      // Mock cache manager's memory and localStorage
      const mockMemoryDelete = jest.fn().mockResolvedValue(undefined);
      const mockLocalStorageDelete = jest.fn().mockResolvedValue(undefined);
      
      (cacheManager as any).memory = { delete: mockMemoryDelete };
      (cacheManager as any).localStorage = { delete: mockLocalStorageDelete };

      // Populate cache
      for (const entry of relatedEntries) {
        await cacheManager.set(entry.key, entry.data, 'discovery');
      }

      // Act - Invalidate all v1 discovery cache entries to maintain consistency
      const versionPattern = /_v1$/;
      const discoveryPattern = /^discovery_/;
      
      // Mock getAllCacheKeys to return our test keys
      const mockGetAllCacheKeys = jest.spyOn(discoveryService as any, 'getAllCacheKeys')
        .mockResolvedValue(relatedEntries.map(e => e.key));
      
      const invalidatedKeys = await discoveryService.selectiveInvalidateCache([discoveryPattern, versionPattern], {
        dataTypes: ['discovery']
      });
      
      mockGetAllCacheKeys.mockRestore();

      // Assert - All v1 discovery entries should be invalidated together
      const expectedInvalidatedKeys = [
        'discovery_trending_v1',
        'discovery_trending_metadata_v1',
        'discovery_new_arrivals_v1',
        'discovery_new_arrivals_metadata_v1'
      ];
      
      expect(invalidatedKeys.sort()).toEqual(expectedInvalidatedKeys.sort());
    });

    it('should handle invalidation of non-existent cache entries gracefully', async () => {
      // Arrange
      const cacheManager = getCacheManager();
      
      const existingEntries = [
        { key: 'existing_cache_1', data: { exists: true } },
        { key: 'existing_cache_2', data: { exists: true } }
      ];

      // Populate cache with existing entries
      for (const entry of existingEntries) {
        await cacheManager.set(entry.key, entry.data, 'test');
      }

      // Act - Try to invalidate both existing and non-existent entries
      const keysToInvalidate = [
        'existing_cache_1',
        'non_existent_cache_1',
        'existing_cache_2',
        'non_existent_cache_2'
      ];

      const invalidationResults: boolean[] = [];
      
      for (const key of keysToInvalidate) {
        try {
          await cacheManager.memory.delete(key);
          await cacheManager.localStorage.delete(key);
          invalidationResults.push(true);
        } catch (error) {
          invalidationResults.push(false);
        }
      }

      // Assert - All invalidation attempts should succeed (graceful handling)
      expect(invalidationResults).toEqual([true, true, true, true]);

      // Verify existing entries are actually invalidated
      for (const entry of existingEntries) {
        const cached = await cacheManager.get(entry.key, 'test');
        expect(cached).toBeNull();
      }

      // Verify non-existent entries don't cause errors
      const nonExistentCached1 = await cacheManager.get('non_existent_cache_1', 'test');
      const nonExistentCached2 = await cacheManager.get('non_existent_cache_2', 'test');
      
      expect(nonExistentCached1).toBeNull();
      expect(nonExistentCached2).toBeNull();
    });
  });
});