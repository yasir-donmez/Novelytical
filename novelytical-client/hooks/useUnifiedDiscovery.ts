/**
 * Unified Discovery Hook
 * 
 * React hook for using the unified discovery endpoint
 * Provides caching, error handling, and loading states
 */

import { useState, useEffect } from 'react';
import { DiscoveryDocument, UnifiedDiscoveryOptions } from '@/lib/data/discovery';

interface UseUnifiedDiscoveryResult {
  data: DiscoveryDocument | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  performance: {
    responseTime: number;
    cacheHit: boolean;
    optimizationRatio: number;
    totalReads: number;
  } | null;
}

export function useUnifiedDiscovery(
  options: UnifiedDiscoveryOptions = {}
): UseUnifiedDiscoveryResult {
  const [data, setData] = useState<DiscoveryDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [performance, setPerformance] = useState<UseUnifiedDiscoveryResult['performance']>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (options.variant) params.append('variant', options.variant);
      if (options.userId) params.append('userId', options.userId);
      if (options.limits?.trending) params.append('trendingLimit', options.limits.trending.toString());
      if (options.limits?.newArrivals) params.append('newArrivalsLimit', options.limits.newArrivals.toString());
      if (options.limits?.editorsPick) params.append('editorsPickLimit', options.limits.editorsPick.toString());
      if (options.limits?.categorySpecific) params.append('categoryLimit', options.limits.categorySpecific.toString());
      if (options.timeRanges?.trending) params.append('trendingTimeRange', options.timeRanges.trending);
      if (options.timeRanges?.newArrivals) params.append('newArrivalsDays', options.timeRanges.newArrivals.toString());
      if (options.cacheOptions?.forceRefresh) params.append('forceRefresh', 'true');
      if (options.cacheOptions?.maxAge) params.append('maxAge', options.cacheOptions.maxAge.toString());
      if (options.cacheOptions?.staleWhileRevalidate) params.append('swr', 'true');
      if (options.preferences) params.append('preferences', JSON.stringify(options.preferences));

      const response = await fetch(`/api/discovery/unified?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Discovery API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Discovery data fetch failed');
      }

      setData(result.data);
      setPerformance({
        responseTime: result.meta.responseTime,
        cacheHit: result.meta.cacheHit,
        optimizationRatio: result.meta.optimizationRatio,
        totalReads: result.meta.totalReads
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Unified discovery hook error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [JSON.stringify(options)]); // Re-fetch when options change

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    performance
  };
}