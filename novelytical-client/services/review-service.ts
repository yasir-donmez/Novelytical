
import { db } from "@/lib/firebase";
import { UserService } from "./user-service";
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
    limit,
    runTransaction
} from "firebase/firestore";
import { LevelService, XP_RULES } from "./level-service";
import { createNotification } from "./notification-service";

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
    userFrame?: string; // Added userFrame
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
    userFrame: string | null, // Added userFrame
    ratings: Ratings,
    content: string,
    isSpoiler: boolean = false
) => {
    try {
        // Calculate simple average
        const values = Object.values(ratings);
        const averageRating = values.reduce((a, b) => a + b, 0) / values.length;

        // Fetch userFrame if not provided (fallback)
        if (!userFrame) {
            const levelData = await LevelService.getUserLevelData(userId);
            userFrame = levelData?.selectedFrame || null;
        }

        await addDoc(collection(db, COLLECTION_NAME), {
            novelId,
            userId,
            userName,
            userImage,
            userFrame: userFrame || null, // Store userFrame
            ratings,
            averageRating: parseFloat(averageRating.toFixed(1)), // 4.2 format
            content,
            isSpoiler,
            likes: 0,
            unlikes: 0,
            createdAt: serverTimestamp()
        });

        // Award XP
        await LevelService.gainXp(userId, XP_RULES.REVIEW);

        // Parse mentions and notify
        const mentionRegex = /@(\w+)/g;
        const mentions = content.match(mentionRegex);

        if (mentions) {
            const mentionedUsers = new Set<string>();
            for (const mention of mentions) {
                const username = mention.substring(1); // Remove @
                // Avoid notifying self if they mention themselves
                if (username.toLowerCase() === userName.toLowerCase()) continue;

                const mentionedUserId = await UserService.getUserIdByUsername(username);
                if (mentionedUserId && !mentionedUsers.has(mentionedUserId)) {
                    mentionedUsers.add(mentionedUserId);
                    await createNotification(
                        mentionedUserId,
                        'system', // or 'mention' if added to types
                        `${userName} değerlendirmesinde sizden bahsetti.`,
                        novelId.toString(), // Redirect to novel mainly
                        `/novel/${novelId}`,
                        userId,
                        userName,
                        userImage || undefined
                    );
                }
            }
        }

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



export const interactWithReview = async (
    reviewId: string,
    userId: string,
    action: 'like' | 'unlike',
    senderName: string,
    senderImage: string | undefined, // Allow undefined to match User type
    senderFrame: string | undefined,
    recipientId: string,
    novelId: number
) => {
    try {
        const interactionId = `${reviewId}_${userId}`;
        const interactionRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
        const reviewRef = doc(db, COLLECTION_NAME, reviewId);

        let result = '';

        await runTransaction(db, async (transaction) => {
            const reviewDoc = await transaction.get(reviewRef);
            const interactionDoc = await transaction.get(interactionRef);

            if (!reviewDoc.exists()) {
                throw "Review does not exist!";
            }

            const data = reviewDoc.data();
            // Sanitize current counts (treat negative as 0)
            let currentLikess = Math.max(0, data.likes || 0);
            let currentUnlikes = Math.max(0, data.unlikes || 0);

            if (interactionDoc.exists()) {
                const currentAction = interactionDoc.data().action;
                if (currentAction === action) {
                    // Remove interaction (toggle off)
                    transaction.delete(interactionRef);
                    if (action === 'like') currentLikess--;
                    else currentUnlikes--;
                    result = 'removed';
                } else {
                    // Change interaction (e.g., like -> unlike)
                    transaction.set(interactionRef, { action, userId, reviewId });
                    if (currentAction === 'like') {
                        currentLikess--;
                        currentUnlikes++;
                    } else {
                        currentUnlikes--;
                        currentLikess++;
                    }
                    result = 'changed';
                }
            } else {
                // New interaction
                transaction.set(interactionRef, { action, userId, reviewId });
                if (action === 'like') currentLikess++;
                else currentUnlikes++;
                result = 'added';
            }

            // Ensure we never go below 0 on write
            transaction.update(reviewRef, {
                likes: Math.max(0, currentLikess),
                unlikes: Math.max(0, currentUnlikes)
            });
        });

        if (userId !== recipientId && (result === 'added' || result === 'changed')) {
            const message = action === 'like'
                ? `${senderName} değerlendirmenizi beğendi.`
                : `${senderName} değerlendirmenizi beğenmedi.`;

            // Fetch senderFrame if not provided (fallback)
            if (!senderFrame) {
                const levelData = await LevelService.getUserLevelData(userId);
                senderFrame = levelData?.selectedFrame;
            }

            await createNotification(
                recipientId,
                action === 'like' ? 'like' : 'dislike',
                message,
                reviewId,
                `/novel/${novelId}`,
                userId,
                senderName,
                senderImage,
                senderFrame
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

export const updateUserIdentityInReviews = async (userId: string, userName: string, userImage: string | null, userFrame: string | null) => {
    try {
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const snapshot = await getDocs(q);

        const updatePromises = snapshot.docs.map(doc =>
            updateDoc(doc.ref, { userName, userImage, userFrame })
        );

        await Promise.all(updatePromises);
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error syncing user identity in reviews:", error);
        throw error;
    }
};

export const getUserInteractionForReview = async (reviewId: string, userId: string): Promise<'like' | 'unlike' | null> => {
    try {
        const interactionId = `${reviewId}_${userId}`;
        const interactionRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
        const interactionDoc = await getDoc(interactionRef);

        if (interactionDoc.exists()) {
            return interactionDoc.data().action as 'like' | 'unlike';
        }
        return null;
    } catch (error) {
        console.error("Error checking user interaction:", error);
        return null;
    }
};
