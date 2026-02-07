import { db } from "@/lib/firebase";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    where,
    serverTimestamp,
    limit,
    onSnapshot,
    updateDoc
} from "firebase/firestore";
import { UserService, UserProfile } from "./user-service";

const FOLLOWS_COLLECTION = "follows";

export interface FollowData {
    followerId: string;
    followingId: string;
    createdAt: any;
}

export const FollowService = {
    /**
     * Follows a user via Backend API.
     */
    async followUser(followerId: string, followingId: string): Promise<void> {
        if (followerId === followingId) return;

        const api = (await import("@/lib/axios")).default;
        try {
            await api.post(`/users/${followingId}/follow`);
        } catch (error: any) {
            console.error("Error following user:", error);
            throw new Error(error.response?.data?.message || "Takip işlemi başarısız.");
        }
    },

    /**
     * Unfollows a user via Backend API.
     */
    async unfollowUser(followerId: string, followingId: string): Promise<void> {
        const api = (await import("@/lib/axios")).default;
        try {
            await api.delete(`/users/${followingId}/follow`);
        } catch (error: any) {
            console.error("Error unfollowing user:", error);
            throw new Error(error.response?.data?.message || "Takibi bırakma işlemi başarısız.");
        }
    },

    /**
     * Checks if current user is following the target user.
     */
    async isFollowing(currentUid: string, targetUid: string): Promise<boolean> {
        if (!currentUid || !targetUid) return false;

        const docId = `${currentUid}_${targetUid}`;
        const ref = doc(db, FOLLOWS_COLLECTION, docId);
        const snapshot = await getDoc(ref);
        return snapshot.exists();
    },

    /**
     * Checks if there is a mutual follow relationship.
     */
    async isMutualFollow(user1: string, user2: string): Promise<boolean> {
        const f1 = await this.isFollowing(user1, user2);
        const f2 = await this.isFollowing(user2, user1);
        return f1 && f2;
    },

    /**
     * Gets list of users that the current user is following.
     * Returns UserProfile array.
     */
    async getFollowing(uid: string): Promise<UserProfile[]> {
        const q = query(
            collection(db, FOLLOWS_COLLECTION),
            where("followerId", "==", uid)
        );

        const snapshot = await getDocs(q);
        const userIds = snapshot.docs.map(doc => doc.data().followingId as string);

        if (userIds.length === 0) return [];

        // Fetch user profiles (in batches if necessary, simply done here)
        const profiles: UserProfile[] = [];
        for (const targetId of userIds) {
            const profile = await UserService.getUserProfile(targetId);
            if (profile) {
                profiles.push(profile);
            } else {
                // Self-Healing: If user profile is null, verify existence and cleanup orphaned follow
                try {
                    const userRef = doc(db, "users", targetId);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        console.warn(`[Self-Healing] Removing orphaned following record: ${uid} -> ${targetId}`);
                        const docId = `${uid}_${targetId}`;
                        await deleteDoc(doc(db, FOLLOWS_COLLECTION, docId));
                    }
                } catch (e) {
                    console.error("Error during self-healing (following):", e);
                }
            }
        }
        return profiles;
    },

    /**
     * Gets list of users who follow the current user.
     */
    async getFollowers(uid: string): Promise<UserProfile[]> {
        const q = query(
            collection(db, FOLLOWS_COLLECTION),
            where("followingId", "==", uid)
        );

        const snapshot = await getDocs(q);
        const userIds = snapshot.docs.map(doc => doc.data().followerId as string);

        if (userIds.length === 0) return [];

        const profiles: UserProfile[] = [];
        for (const sourceId of userIds) {
            const profile = await UserService.getUserProfile(sourceId);
            if (profile) {
                profiles.push(profile);
            } else {
                // Self-Healing: If user profile is null, verify existence and cleanup orphaned follow
                try {
                    const userRef = doc(db, "users", sourceId);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        console.warn(`[Self-Healing] Removing orphaned follower record: ${sourceId} -> ${uid}`);
                        const docId = `${sourceId}_${uid}`;
                        await deleteDoc(doc(db, FOLLOWS_COLLECTION, docId));
                    }
                } catch (e) {
                    console.error("Error during self-healing (follower):", e);
                }
            }
        }
        return profiles;
    },

    /**
     * Gets the count of followers.
     */
    async getFollowerCount(uid: string): Promise<number> {
        const q = query(
            collection(db, FOLLOWS_COLLECTION),
            where("followingId", "==", uid)
        );
        const snapshot = await getDocs(q);
        return snapshot.size;
    },

    /**
     * Gets the count of following.
     */
    async getFollowingCount(uid: string): Promise<number> {
        const q = query(
            collection(db, FOLLOWS_COLLECTION),
            where("followerId", "==", uid)
        );
        const snapshot = await getDocs(q);
        return snapshot.size;
    },

    /**
     * Subscribe to real-time follower count updates.
     */
    subscribeToFollowerCount(uid: string, callback: (count: number) => void): () => void {
        const q = query(
            collection(db, FOLLOWS_COLLECTION),
            where("followingId", "==", uid)
        );
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.size);
        });
    },

    /**
     * Subscribe to real-time following count updates.
     */
    subscribeToFollowingCount(uid: string, callback: (count: number) => void): () => void {
        const q = query(
            collection(db, FOLLOWS_COLLECTION),
            where("followerId", "==", uid)
        );
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.size);
        });
    },

    /**
     * Follows an author.
     * Creates a document in 'author_follows' collection with ID `${userId}_${authorName}`.
     */
    async followAuthor(userId: string, authorName: string): Promise<void> {
        if (!userId || !authorName) return;

        // URL decode/encode normalization
        const normalizedAuthor = decodeURIComponent(authorName);
        const docId = `${userId}_${normalizedAuthor}`;
        const ref = doc(db, "author_follows", docId);

        await setDoc(ref, {
            userId,
            authorName: normalizedAuthor,
            createdAt: serverTimestamp()
        });
    },

    /**
     * Unfollows an author.
     */
    async unfollowAuthor(userId: string, authorName: string): Promise<void> {
        if (!userId || !authorName) return;

        const normalizedAuthor = decodeURIComponent(authorName);
        const docId = `${userId}_${normalizedAuthor}`;
        const ref = doc(db, "author_follows", docId);

        await deleteDoc(ref);
    },

    /**
     * Checks if user is following an author.
     */
    async isFollowingAuthor(userId: string, authorName: string): Promise<boolean> {
        if (!userId || !authorName) return false;

        const normalizedAuthor = decodeURIComponent(authorName);
        const docId = `${userId}_${normalizedAuthor}`;
        const ref = doc(db, "author_follows", docId);
        const snapshot = await getDoc(ref);
        return snapshot.exists();
    }
};
