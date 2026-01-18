// Novel DTOs matching backend
export interface NovelListDto {
    id: number;
    slug: string; // Added Slug
    title: string;
    author: string;
    rating: number;
    scrapedRating?: number; // New field
    viewCount?: number;     // New field
    status?: string;        // New field
    chapterCount: number;
    lastUpdated: string;
    coverUrl?: string;
    rankPosition?: number; // Global rank position (1 = highest)
    tags: string[];
}

export interface NovelDetailDto extends NovelListDto {
    description: string;
    sourceUrl?: string;
    isCompleted?: boolean;
    aiSummary?: string;
    year?: number;
    category?: string;
    averageRating?: number; // 0-5 rating
    ratingCount?: number;   // Total number of ratings
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
