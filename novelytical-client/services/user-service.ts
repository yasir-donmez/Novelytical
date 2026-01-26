
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
    serverTimestamp,
    orderBy,
    limit
} from "firebase/firestore";

const USERS_COLLECTION = "users";

// Import optimized cache manager
import { getCacheManager, CacheKeys } from "@/lib/cache";

// Legacy cache for backward compatibility (will be phased out)
const userProfileCache = new Map<string, { data: UserProfile, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 Minutes (optimized from 5 minutes)

export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    createdAt: any;
    photoURL?: string;
    displayName?: string; // Added displayName
    bio?: string; // Added bio
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
            displayName: username, // Default displayName to username
            createdAt: serverTimestamp()
        };

        await setDoc(userRef, userProfile);
    },

    /**
     * Updates an existing user profile.
     */
    async updateUserProfile(uid: string, username: string, photoURL?: string, bio?: string, displayName?: string): Promise<void> {
        const userRef = doc(db, USERS_COLLECTION, uid);

        const updateData: any = {
            username: username.trim(),
            username_lower: username.toLowerCase().trim(),
            photoURL: photoURL || null
        };

        if (displayName) updateData.displayName = displayName.trim();
        if (bio !== undefined) updateData.bio = bio;

        await updateDoc(userRef, updateData);
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
     * Generates a unique username based on the provided base username.
     * Appends random numbers if the base username is taken.
     */
    async generateUniqueUsername(baseUsername: string): Promise<string> {
        let candidate = baseUsername.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        // Ensure at least 3 chars
        if (candidate.length < 3) {
            candidate = candidate + Math.floor(Math.random() * 1000);
        }

        let isAvailable = await this.checkUsernameAvailability(candidate);
        if (isAvailable) return candidate;

        // Try up to 5 times with random suffixes
        for (let i = 0; i < 5; i++) {
            const suffix = Math.floor(Math.random() * 10000).toString();
            const newCandidate = `${candidate}${suffix}`;
            isAvailable = await this.checkUsernameAvailability(newCandidate);
            if (isAvailable) return newCandidate;
        }

        // Fallback: use timestamp
        return `${candidate}${Date.now()}`;
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
     * Fetches the very first registered user (assumed to be the Developer/Admin).
     */
    async getFirstAdminUser(): Promise<string | null> {
        try {
            const q = query(
                collection(db, USERS_COLLECTION),
                orderBy("createdAt", "asc"),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return snapshot.docs[0].id;
            }
        } catch (error) {
            console.error("Error fetching first user:", error);
        }
        return null;
    },

    /**
     * Fetches the full user profile from Firestore.
     * Uses optimized multi-layered caching to prevent excessive reads (30 minute TTL).
     */
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        const cacheManager = getCacheManager();
        const cacheKey = CacheKeys.userProfile(uid);

        try {
            // Try optimized cache first
            let profile = await cacheManager.get<UserProfile>(cacheKey, 'user');
            if (profile) {
                return profile;
            }

            // Fallback to legacy cache for migration period
            const cached = userProfileCache.get(uid);
            const now = Date.now();
            if (cached && (now - cached.timestamp < CACHE_TTL)) {
                // Migrate to new cache system
                await cacheManager.set(cacheKey, cached.data, 'user');
                return cached.data;
            }

            // Fetch from Firestore
            const docRef = doc(db, USERS_COLLECTION, uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                profile = {
                    uid,
                    username: data.username,
                    email: data.email,
                    photoURL: data.photoURL,
                    displayName: data.displayName || data.username, // Read displayName
                    bio: data.bio || undefined, // Map bio
                    frame: data.selectedFrame,
                    createdAt: data.createdAt,
                    privacySettings: data.privacySettings,
                    notificationSettings: data.notificationSettings
                };

                // Cache in both systems during migration
                await cacheManager.set(cacheKey, profile, 'user');
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
    },

    /**
     * Syncs user profile with the backend (Postgres).
     */
    async syncUserProfileToBackend(displayName: string, avatarUrl?: string, bio?: string): Promise<void> {
        const api = (await import("@/lib/axios")).default;
        try {
            await api.put('/users/profile', {
                displayName,
                avatarUrl,
                bio
            });
        } catch (error) {
            console.error("Error syncing profile to backend:", error);
            throw error;
        }
    }
};
