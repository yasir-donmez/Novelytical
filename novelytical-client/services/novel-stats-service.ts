import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    setDoc,
    increment,
    onSnapshot,
    Unsubscribe,
    collection,
    query,
    where,
    getCountFromServer,
    getDocs
} from "firebase/firestore";

const COLLECTION_NAME = "novel_stats";

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

/**
 * Calculate stats from actual collections (for migration/fallback)
 */
const calculateStatsFromCollections = async (novelId: number): Promise<NovelStats> => {
    try {
        // Count reviews for this novel
        const reviewsQuery = query(
            collection(db, "reviews"),
            where("novelId", "==", novelId)
        );
        const reviewsSnapshot = await getCountFromServer(reviewsQuery);
        const reviewCount = reviewsSnapshot.data().count;

        // Count library entries for this novel
        const librariesQuery = query(
            collection(db, "libraries"),
            where("novelId", "==", novelId)
        );
        const librariesSnapshot = await getCountFromServer(librariesQuery);
        const libraryCount = librariesSnapshot.data().count;

        // Count comments for this novel
        const commentsQuery = query(
            collection(db, "comments"),
            where("novelId", "==", novelId)
        );
        const commentsSnapshot = await getCountFromServer(commentsQuery);
        const commentCount = commentsSnapshot.data().count;

        return { reviewCount, libraryCount, viewCount: 0, commentCount };
    } catch (error) {
        console.error("Error calculating stats from collections:", error);
        return { reviewCount: 0, libraryCount: 0, viewCount: 0, commentCount: 0 };
    }
};

/**
 * Get stats for a specific novel
 */
export const getNovelStats = async (novelId: number): Promise<NovelStats> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                reviewCount: data.reviewCount || 0,
                libraryCount: data.libraryCount || 0,
                viewCount: data.viewCount || 0,
                commentCount: data.commentCount || 0
            };
        }

        // Stats document doesn't exist - calculate from actual collections
        const calculatedStats = await calculateStatsFromCollections(novelId);

        // Initialize the stats document for future use (async, don't wait)
        if (calculatedStats.reviewCount > 0 || calculatedStats.libraryCount > 0) {
            setDoc(docRef, calculatedStats, { merge: true }).catch(console.error);
        }

        return calculatedStats;
    } catch (error) {
        console.error("Error fetching novel stats:", error);
        return { reviewCount: 0, libraryCount: 0, viewCount: 0, commentCount: 0 };
    }
};

/**
 * Subscribe to real-time stats updates for a novel
 */
export const subscribeToNovelStats = (
    novelId: number,
    callback: (stats: NovelStats) => void
): Unsubscribe => {
    const docRef = doc(db, COLLECTION_NAME, novelId.toString());

    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                reviewCount: data.reviewCount || 0,
                libraryCount: data.libraryCount || 0,
                viewCount: data.viewCount || 0,
                commentCount: data.commentCount || 0
            });
        } else {
            callback({ reviewCount: 0, libraryCount: 0, viewCount: 0, commentCount: 0 });
        }
    });
};

import { novelService } from "./novelService";

// Helper to calculate average rating
const getAverageRating = async (novelId: number): Promise<number> => {
    try {
        const reviewsQuery = query(
            collection(db, "reviews"),
            where("novelId", "==", novelId)
        );
        const snapshot = await getDocs(reviewsQuery);
        if (snapshot.empty) return 0;

        let totalScore = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            const r = data.ratings;
            // Average of 5 criteria
            const reviewAvg = (r.story + r.characters + r.world + r.flow + r.grammar) / 5;
            totalScore += reviewAvg;
        });

        return totalScore / snapshot.size;
    } catch (e) {
        console.error("Error calculating average rating:", e);
        return 0;
    }
};

/**
 * Increment review count for a novel
 */
export const incrementReviewCount = async (novelId: number): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        await setDoc(docRef, { reviewCount: increment(1) }, { merge: true });

        // Sync to backend with new average
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const count = docSnap.data().reviewCount || 0;
            const avgRating = await getAverageRating(novelId);
            await novelService.updateReviewCount(novelId, count, avgRating);
        }
    } catch (error) {
        console.error("Error incrementing review count:", error);
    }
};

/**
 * Decrement review count for a novel
 */
export const decrementReviewCount = async (novelId: number): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        await setDoc(docRef, { reviewCount: increment(-1) }, { merge: true });

        // Sync to backend with new average
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const count = docSnap.data().reviewCount || 0;
            const avgRating = await getAverageRating(novelId);
            await novelService.updateReviewCount(novelId, count, avgRating);
        }
    } catch (error) {
        console.error("Error decrementing review count:", error);
    }
};

/**
 * Increment library count for a novel
 */
export const incrementLibraryCount = async (novelId: number): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        await setDoc(docRef, { libraryCount: increment(1) }, { merge: true });
    } catch (error) {
        console.error("Error incrementing library count:", error);
    }
};

/**
 * Decrement library count for a novel
 */
export const decrementLibraryCount = async (novelId: number): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        await setDoc(docRef, { libraryCount: increment(-1) }, { merge: true });
    } catch (error) {
        console.error("Error decrementing library count:", error);
    }
};

/**
 * Increment view count for a novel (called when page is viewed)
 */
export const incrementViewCount = async (novelId: number): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        await setDoc(docRef, { viewCount: increment(1) }, { merge: true });

        // Sync to backend
        await novelService.incrementSiteView(novelId);
    } catch (error) {
        console.error("Error incrementing view count:", error);
    }
};

/**
 * Increment comment count for a novel
 */
export const incrementCommentCount = async (novelId: number): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        await setDoc(docRef, { commentCount: increment(1) }, { merge: true });

        // Sync to backend
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await novelService.updateCommentCount(novelId, docSnap.data().commentCount || 0);
        }
    } catch (error) {
        console.error("Error incrementing comment count:", error);
    }
};

/**
 * Decrement comment count for a novel
 */
export const decrementCommentCount = async (novelId: number): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        await setDoc(docRef, { commentCount: increment(-1) }, { merge: true });

        // Sync to backend
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await novelService.updateCommentCount(novelId, docSnap.data().commentCount || 0);
        }
    } catch (error) {
        console.error("Error decrementing comment count:", error);
    }
};
