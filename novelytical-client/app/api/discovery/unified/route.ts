/**
 * Unified Discovery API Endpoint
 * 
 * Bu endpoint 4 ayrı API çağrısını tek bir optimize edilmiş çağrıya dönüştürür.
 * Firebase okuma işlemlerini %70 azaltmayı hedefler.
 * 
 * **Validates: Requirements 3.1, 3.5**
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryDataService, UnifiedDiscoveryOptions } from '@/lib/data/discovery';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parametrelerini parse et
    const options: UnifiedDiscoveryOptions = {
      variant: (searchParams.get('variant') as 'default' | 'personalized' | 'trending-focused') || 'default',
      userId: searchParams.get('userId') || undefined,
      limits: {
        trending: parseInt(searchParams.get('trendingLimit') || '10'),
        newArrivals: parseInt(searchParams.get('newArrivalsLimit') || '7'),
        editorsPick: parseInt(searchParams.get('editorsPickLimit') || '12'),
        categorySpecific: parseInt(searchParams.get('categoryLimit') || '12')
      },
      timeRanges: {
        trending: (searchParams.get('trendingTimeRange') as 'daily' | 'weekly' | 'monthly') || 'weekly',
        newArrivals: parseInt(searchParams.get('newArrivalsDays') || '30')
      },
      cacheOptions: {
        forceRefresh: searchParams.get('forceRefresh') === 'true',
        maxAge: parseInt(searchParams.get('maxAge') || '3600'), // 1 hour default
        staleWhileRevalidate: searchParams.get('swr') === 'true'
      }
    };

    // Preferences parsing (for personalized variant)
    if (options.variant === 'personalized' && searchParams.get('preferences')) {
      try {
        options.preferences = JSON.parse(searchParams.get('preferences')!);
      } catch (error) {
        console.warn('Invalid preferences JSON:', error);
      }
    }

    // Discovery data service'den unified data'yı al
    const discoveryService = getDiscoveryDataService();
    const discoveryDocument = await discoveryService.getUnifiedDiscoveryData(options);

    // Response headers
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${options.cacheOptions?.maxAge || 3600}, stale-while-revalidate=86400`,
      'X-Discovery-Version': discoveryDocument.version,
      'X-Cache-Source': discoveryDocument.cacheMetadata.source,
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'X-Optimization-Ratio': `${discoveryDocument.performance.optimizationRatio}%`,
      'X-Total-Reads': discoveryDocument.performance.totalReads.toString()
    });

    // CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new NextResponse(JSON.stringify({
      success: true,
      data: discoveryDocument,
      meta: {
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        cacheHit: discoveryDocument.cacheMetadata.source === 'cache',
        optimizationRatio: discoveryDocument.performance.optimizationRatio,
        totalReads: discoveryDocument.performance.totalReads
      }
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Unified discovery endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Discovery data fetch failed',
        code: 'DISCOVERY_ERROR',
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      },
      data: null
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}