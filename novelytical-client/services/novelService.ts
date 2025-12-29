import api from '@/lib/axios';
import type { NovelListDto, NovelDetailDto, PagedResponse } from '@/types/novel';

export interface GetNovelsParams {
    searchString?: string;
    sortOrder?: string;
    pageNumber?: number;
    pageSize?: number;
}

export const novelService = {
    // Get novels with search and pagination
    getNovels: async (params: GetNovelsParams = {}): Promise<PagedResponse<NovelListDto>> => {
        const { data } = await api.get<PagedResponse<NovelListDto>>('/novels', { params });
        return data;
    },

    // Get single novel by ID
    getNovelById: async (id: number): Promise<NovelDetailDto> => {
        const { data } = await api.get<{ data: NovelDetailDto }>(`/novels/${id}`);
        return data.data;
    },
};
