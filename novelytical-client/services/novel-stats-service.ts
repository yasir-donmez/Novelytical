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
    getCountFromServer
} from "firebase/firestore";

const COLLECTION_NAME = "novel_stats";

export interface NovelStats {
    reviewCount: number;
    libraryCount: number;
}

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

        return { reviewCount, libraryCount };
    } catch (error) {
        console.error("Error calculating stats from collections:", error);
        return { reviewCount: 0, libraryCount: 0 };
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
                libraryCount: data.libraryCount || 0
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
        return { reviewCount: 0, libraryCount: 0 };
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
                libraryCount: data.libraryCount || 0
            });
        } else {
            callback({ reviewCount: 0, libraryCount: 0 });
        }
    });
};

/**
 * Increment review count for a novel
 */
export const incrementReviewCount = async (novelId: number): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, novelId.toString());
        await setDoc(docRef, { reviewCount: increment(1) }, { merge: true });
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
