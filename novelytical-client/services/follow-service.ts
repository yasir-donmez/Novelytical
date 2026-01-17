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
     * Follows a user.
     * Creates a document with ID `${followerId}_${followingId}`.
     */
    async followUser(followerId: string, followingId: string): Promise<void> {
        if (followerId === followingId) return;

        // 1. Check for Active Ban
        const userProfile = await UserService.getUserProfile(followerId);
        if (userProfile?.followBanUntil) {
            const banDate = userProfile.followBanUntil.toDate ? userProfile.followBanUntil.toDate() : new Date(userProfile.followBanUntil);
            if (banDate > new Date()) {
                throw new Error(`Takip işlemleriniz geçici olarak kısıtlanmıştır. (Bitiş: ${banDate.toLocaleString()})`);
            }
        }

        const docId = `${followerId}_${followingId}`;
        const ref = doc(db, FOLLOWS_COLLECTION, docId);

        await setDoc(ref, {
            followerId,
            followingId,
            createdAt: serverTimestamp()
        });

        // Send Notification
        try {
            if (userProfile) {
                await import("./notification-service").then(m => m.createNotification(
                    followingId,
                    'follow',
                    `${userProfile.username} sizi takip etti.`,
                    followerId, // sourceId is the user who followed
                    `/profile/${followerId}`, // Link to their profile
                    followerId,
                    userProfile.username,
                    userProfile.photoURL,
                    userProfile.privacySettings?.privateProfile ? undefined : undefined // Frame could be added to profile interface later used here
                ));
            }
        } catch (error) {
            console.error("Error sending follow notification:", error);
        }
    },

    /**
     * Unfollows a user.
     */
    async unfollowUser(followerId: string, followingId: string): Promise<void> {
        // 1. Check for Active Ban
        const userProfile = await UserService.getUserProfile(followerId);
        if (userProfile?.followBanUntil) {
            const banDate = userProfile.followBanUntil.toDate ? userProfile.followBanUntil.toDate() : new Date(userProfile.followBanUntil);
            if (banDate > new Date()) {
                throw new Error(`Takip işlemleriniz geçici olarak kısıtlanmıştır. (Bitiş: ${banDate.toLocaleString()})`);
            }
        }

        const docId = `${followerId}_${followingId}`;
        const ref = doc(db, FOLLOWS_COLLECTION, docId);

        // 2. Intelligent Spam Check
        // We need to see WHEN they followed this person.
        const followSnap = await getDoc(ref);
        if (followSnap.exists() && userProfile) {
            const followData = followSnap.data();
            const createdAt = followData.createdAt?.toDate ? followData.createdAt.toDate() : new Date(followData.createdAt);

            const now = Date.now();
            // If createdAt is missing (legacy data), assume it's old/safe behavior (treat as > 1 hour)
            const followTime = createdAt ? createdAt.getTime() : 0;
            const followDuration = now - followTime;
            const ONE_HOUR = 60 * 60 * 1000;

            // If they are unfollowing very quickly (within 1 hour) AND createdAt exists
            if (createdAt && followDuration < ONE_HOUR) {
                // This counts as a "Spam Attempt"

                let spamHistory = userProfile.recentSpamAttempts || [];
                // Clean up old attempts (> 1 hour ago)
                spamHistory = spamHistory.filter(ts => (now - ts) < ONE_HOUR);

                // Add this current spam attempt
                spamHistory.push(now);

                // Check Limit: If this is the 2nd quick unfollow in the last hour
                if (spamHistory.length >= 2) {
                    // BAN USER
                    const banUntil = new Date(now + 24 * 60 * 60 * 1000); // 24 hours

                    await updateDoc(doc(db, "users", followerId), {
                        followBanUntil: banUntil,
                        recentSpamAttempts: [] // Clear attempts on ban
                    });

                    throw new Error("Kısa süre içinde birden fazla kez 'Takip Et - Çık' yaptığınız için 24 saat kısıtlama aldınız.");
                } else {
                    // Just warn/count
                    await updateDoc(doc(db, "users", followerId), {
                        recentSpamAttempts: spamHistory
                    });
                }
            }
        }

        await deleteDoc(ref);
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
        for (const id of userIds) {
            const profile = await UserService.getUserProfile(id);
            if (profile) profiles.push(profile);
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
        for (const id of userIds) {
            const profile = await UserService.getUserProfile(id);
            if (profile) profiles.push(profile);
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
    }
};
