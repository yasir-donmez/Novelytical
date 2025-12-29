// Novel DTOs matching backend
export interface NovelListDto {
    id: number;
    title: string;
    author: string;
    rating: number;
    chapterCount: number;
    lastUpdated: string;
    coverUrl?: string;
    tags: string[];
}

export interface NovelDetailDto extends NovelListDto {
    description: string;
    sourceUrl?: string;
    isCompleted?: boolean;
    aiSummary?: string;
    year?: number;
    category?: string;
    chapters?: {
        id: number;
        chapterNumber: number;
        title: string;
        releaseDate: string;
    }[];
}

export interface PagedResponse<T> {
    data: T[];
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
}
