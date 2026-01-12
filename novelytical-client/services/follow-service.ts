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
    onSnapshot
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

        const docId = `${followerId}_${followingId}`;
        const ref = doc(db, FOLLOWS_COLLECTION, docId);

        await setDoc(ref, {
            followerId,
            followingId,
        });

        // Send Notification
        try {
            const followerProfile = await UserService.getUserProfile(followerId);
            if (followerProfile) {
                await import("./notification-service").then(m => m.createNotification(
                    followingId,
                    'follow',
                    `${followerProfile.username} sizi takip etti.`,
                    followerId, // sourceId is the user who followed
                    `/profile/${followerId}`, // Link to their profile
                    followerId,
                    followerProfile.username,
                    followerProfile.photoURL,
                    followerProfile.privacySettings?.privateProfile ? undefined : undefined // Frame could be added to profile interface later used here
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
        const docId = `${followerId}_${followingId}`;
        const ref = doc(db, FOLLOWS_COLLECTION, docId);
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
