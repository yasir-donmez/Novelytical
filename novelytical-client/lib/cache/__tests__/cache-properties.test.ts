/**
 * Property-Based Tests for Cache System
 * 
 * Tests universal properties that should hold across all valid cache operations
 */

import { CacheManagerImpl, resetCacheManager } from '../cache-manager-impl';
import { DEFAULT_CACHE_CONFIG } from '../cache-manager';

describe('Cache System Properties', () => {
  let cacheManager: CacheManagerImpl;

  beforeEach(async () => {
    resetCacheManager();
    cacheManager = new CacheManagerImpl(DEFAULT_CACHE_CONFIG);
    // Wait a bit for background systems to initialize
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    if (cacheManager && typeof cacheManager.clear === 'function') {
      await cacheManager.clear();
    }
    resetCacheManager();
  });

  /**
   * Property 2: Cache Hit Efficiency
   * For any repeated data request within TTL period, the cache layer should serve 
   * the data without triggering new Firebase read operations
   * **Validates: Requirements 1.2, 5.3**
   */
  describe('Property 2: Cache Hit Efficiency', () => {
    it('should serve cached data for repeated requests within TTL period', async () => {
      // Arrange
      const testKey = 'test_user_profile_123';
      const testData = { 
        uid: '123', 
        username: 'testuser', 
        email: 'test@example.com',
        createdAt: new Date()
      };
      const ttl = 30 * 60 * 1000; // 30 minutes

      // Act - First request (cache miss)
      await cacheManager.set(testKey, testData, 'user', ttl);
      
      // Multiple requests within TTL
      const results = await Promise.all([
        cacheManager.get(testKey, 'user'),
        cacheManager.get(testKey, 'user'),
        cacheManager.get(testKey, 'user'),
        cacheManager.get(testKey, 'user'),
        cacheManager.get(testKey, 'user')
      ]);

      // Assert
      // All requests should return the same cached data
      results.forEach(result => {
        expect(result).toEqual(testData);
      });

      // Verify cache statistics show hits
      const stats = await cacheManager.getStats();
      expect(stats.memory.hitCount).toBeGreaterThan(0);
      expect(stats.overall.overallHitRate).toBeGreaterThan(0);
    });

    it('should maintain cache hit efficiency across different data types', async () => {
      // Arrange - Different data types with their respective TTLs
      const testCases = [
        { key: 'user_profile_456', data: { uid: '456', username: 'user456' }, type: 'user' },
        { key: 'novel_stats_789', data: { reviewCount: 10, viewCount: 100 }, type: 'stats' },
        { key: 'discovery_data', data: { trending: [], newArrivals: [] }, type: 'discovery' },
        { key: 'search_results_fantasy', data: { novels: [], total: 0 }, type: 'dynamic' }
      ];

      // Act - Set all data in cache
      for (const testCase of testCases) {
        await cacheManager.set(testCase.key, testCase.data, testCase.type);
      }

      // Multiple requests for each data type
      for (const testCase of testCases) {
        const results = await Promise.all([
          cacheManager.get(testCase.key, testCase.type),
          cacheManager.get(testCase.key, testCase.type),
          cacheManager.get(testCase.key, testCase.type)
        ]);

        // Assert - All requests should hit cache
        results.forEach(result => {
          expect(result).toEqual(testCase.data);
        });
      }

      // Verify overall cache efficiency
      const stats = await cacheManager.getStats();
      expect(stats.overall.overallHitRate).toBeGreaterThan(0.8); // 80% hit rate
    });

    it('should handle concurrent cache requests efficiently', async () => {
      // Arrange
      const testKey = 'concurrent_test_key';
      const testData = { id: 'concurrent', value: 'test_data', timestamp: Date.now() };
      
      await cacheManager.set(testKey, testData, 'dynamic');

      // Act - Simulate concurrent requests
      const concurrentRequests = Array.from({ length: 50 }, () => 
        cacheManager.get(testKey, 'dynamic')
      );

      const results = await Promise.all(concurrentRequests);

      // Assert - All concurrent requests should return cached data
      results.forEach(result => {
        expect(result).toEqual(testData);
      });

      // Verify no cache misses for concurrent requests
      const stats = await cacheManager.getStats();
      expect(stats.memory.hitCount).toBe(50);
      expect(stats.memory.missCount).toBe(0);
    });

    it('should maintain cache efficiency under memory pressure', async () => {
      // Arrange - Fill cache with data approaching memory limit
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000) // 1KB per item
      }));

      // Act - Set multiple large items
      for (let i = 0; i < largeData.length; i++) {
        await cacheManager.set(`large_item_${i}`, largeData[i], 'dynamic');
      }

      // Request recently cached items (should still be in cache)
      const recentItems = [];
      for (let i = largeData.length - 10; i < largeData.length; i++) {
        const result = await cacheManager.get(`large_item_${i}`, 'dynamic');
        recentItems.push(result);
      }

      // Assert - Recent items should still be cached (LRU eviction)
      recentItems.forEach((item, index) => {
        const expectedIndex = largeData.length - 10 + index;
        expect(item).toEqual(largeData[expectedIndex]);
      });

      // Cache should maintain reasonable hit rate even under pressure
      const stats = await cacheManager.getStats();
      expect(stats.overall.overallHitRate).toBeGreaterThan(0.5); // 50% minimum
    });
  });

  /**
   * Property 3: TTL-based Cache Behavior
   * Cache entries should expire after their TTL period and trigger fresh data fetches
   * **Validates: Requirements 1.3, 3.3**
   */
  describe('Property 3: TTL-based Cache Behavior', () => {
    it('should expire cache entries after TTL period', async () => {
      // Arrange
      const testKey = 'ttl_test_key';
      const testData = { id: 'ttl_test', value: 'original_data', timestamp: Date.now() };
      const shortTTL = 100; // 100ms for fast testing

      // Act - Set data with short TTL
      await cacheManager.set(testKey, testData, 'dynamic', shortTTL);
      
      // Verify data is cached immediately
      let cachedData = await cacheManager.get(testKey, 'dynamic');
      expect(cachedData).toEqual(testData);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50));

      // Try to get expired data
      cachedData = await cacheManager.get(testKey, 'dynamic');

      // Assert - Data should be null (expired)
      expect(cachedData).toBeNull();
    });

    it('should respect different TTL values for different data types', async () => {
      // Arrange - Different data types with different TTLs
      const testCases = [
        { key: 'user_short_ttl', data: { type: 'user' }, dataType: 'user', ttl: 100 },
        { key: 'stats_medium_ttl', data: { type: 'stats' }, dataType: 'stats', ttl: 200 },
        { key: 'discovery_long_ttl', data: { type: 'discovery' }, dataType: 'discovery', ttl: 300 }
      ];

      // Act - Set all data with different TTLs
      for (const testCase of testCases) {
        await cacheManager.set(testCase.key, testCase.data, testCase.dataType, testCase.ttl);
      }

      // Wait for shortest TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Assert - Only shortest TTL should be expired
      const userResult = await cacheManager.get(testCases[0].key, testCases[0].dataType);
      const statsResult = await cacheManager.get(testCases[1].key, testCases[1].dataType);
      const discoveryResult = await cacheManager.get(testCases[2].key, testCases[2].dataType);

      expect(userResult).toBeNull(); // Expired
      expect(statsResult).toEqual(testCases[1].data); // Still valid
      expect(discoveryResult).toEqual(testCases[2].data); // Still valid

      // Wait for medium TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const statsResult2 = await cacheManager.get(testCases[1].key, testCases[1].dataType);
      const discoveryResult2 = await cacheManager.get(testCases[2].key, testCases[2].dataType);

      expect(statsResult2).toBeNull(); // Now expired
      expect(discoveryResult2).toEqual(testCases[2].data); // Still valid
    });

    it('should handle TTL expiration in memory and localStorage layers', async () => {
      // Arrange
      const testKey = 'multi_layer_ttl_test';
      const testData = { layer: 'both', value: 'test_data' };
      const shortTTL = 100;

      // Act - Set data in both layers
      await cacheManager.set(testKey, testData, 'dynamic', shortTTL);

      // Verify data exists in both layers initially
      const memoryData = await cacheManager.memory.get(testKey);
      const localStorageData = await cacheManager.localStorage.get(testKey);
      
      expect(memoryData).toEqual(testData);
      expect(localStorageData).toEqual(testData);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50));

      // Trigger cleanup to remove expired entries
      await cacheManager.memory.cleanup();
      await cacheManager.localStorage.cleanup();

      // Assert - Data should be expired in both layers
      const expiredMemoryData = await cacheManager.memory.get(testKey);
      const expiredLocalStorageData = await cacheManager.localStorage.get(testKey);

      expect(expiredMemoryData).toBeNull();
      expect(expiredLocalStorageData).toBeNull();
    });

    it('should use default TTL values based on data type when no custom TTL provided', async () => {
      // Arrange
      const testCases = [
        { key: 'default_user_ttl', data: { type: 'user' }, dataType: 'user' },
        { key: 'default_stats_ttl', data: { type: 'stats' }, dataType: 'stats' },
        { key: 'default_discovery_ttl', data: { type: 'discovery' }, dataType: 'discovery' },
        { key: 'default_dynamic_ttl', data: { type: 'dynamic' }, dataType: 'dynamic' }
      ];

      // Act - Set data without custom TTL (should use defaults)
      for (const testCase of testCases) {
        await cacheManager.set(testCase.key, testCase.data, testCase.dataType);
      }

      // Get metadata to verify TTL values
      for (const testCase of testCases) {
        const metadata = await cacheManager.getMetadata(testCase.key);
        expect(metadata).not.toBeNull();
        expect(metadata!.expiresAt).toBeGreaterThan(Date.now());
        
        // Verify TTL is appropriate for data type
        const expectedTTL = testCase.dataType === 'user' ? 30 * 60 * 1000 : // 30 min
                           testCase.dataType === 'stats' ? 60 * 60 * 1000 : // 60 min  
                           testCase.dataType === 'discovery' ? 60 * 60 * 1000 : // 60 min
                           10 * 60 * 1000; // 10 min for dynamic
        
        const actualTTL = metadata!.expiresAt - metadata!.createdAt;
        expect(actualTTL).toBeGreaterThanOrEqual(expectedTTL - 1000); // Allow 1s tolerance
        expect(actualTTL).toBeLessThanOrEqual(expectedTTL + 1000);
      }
    });
  });

  /**
   * Property 5: Cache Consistency Maintenance
   * Cache layers should maintain consistency and handle invalidation properly
   * **Validates: Requirements 1.5**
   */
  describe('Property 5: Cache Consistency Maintenance', () => {
    it('should maintain consistency between memory and localStorage layers', async () => {
      // Arrange
      const testKey = 'consistency_test_key';
      const originalData = { id: 'consistency', value: 'original', version: 1 };
      const updatedData = { id: 'consistency', value: 'updated', version: 2 };

      // Act - Set original data
      await cacheManager.set(testKey, originalData, 'dynamic');

      // Verify data exists in both layers
      const memoryData1 = await cacheManager.memory.get(testKey);
      const localStorageData1 = await cacheManager.localStorage.get(testKey);
      expect(memoryData1).toEqual(originalData);
      expect(localStorageData1).toEqual(originalData);

      // Update data
      await cacheManager.set(testKey, updatedData, 'dynamic');

      // Assert - Both layers should have updated data
      const memoryData2 = await cacheManager.memory.get(testKey);
      const localStorageData2 = await cacheManager.localStorage.get(testKey);
      expect(memoryData2).toEqual(updatedData);
      expect(localStorageData2).toEqual(updatedData);
    });

    it('should handle pattern-based invalidation consistently across layers', async () => {
      // Arrange - Set multiple related cache entries
      const testData = [
        { key: 'user:123:profile', data: { uid: '123', name: 'User 123' } },
        { key: 'user:123:settings', data: { uid: '123', theme: 'dark' } },
        { key: 'user:456:profile', data: { uid: '456', name: 'User 456' } },
        { key: 'novel:789:stats', data: { novelId: 789, views: 100 } }
      ];

      // Set all data in cache
      for (const item of testData) {
        await cacheManager.set(item.key, item.data, 'dynamic');
      }

      // Verify all data is cached
      for (const item of testData) {
        const cached = await cacheManager.get(item.key, 'dynamic');
        expect(cached).toEqual(item.data);
      }

      // Act - Invalidate user:123 pattern
      await cacheManager.invalidate('user:123:*');

      // Assert - Only user:123 entries should be invalidated
      const user123Profile = await cacheManager.get('user:123:profile', 'dynamic');
      const user123Settings = await cacheManager.get('user:123:settings', 'dynamic');
      const user456Profile = await cacheManager.get('user:456:profile', 'dynamic');
      const novelStats = await cacheManager.get('novel:789:stats', 'dynamic');

      expect(user123Profile).toBeNull(); // Invalidated
      expect(user123Settings).toBeNull(); // Invalidated
      expect(user456Profile).toEqual(testData[2].data); // Still cached
      expect(novelStats).toEqual(testData[3].data); // Still cached
    });

    it('should handle cache layer failures gracefully', async () => {
      // Arrange
      const testKey = 'failure_test_key';
      const testData = { id: 'failure_test', value: 'test_data' };

      // Mock localStorage failure
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('localStorage quota exceeded');
      });

      try {
        // Act - Set data (localStorage should fail, memory should succeed)
        await cacheManager.set(testKey, testData, 'dynamic');

        // Assert - Memory cache should still work
        const memoryData = await cacheManager.memory.get(testKey);
        expect(memoryData).toEqual(testData);

        // Overall cache should still return data from memory
        const cachedData = await cacheManager.get(testKey, 'dynamic');
        expect(cachedData).toEqual(testData);
      } finally {
        // Restore original localStorage
        Storage.prototype.setItem = originalSetItem;
      }
    });

    it('should maintain cache statistics consistency', async () => {
      // Arrange
      const testKeys = ['stats_test_1', 'stats_test_2', 'stats_test_3'];
      const testData = { value: 'stats_test' };

      // Act - Perform various cache operations
      for (const key of testKeys) {
        await cacheManager.set(key, testData, 'dynamic');
      }

      // Multiple gets to generate hits
      for (const key of testKeys) {
        await cacheManager.get(key, 'dynamic');
        await cacheManager.get(key, 'dynamic');
      }

      // Some misses
      await cacheManager.get('non_existent_key_1', 'dynamic');
      await cacheManager.get('non_existent_key_2', 'dynamic');

      // Assert - Statistics should be consistent
      const stats = await cacheManager.getStats();
      
      // Should have hits from memory cache
      expect(stats.memory.hitCount).toBeGreaterThan(0);
      expect(stats.memory.missCount).toBeGreaterThan(0);
      
      // Overall stats should be sum of layer stats
      const totalHits = stats.memory.hitCount + stats.localStorage.hitCount;
      const totalMisses = stats.memory.missCount + stats.localStorage.missCount;
      
      expect(stats.overall.totalHits).toBe(totalHits);
      expect(stats.overall.totalMisses).toBe(totalMisses);
      
      // Hit rate should be calculated correctly
      const expectedHitRate = totalHits / (totalHits + totalMisses);
      expect(stats.overall.overallHitRate).toBeCloseTo(expectedHitRate, 2);
    });

    it('should handle concurrent cache operations consistently', async () => {
      // Arrange
      const testKey = 'concurrent_consistency_test';
      const concurrentOperations = 20;
      
      // Act - Perform concurrent set operations with different data
      const setPromises = Array.from({ length: concurrentOperations }, (_, i) => 
        cacheManager.set(testKey, { id: i, value: `data_${i}` }, 'dynamic')
      );

      await Promise.all(setPromises);

      // Get the final cached value
      const finalData = await cacheManager.get(testKey, 'dynamic');

      // Assert - Should have some valid data (one of the concurrent sets succeeded)
      expect(finalData).not.toBeNull();
      expect(finalData).toHaveProperty('id');
      expect(finalData).toHaveProperty('value');

      // Both layers should have the same data
      const memoryData = await cacheManager.memory.get(testKey);
      const localStorageData = await cacheManager.localStorage.get(testKey);
      
      expect(memoryData).toEqual(finalData);
      expect(localStorageData).toEqual(finalData);
    });
  });
});