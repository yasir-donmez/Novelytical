
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    getDocs,
    serverTimestamp
} from "firebase/firestore";

const USERS_COLLECTION = "users";

export interface UserProfile {
    uid: string;
    username: string;
    email: string;
    createdAt: any;
    photoURL?: string;
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
    }
};
