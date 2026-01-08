
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
    setDoc,
    limit
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
    userImage?: string;
    ratings: Ratings;
    averageRating: number;
    content: string;
    likes: number;
    unlikes: number;
    isSpoiler?: boolean;
    createdAt: Timestamp;
    novelTitle?: string;
    novelCover?: string;
}

const COLLECTION_NAME = "reviews";
const INTERACTIONS_COLLECTION = "review_interactions"; // To track user likes/unlikes

export const addReview = async (
    novelId: number,
    userId: string,
    userName: string,
    userImage: string | null,
    ratings: Ratings,
    content: string,
    isSpoiler: boolean = false
) => {
    try {
        // Calculate simple average
        const values = Object.values(ratings);
        const averageRating = values.reduce((a, b) => a + b, 0) / values.length;

        await addDoc(collection(db, COLLECTION_NAME), {
            novelId,
            userId,
            userName,
            userImage,
            ratings,
            averageRating: parseFloat(averageRating.toFixed(1)), // 4.2 format
            content,
            isSpoiler,
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

export const getReviewsByNovelId = async (novelId: number, sortBy: string = 'newest'): Promise<Review[]> => {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            where("novelId", "==", novelId)
        );

        if (sortBy === 'newest') {
            q = query(q, orderBy("createdAt", "desc"));
        } else if (sortBy === 'oldest') {
            q = query(q, orderBy("createdAt", "asc"));
        } else if (sortBy === 'highest-rating') {
            q = query(q, orderBy("averageRating", "desc"));
        } else if (sortBy === 'lowest-rating') {
            q = query(q, orderBy("averageRating", "asc"));
        } else {
            q = query(q, orderBy("createdAt", "desc"));
        }

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

export const getLatestReviews = async (count: number = 5): Promise<Review[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc"),
            limit(count)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Review));
    } catch (error) {
        console.error("Error fetching latest reviews:", error);
        return [];
    }
};

import { createNotification } from "./notification-service";

export const interactWithReview = async (
    reviewId: string,
    userId: string,
    action: 'like' | 'unlike',
    senderName: string,
    senderImage: string | undefined, // Allow undefined to match User type
    recipientId: string,
    novelId: number
) => {
    try {
        const interactionId = `${reviewId}_${userId}`;
        const interactionRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
        const reviewRef = doc(db, COLLECTION_NAME, reviewId);

        const interactionDoc = await getDoc(interactionRef);

        let result = '';

        if (interactionDoc.exists()) {
            const currentAction = interactionDoc.data().action;
            if (currentAction === action) {
                // Remove interaction (toggle off)
                await deleteDoc(interactionRef);
                await updateDoc(reviewRef, {
                    [action + 's']: increment(-1)
                });
                result = 'removed';
            } else {
                // Change interaction (e.g., like -> unlike)
                await setDoc(interactionRef, { action, userId, reviewId });
                // Decrease old action, increase new action
                await updateDoc(reviewRef, {
                    [currentAction + 's']: increment(-1),
                    [action + 's']: increment(1)
                });
                result = 'changed';
            }
        } else {
            // New interaction
            await setDoc(interactionRef, { action, userId, reviewId });
            await updateDoc(reviewRef, {
                [action + 's']: increment(1)
            });
            result = 'added';
        }

        // Send Notification if strictly added or changed (and not self)
        // Check if we should notify:
        // 1. Not self
        // 2. Action is 'added' OR 'changed' (changing from like to unlike or vice versa triggers new notification?)
        // Let's notify on 'added' and 'changed'. If changed like->unlike, maybe notify "User disliked"? Or just notify on "like".
        // User asked: "begenmediğindede gitsin" (send when disliked too).

        if (userId !== recipientId && (result === 'added' || result === 'changed')) {
            const message = action === 'like'
                ? `${senderName} değerlendirmenizi beğendi.`
                : `${senderName} değerlendirmenizi beğenmedi.`;

            // For unlike, maybe we shouldn't notify if it was just a toggle off? 
            // Logic above: 'removed' = toggle off. We only notify on 'added' or 'changed'.

            await createNotification(
                recipientId,
                action === 'like' ? 'like' : 'dislike',
                message,
                reviewId,
                `/novel/${novelId}`,
                userId,
                senderName,
                senderImage
            );
        }

        return result;

    } catch (error) {
        console.error("Error interacting with review:", error);
        throw error;
    }
};

export const getReviewsByUserId = async (userId: string): Promise<Review[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Review));
    } catch (error) {
        console.error("Error fetching user reviews:", error);
        return [];
    }
};

export const deleteReview = async (reviewId: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, reviewId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting review:", error);
        throw error;
    }
};

export const updateReview = async (reviewId: string, data: Partial<Review>) => {
    try {
        const reviewRef = doc(db, COLLECTION_NAME, reviewId);
        await updateDoc(reviewRef, {
            ...data,
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating review:", error);
        throw error;
    }
};

export const getUserReviewForNovel = async (novelId: number, userId: string): Promise<Review | null> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("novelId", "==", novelId),
            where("userId", "==", userId),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;

        const docSnapshot = querySnapshot.docs[0];
        return {
            id: docSnapshot.id,
            ...docSnapshot.data()
        } as Review;
    } catch (error) {
        console.error("Error checking user review:", error);
        return null;
    }
};

export const updateUserIdentityInReviews = async (userId: string, userName: string, userImage: string | null) => {
    try {
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const snapshot = await getDocs(q);

        const updatePromises = snapshot.docs.map(doc =>
            updateDoc(doc.ref, { userName, userImage })
        );

        await Promise.all(updatePromises);
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error syncing user identity in reviews:", error);
        throw error;
    }
};
