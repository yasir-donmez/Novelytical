"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, setPersistence, browserLocalPersistence, getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Enforce persistence
        setPersistence(auth, browserLocalPersistence).catch((err) =>
            console.error("Auth persistence error:", err)
        );

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Presence Tracking
    useEffect(() => {
        if (!user) return;

        // Dynamic import to avoid SSR issues if any, though firebase.ts handles safe init
        let cleanup: (() => void) | undefined;

        import("@/services/presence-service").then(({ PresenceService }) => {
            cleanup = PresenceService.trackPresence(user.uid);
        });

        return () => {
            if (cleanup) cleanup();
            // On hard unmount (logout), we might also want to force offline, but trackPresence's onDisconnect handles the tab close / network loss.
            // Explicit logout handling usually happens in the logout function itself.
            import("@/services/presence-service").then(({ PresenceService }) => {
                PresenceService.setOffline(user.uid).catch(() => { });
            });
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
