'use client';

/**
 * React Hooks for Cache Integration
 * 
 * Provides React-friendly interfaces for the cache system
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCacheManager } from './cache-manager-impl';
import { CacheStats } from './cache-manager';

/**
 * Hook for cached data with automatic loading and refresh
 */
export function useCachedData<T>(
  key: string,
  dataFetcher: () => Promise<T>,
  options: {
    dataType?: string;
    ttl?: number;
    refreshInterval?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    dataType = 'dynamic',
    ttl,
    refreshInterval,
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheManager = getCacheManager();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchData = useCallback(async (useCache = true) => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      let result: T | null = null;

      // Try cache first if enabled
      if (useCache) {
        result = await cacheManager.get<T>(key, dataType);
      }

      // If not in cache, fetch from source
      if (result === null) {
        result = await dataFetcher();
        
        // Cache the result
        if (result !== null) {
          await cacheManager.set(key, result, dataType, ttl);
        }
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // Try to serve stale data from cache on error
      try {
        const staleData = await cacheManager.get<T>(key, dataType);
        if (staleData !== null) {
          setData(staleData);
        }
      } catch (cacheError) {
        console.warn('Failed to get stale data from cache:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [key, dataFetcher, dataType, ttl, enabled, cacheManager]);

  // Refresh data (bypass cache)
  const refresh = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // Invalidate cache for this key
  const invalidate = useCallback(async () => {
    await cacheManager.invalidate(key);
    return fetchData(false);
  }, [key, cacheManager, fetchData]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshTimeoutRef.current = setInterval(() => {
        fetchData(false); // Refresh bypasses cache
      }, refreshInterval);

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    isStale: error !== null && data !== null // Has data but last fetch failed
  };
}

/**
 * Hook for cache statistics monitoring
 */
export function useCacheStats() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const cacheManager = getCacheManager();

  const refreshStats = useCallback(async () => {
    try {
      const currentStats = await cacheManager.getStats();
      setStats(currentStats);
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }
  }, [cacheManager]);

  useEffect(() => {
    refreshStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000);
    
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    refresh: refreshStats
  };
}

/**
 * Hook for cache management operations
 */
export function useCacheManager() {
  const cacheManager = getCacheManager();

  const clearCache = useCallback(async () => {
    await cacheManager.clear();
  }, [cacheManager]);

  const invalidatePattern = useCallback(async (pattern: string) => {
    await cacheManager.invalidate(pattern);
  }, [cacheManager]);

  const preloadData = useCallback(async <T>(
    key: string,
    dataFetcher: () => Promise<T>,
    dataType?: string
  ) => {
    await cacheManager.preload(key, dataFetcher, dataType);
  }, [cacheManager]);

  const getEfficiencyReport = useCallback(async () => {
    return await cacheManager.getEfficiencyReport();
  }, [cacheManager]);

  return {
    clearCache,
    invalidatePattern,
    preloadData,
    getEfficiencyReport,
    cacheManager
  };
}

/**
 * Hook for optimistic updates with cache
 */
export function useOptimisticCache<T>(
  key: string,
  dataType: string = 'dynamic'
) {
  const cacheManager = getCacheManager();

  const updateOptimistically = useCallback(async (
    newData: T,
    serverUpdate: () => Promise<T>
  ) => {
    // Immediately update cache with optimistic data
    await cacheManager.set(key, newData, dataType);

    try {
      // Perform server update
      const serverResult = await serverUpdate();
      
      // Update cache with server result
      await cacheManager.set(key, serverResult, dataType);
      
      return serverResult;
    } catch (error) {
      // On error, invalidate the optimistic update
      await cacheManager.invalidate(key);
      throw error;
    }
  }, [key, dataType, cacheManager]);

  return {
    updateOptimistically
  };
}