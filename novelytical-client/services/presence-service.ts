import { rtdb, db } from "@/lib/firebase";
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp, push } from "firebase/database";
import { doc, updateDoc, serverTimestamp as firestoreServerTimestamp } from "firebase/firestore";

export interface UserPresence {
    state: 'online' | 'offline';
    lastChanged: number;
}

export const PresenceService = {
    /**
     * Starts tracking the current user's presence.
     * Sets status to 'online' when connected, and queues 'offline' on disconnect.
     */
    trackPresence(userId: string) {
        // Reference to special ".info/connected" location
        const connectedRef = ref(rtdb, ".info/connected");
        const userStatusRef = ref(rtdb, `/status/${userId}`);

        // Firestore ref for persistent "last seen" (optional, good for long term)
        const userFirestoreRef = doc(db, "users", userId);

        const unsubscribe = onValue(connectedRef, async (snapshot) => {
            if (snapshot.val() === false) {
                return;
            };

            // If we are here, we are connected.

            // 1. Set disconnect hook first (so if we crash immediately, we are covered)
            await onDisconnect(userStatusRef).set({
                state: 'offline',
                lastChanged: rtdbServerTimestamp()
            });

            // 2. Set status to online
            await set(userStatusRef, {
                state: 'online',
                lastChanged: rtdbServerTimestamp()
            });

            // 3. Optional: Update Firestore lastSeen (throttled typically, but okay for login)
            // We verify user exists first implicitly by being logged in.
            // updateDoc(userFirestoreRef, { lastSeen: firestoreServerTimestamp() }).catch(() => {});
        });

        return unsubscribe; // Return cleanup function
    },

    /**
     * Subscribes to a specific user's presence changes in Realtime Database.
     */
    subscribeToPresence(userId: string, callback: (presence: UserPresence | null) => void) {
        const userStatusRef = ref(rtdb, `/status/${userId}`);
        const unsubscribe = onValue(userStatusRef, (snapshot) => {
            const data = snapshot.val();
            callback(data ? (data as UserPresence) : null);
        });
        return unsubscribe;
    },

    /**
     * Manually sets status to offline (e.g. on logout)
     */
    async setOffline(userId: string) {
        const userStatusRef = ref(rtdb, `/status/${userId}`);
        await set(userStatusRef, {
            state: 'offline',
            lastChanged: rtdbServerTimestamp()
        });
    }
};
