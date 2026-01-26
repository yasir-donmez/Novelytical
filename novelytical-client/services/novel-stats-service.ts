import { novelService } from "./novelService";

export interface NovelStats {
    reviewCount: number;
    libraryCount: number;
    viewCount: number;
    commentCount: number;
}

/**
 * Calculate rank score for a novel
 * Formula: (scrapedViews/10000) + siteViews + (commentCount * 20) + (reviewCount * 50)
 */
export const calculateRank = (
    scrapedViews: number,
    stats: NovelStats
): number => {
    const scrapedScore = Math.floor(scrapedViews / 10000);
    const siteViewScore = stats.viewCount;
    const commentScore = stats.commentCount * 20;
    const reviewScore = stats.reviewCount * 50;

    return scrapedScore + siteViewScore + commentScore + reviewScore;
};

// Simple in-memory cache to avoid redundant API calls within short timeframe
const statsCache = new Map<number, { data: NovelStats, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 Minute

/**
 * Get stats for a specific novel
 * Now fetches directly from Backend API via novelService
 */
export const getNovelStats = async (novelId: number): Promise<NovelStats> => {
    const now = Date.now();
    const cached = statsCache.get(novelId);

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    try {
        const novel = await novelService.getNovelById(novelId);

        // Map backend DTO to NovelStats
        const stats: NovelStats = {
            reviewCount: novel.ratingCount || 0,
            libraryCount: 0,
            viewCount: novel.siteViewCount || 0, // Correct: Use site-specific view count
            commentCount: novel.commentCount || 0
        };

        statsCache.set(novelId, { data: stats, timestamp: now });
        return stats;
    } catch (error) {
        console.error("Error fetching novel stats:", error);
        return { reviewCount: 0, libraryCount: 0, viewCount: 0, commentCount: 0 };
    }
};

/**
 * Subscribe to real-time stats updates for a novel
 * REPLACED: No longer real-time via Firebase. 
 * Returning a dummy unsubscribe function for compatibility.
 */
export const subscribeToNovelStats = (
    novelId: number,
    callback: (stats: NovelStats) => void
): () => void => {
    // Initial fetch
    getNovelStats(novelId).then(callback);

    // Optional: Poll every 30 seconds
    const interval = setInterval(() => {
        getNovelStats(novelId).then(callback);
    }, 30000);

    return () => clearInterval(interval);
};

/**
 * Increment view count for a novel
 * Now calls Backend API directly
 */
export const incrementViewCount = async (novelId: number): Promise<void> => {
    try {
        await novelService.incrementSiteView(novelId);
    } catch (error) {
        console.error("Error incrementing view count:", error);
    }
};

// Deprecated / No-op functions (since Backend now handles these via their own endpoints/logic)
export const incrementReviewCount = async (novelId: number): Promise<void> => { /* No-op */ };
export const decrementReviewCount = async (novelId: number): Promise<void> => { /* No-op */ };
export const incrementLibraryCount = async (novelId: number): Promise<void> => { /* No-op */ };
export const decrementLibraryCount = async (novelId: number): Promise<void> => { /* No-op */ };
export const incrementCommentCount = async (novelId: number): Promise<void> => { /* No-op */ };
export const decrementCommentCount = async (novelId: number): Promise<void> => { /* No-op */ };
