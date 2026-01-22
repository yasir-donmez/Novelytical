/**
 * Category Novels API Endpoint
 * 
 * Optimize edilmiş category-specific novels endpoint'i
 * Cache ve Firebase query optimization kullanır
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchCategoryNovels } from '@/lib/data/discovery';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const options = {
      category: searchParams.get('category') || 'Fantastik',
      pageSize: parseInt(searchParams.get('pageSize') || '12'),
      sortBy: (searchParams.get('sortBy') as 'rating' | 'views' | 'date' | 'chapters') || 'rating',
      revalidate: parseInt(searchParams.get('revalidate') || '3600')
    };

    const result = await fetchCategoryNovels(options);

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
        category: options.category,
        sortBy: options.sortBy,
        responseTime: Date.now() - startTime
      }
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Category novels endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch category novels',
      data: []
    }, { status: 500 });
  }
}