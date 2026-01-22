/**
 * Trending Novels API Endpoint
 * 
 * Optimize edilmiş trending novels endpoint'i
 * Cache ve Firebase query optimization kullanır
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchTrendingNovels } from '@/lib/data/discovery';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const options = {
      pageSize: parseInt(searchParams.get('pageSize') || '10'),
      timeRange: (searchParams.get('timeRange') as 'daily' | 'weekly' | 'monthly') || 'weekly',
      revalidate: parseInt(searchParams.get('revalidate') || '3600')
    };

    const result = await fetchTrendingNovels(options);

    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${options.revalidate}, stale-while-revalidate=86400`,
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'X-Data-Source': 'optimized-discovery'
    });

    return new NextResponse(JSON.stringify({
      success: true,
      data: result.data,
      meta: {
        count: result.data.length,
        timeRange: options.timeRange,
        responseTime: Date.now() - startTime
      }
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Trending novels endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trending novels',
      data: []
    }, { status: 500 });
  }
}