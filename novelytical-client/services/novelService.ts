import api from '@/lib/axios';
import type { NovelListDto, NovelDetailDto, PagedResponse } from '@/types/novel';

export interface GetNovelsParams {
    searchString?: string;
    tags?: string[];
    sortOrder?: string;
    pageNumber?: number;
    pageSize?: number;
}

export const novelService = {
    // Get novels with search and pagination
    getNovels: async (params: GetNovelsParams = {}): Promise<PagedResponse<NovelListDto>> => {
        const searchParams = new URLSearchParams();

        if (params.searchString) searchParams.append('searchString', params.searchString);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
        if (params.pageNumber) searchParams.append('pageNumber', params.pageNumber.toString());
        if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());

        // Serialize tags as repeated 'tag' parameters (e.g. tag=Action&tag=Magic)
        if (params.tags && params.tags.length > 0) {
            params.tags.forEach(tag => searchParams.append('tag', tag));
        }

        const { data } = await api.get<PagedResponse<NovelListDto>>('/novels', { params: searchParams });
        return data;
    },

    // Get single novel by ID or Slug
    getNovelById: async (id: number | string): Promise<NovelDetailDto> => {
        const { data } = await api.get<{ data: NovelDetailDto }>(`/novels/${id}`);
        return data.data;
    },

    // Get novels by author
    getNovelsByAuthor: async (author: string, excludeId: number, pageSize: number = 6): Promise<NovelListDto[]> => {
        const { data } = await api.get<{ data: NovelListDto[] }>('/novels/by-author', {
            params: { author, excludeId, pageSize }
        });
        return data.data;
    },

    getSimilarNovels: async (id: number, limit: number = 12): Promise<NovelListDto[]> => {
        const { data } = await api.get<{ data: NovelListDto[] }>(`/novels/${id}/similar`, {
            params: { limit }
        });
        return data.data;
    },

    // Get all available tags
    getTags: async (): Promise<string[]> => {
        const { data } = await api.get<{ data: string[] }>('/novels/tags');
        return data.data;
    },

    // Sync stats
    incrementSiteView: async (id: number): Promise<void> => {
        await api.post(`/novels/${id}/view`);
    },

    updateCommentCount: async (id: number, count: number): Promise<void> => {
        await api.post(`/novels/${id}/comment-count`, count, {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    updateReviewCount: async (id: number, count: number, averageRating?: number): Promise<void> => {
        await api.post(`/novels/${id}/review-count`, { count, averageRating }, {
            headers: { 'Content-Type': 'application/json' }
        });
    },
};
