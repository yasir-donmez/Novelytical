
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    serverTimestamp
} from "firebase/firestore";

const USERS_COLLECTION = "users";

// Simple in-memory cache
// Key: uid, Value: { data: UserProfile, timestamp: number }
const userProfileCache = new Map<string, { data: UserProfile, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 Minutes

export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    createdAt: any;
    photoURL?: string;
    frame?: string;
    notificationSettings?: NotificationSettings;
    privacySettings?: PrivacySettings;
    followBanUntil?: any; // Timestamp
    recentSpamAttempts?: number[]; // List of timestamps of "Quick Unfollows"
}

export interface PrivacySettings {
    privateProfile: boolean;
    allowMessagesFromNonFollowers: boolean;
    showOnlineStatus: boolean;
    restrictContentToMutuals?: boolean;
    hideLibrary?: boolean;
}

export interface NotificationSettings {
    emailReplies: boolean;
    emailMentions: boolean;
    emailUpdates: boolean;
    pushReplies: boolean;
    pushNewChapters: boolean;
    pushFollows: boolean;
    retentionPeriod: '7' | '30' | '90' | 'forever';
}

export const UserService = {
    /**
     * Checks if a username is already taken.
     * Returns true if available, false if taken.
     */
    async checkUsernameAvailability(username: string): Promise<boolean> {
        // Normalize username: lowercase and trim
        const normalizedUsername = username.toLowerCase().trim();

        // Query for exact match
        const q = query(
            collection(db, USERS_COLLECTION),
            where("username_lower", "==", normalizedUsername)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
    },

    /**
     * Creates a new user profile in the users collection.
     */
    async createUserProfile(uid: string, username: string, email: string, photoURL?: string): Promise<void> {
        const userRef = doc(db, USERS_COLLECTION, uid);

        const userProfile = {
            uid,
            username: username.trim(),
            username_lower: username.toLowerCase().trim(), // For case-insensitive search
            email,
            photoURL: photoURL || null,
            createdAt: serverTimestamp()
        };

        await setDoc(userRef, userProfile);
    },

    /**
     * Updates an existing user profile.
     */
    async updateUserProfile(uid: string, username: string, photoURL?: string): Promise<void> {
        const userRef = doc(db, USERS_COLLECTION, uid);

        await updateDoc(userRef, {
            username: username.trim(),
            username_lower: username.toLowerCase().trim(),
            photoURL: photoURL || null
        });
    },

    /**
     * Generates a few available username suggestions based on the input.
     */
    async suggestUsernames(baseUsername: string): Promise<string[]> {
        const normalizedBase = baseUsername.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        const suggestions: string[] = [];
        const suffixes = [
            Math.floor(Math.random() * 100).toString(),
            Math.floor(Math.random() * 1000).toString(),
            "_tr",
            "_reader",
            "_" + new Date().getFullYear()
        ];

        for (const suffix of suffixes) {
            const potentialUsername = `${normalizedBase}${suffix}`;
            // Optimistic check (in a real high-traffic app we might need more robust checking)
            const isAvailable = await this.checkUsernameAvailability(potentialUsername);
            if (isAvailable) {
                suggestions.push(potentialUsername);
            }
            if (suggestions.length >= 3) break;
        }

        return suggestions;
    },

    /**
     * Resolves a username to a User ID.
     * Returns the uid if found, or null.
     */
    async getUserIdByUsername(username: string): Promise<string | null> {
        const normalizedUsername = username.toLowerCase().trim().replace('@', '');
        const q = query(
            collection(db, USERS_COLLECTION),
            where("username_lower", "==", normalizedUsername)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs[0].id;
        }
        return null;
    },

    /**
     * Fetches the full user profile from Firestore.
     * Uses in-memory caching to prevent excessive reads (5 minute TTL).
     */
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        // 1. Check Cache
        const cached = userProfileCache.get(uid);
        const now = Date.now();
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            // console.log(`[UserService] Serving ${uid} from cache`);
            return cached.data;
        }

        try {
            // console.log(`[UserService] Fetching ${uid} from Firestore`);
            const docRef = doc(db, USERS_COLLECTION, uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const profile: UserProfile = {
                    uid,
                    username: data.username,
                    email: data.email,
                    photoURL: data.photoURL,
                    frame: data.selectedFrame,
                    createdAt: data.createdAt,
                    privacySettings: data.privacySettings,
                    notificationSettings: data.notificationSettings
                };

                // 2. Set Cache
                userProfileCache.set(uid, {
                    data: profile,
                    timestamp: now
                });

                return profile;
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
        return null;
    },

    /**
     * Updates user notification settings.
     */
    async updateNotificationSettings(uid: string, settings: NotificationSettings): Promise<void> {
        const userRef = doc(db, USERS_COLLECTION, uid);
        // We use setDoc with merge: true to ensure we don't overwrite other fields if the doc exists
        // or create it if it doesn't (though user doc should exist).
        // Actually updateDoc is safer if we assume user exists.
        await updateDoc(userRef, { notificationSettings: settings });
    },

    /**
     * Gets user notification settings.
     */
    async getNotificationSettings(uid: string): Promise<NotificationSettings | null> {
        try {
            const docRef = doc(db, USERS_COLLECTION, uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().notificationSettings) {
                return docSnap.data().notificationSettings as NotificationSettings;
            }
        } catch (error) {
            console.error("Error fetching notification settings:", error);
        }
        return null;
    },
    /**
     * Updates user privacy settings.
     */
    async updatePrivacySettings(uid: string, settings: PrivacySettings): Promise<void> {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, { privacySettings: settings });
    }
};
