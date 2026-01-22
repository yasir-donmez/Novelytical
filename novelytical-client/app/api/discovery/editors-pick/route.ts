/**
 * Editor's Pick API Endpoint
 * 
 * Optimize edilmiş editor's pick endpoint'i
 * Cache ve Firebase query optimization kullanır
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchEditorsPick } from '@/lib/data/discovery';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const options = {
      pageSize: parseInt(searchParams.get('pageSize') || '12'),
      minRating: parseFloat(searchParams.get('minRating') || '4.0'),
      revalidate: parseInt(searchParams.get('revalidate') || '3600')
    };

    const result = await fetchEditorsPick(options);

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
        minRating: options.minRating,
        responseTime: Date.now() - startTime
      }
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Editors pick endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch editors pick',
      data: []
    }, { status: 500 });
  }
}