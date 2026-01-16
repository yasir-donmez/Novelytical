import api from '../axios';
import { handleError } from '../errors/handler';
import { NetworkError } from '../errors/types';

// Helper function to get API base URL
const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        // Client-side: use '/api' proxy
        return process.env.NEXT_PUBLIC_API_URL || '/api';
    }
    // Server-side: use full URL
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';
};

export async function fetchNovels(params: {
    searchString?: string;
    tags?: string[];
    sortOrder?: string;
    pageNumber?: number;
    pageSize?: number;
    minChapters?: number | null;
    maxChapters?: number | null;
    minRating?: number | null;
    maxRating?: number | null;
}) {
    const queryParams = new URLSearchParams();

    if (params.searchString) queryParams.append('searchString', params.searchString);
    if (params.tags) {
        params.tags.forEach(tag => queryParams.append('tag', tag)); // Fixed: backend uses 'tag'
    }
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    // Advanced filters
    if (params.minChapters !== null && params.minChapters !== undefined) queryParams.append('minChapters', params.minChapters.toString());
    if (params.maxChapters !== null && params.maxChapters !== undefined) queryParams.append('maxChapters', params.maxChapters.toString());
    if (params.minRating !== null && params.minRating !== undefined) queryParams.append('minRating', params.minRating.toString());
    if (params.maxRating !== null && params.maxRating !== undefined) queryParams.append('maxRating', params.maxRating.toString());

    try {
        const url = `${getApiUrl()}/api/novels?${queryParams.toString()}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store' // Dynamic search, do not cache by default or use revalidate if preferred
        });

        if (!res.ok) {
            console.error('[fetchNovels] Failed:', res.status, res.statusText);
            throw new Error(`Failed to fetch novels: ${res.status}`);
        }

        const json = await res.json();
        return json; // Assuming API returns PagedResponse directly
    } catch (error) {
        console.error('[fetchNovels] Error:', error);
        return {
            data: [],
            totalRecords: 0,
            pageNumber: params.pageNumber || 1,
            pageSize: params.pageSize || 20,
            totalPages: 0
        };
    }
}

export async function getNovelById(id: number | string) {
    // Response from /novels/{id} is { data: NovelDetailDto }
    const res = await fetch(`${getApiUrl()}/api/novels/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch novel');
    // Need to return data.data based on service structure? 
    // novelService.getNovelById returns data.data.
    // API returns { data: ... } wrapped? 
    // Let's assume yes based on other endpoints usually being wrapped in standard response.
    // Checking novelService: const { data } = await api.get... return data.data;
    // So yes.
    const json = await res.json();
    return json.data;
}

export async function getNovelsByAuthor(author: string, currentNovelId: number | string, count: number = 20) {
    const params = new URLSearchParams();
    params.append('author', author);
    params.append('excludeId', currentNovelId.toString());
    params.append('pageSize', count.toString());

    const url = `${getApiUrl()}/api/novels/by-author?${params.toString()}`;
    console.log('[getNovelsByAuthor] Fetching:', url);

    const res = await fetch(url, {
        next: { revalidate: 3600 }
    });
    if (!res.ok) {
        console.error('[getNovelsByAuthor] Failed:', res.status, await res.text());
        return [];
    }
    const json = await res.json();
    // console.log('[getNovelsByAuthor] Response data length:', json.data?.length);
    return json.data;
}

export async function getSimilarNovels(id: number | string, count: number = 12) {
    // Endpoint: /novels/{id}/similar
    // Params: limit (Service uses 'limit', I previously used 'count' which was wrong)
    const res = await fetch(`${getApiUrl()}/api/novels/${id}/similar?limit=${count}`, {
        cache: 'no-store'
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data;
}
