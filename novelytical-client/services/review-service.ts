
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
    updateDoc,
    increment,
    getDoc,
    setDoc
} from "firebase/firestore";

export interface Ratings {
    story: number;     // Kurgu
    characters: number; // Karakterler
    world: number;     // Dünya
    flow: number;      // Akıcılık
    grammar: number;   // Dilbilgisi
}

export interface Review {
    id: string;
    novelId: number;
    userId: string;
    userName: string;
    ratings: Ratings;
    averageRating: number;
    content: string;
    likes: number;
    unlikes: number;
    createdAt: Timestamp;
}

const COLLECTION_NAME = "reviews";
const INTERACTIONS_COLLECTION = "review_interactions"; // To track user likes/unlikes

export const addReview = async (
    novelId: number,
    userId: string,
    userName: string,
    ratings: Ratings,
    content: string
) => {
    try {
        // Calculate simple average
        const values = Object.values(ratings);
        const averageRating = values.reduce((a, b) => a + b, 0) / values.length;

        await addDoc(collection(db, COLLECTION_NAME), {
            novelId,
            userId,
            userName,
            ratings,
            averageRating: parseFloat(averageRating.toFixed(1)), // 4.2 format
            content,
            likes: 0,
            unlikes: 0,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding review:", error);
        throw error;
    }
};

export const getReviewsByNovelId = async (novelId: number): Promise<Review[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("novelId", "==", novelId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Review));
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return [];
    }
};

export const interactWithReview = async (reviewId: string, userId: string, action: 'like' | 'unlike') => {
    try {
        const interactionId = `${reviewId}_${userId}`;
        const interactionRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
        const reviewRef = doc(db, COLLECTION_NAME, reviewId);

        const interactionDoc = await getDoc(interactionRef);

        if (interactionDoc.exists()) {
            const currentAction = interactionDoc.data().action;
            if (currentAction === action) {
                // Remove interaction (toggle off)
                await deleteDoc(interactionRef);
                await updateDoc(reviewRef, {
                    [action + 's']: increment(-1)
                });
                return 'removed';
            } else {
                // Change interaction (e.g., like -> unlike)
                await setDoc(interactionRef, { action });
                // Decrease old action, increase new action
                await updateDoc(reviewRef, {
                    [currentAction + 's']: increment(-1),
                    [action + 's']: increment(1)
                });
                return 'changed';
            }
        } else {
            // New interaction
            await setDoc(interactionRef, { action, userId, reviewId });
            await updateDoc(reviewRef, {
                [action + 's']: increment(1)
            });
            return 'added';
        }
    } catch (error) {
        console.error("Error interacting with review:", error);
        throw error;
    }
};
