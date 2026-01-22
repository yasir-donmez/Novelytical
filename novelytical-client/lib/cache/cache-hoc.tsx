/**
 * Higher-Order Component for Cache Integration
 * 
 * Provides cache functionality to React components
 */

import React, { ComponentType } from 'react';
import { useCachedData, useCacheManager, useCacheStats } from './react-cache-hooks';

interface WithCacheOptions<T> {
  cacheKey: string | ((props: any) => string);
  dataFetcher: (props: any) => Promise<T>;
  dataType?: string;
  ttl?: number;
  refreshInterval?: number;
  loadingComponent?: ComponentType;
  errorComponent?: ComponentType<{ error: Error; retry: () => void }>;
}

interface CacheProps<T> {
  cachedData: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  invalidate: () => Promise<void>;
  isStale: boolean;
}

/**
 * HOC that adds caching capabilities to a component
 */
export function withCache<T, P extends object>(
  WrappedComponent: ComponentType<P & CacheProps<T>>,
  options: WithCacheOptions<T>
) {
  const {
    cacheKey,
    dataFetcher,
    dataType = 'dynamic',
    ttl,
    refreshInterval,
    loadingComponent: LoadingComponent,
    errorComponent: ErrorComponent
  } = options;

  return function CachedComponent(props: P) {
    const key = typeof cacheKey === 'function' ? cacheKey(props) : cacheKey;
    
    const {
      data,
      loading,
      error,
      refresh,
      invalidate,
      isStale
    } = useCachedData<T>(
      key,
      () => dataFetcher(props),
      {
        dataType,
        ttl,
        refreshInterval
      }
    );

    // Show loading component if provided and loading
    if (loading && LoadingComponent) {
      return <LoadingComponent />;
    }

    // Show error component if provided and error (without stale data)
    if (error && !isStale && ErrorComponent) {
      return <ErrorComponent error={error} retry={refresh} />;
    }

    // Render wrapped component with cache props
    return (
      <WrappedComponent
        {...props}
        cachedData={data}
        loading={loading}
        error={error}
        refresh={refresh}
        invalidate={invalidate}
        isStale={isStale}
      />
    );
  };
}

/**
 * HOC for components that need cache management capabilities
 */
export function withCacheManager<P extends object>(
  WrappedComponent: ComponentType<P & { cacheManager: ReturnType<typeof useCacheManager> }>
) {
  return function CacheManagerComponent(props: P) {
    const cacheManager = useCacheManager();

    return (
      <WrappedComponent
        {...props}
        cacheManager={cacheManager}
      />
    );
  };
}

/**
 * Component for displaying cache statistics (useful for debugging)
 */
export function CacheStatsDisplay() {
  const { stats, refresh } = useCacheStats();

  if (!stats) {
    return <div>Cache istatistikleri yükleniyor...</div>;
  }

  return (
    <div className="cache-stats p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Cache İstatistikleri</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium">Bellek Cache</h4>
          <p>İsabet Oranı: {(stats.memory.hitRate * 100).toFixed(1)}%</p>
          <p>Boyut: {(stats.memory.size / 1024 / 1024).toFixed(2)} MB</p>
          <p>İsabet: {stats.memory.hitCount} / Kaçırma: {stats.memory.missCount}</p>
        </div>
        
        <div>
          <h4 className="font-medium">LocalStorage Cache</h4>
          <p>İsabet Oranı: {(stats.localStorage.hitRate * 100).toFixed(1)}%</p>
          <p>Boyut: {(stats.localStorage.size / 1024 / 1024).toFixed(2)} MB</p>
          <p>İsabet: {stats.localStorage.hitCount} / Kaçırma: {stats.localStorage.missCount}</p>
        </div>
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium">Genel Performans</h4>
        <p>Genel İsabet Oranı: {(stats.overall.overallHitRate * 100).toFixed(1)}%</p>
        <p>Ortalama Yanıt Süresi: {stats.overall.avgResponseTime.toFixed(2)}ms</p>
      </div>
      
      <button 
        onClick={refresh}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        İstatistikleri Yenile
      </button>
    </div>
  );
}