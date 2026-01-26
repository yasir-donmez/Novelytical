import { BackendUser } from '../types/backend-user';

const API_Base = process.env.NEXT_PUBLIC_API_URL || '';

export const userService = {
    // 1. Sync User (Firebase -> Postgres)
    syncUser: async (token: string, data: { email: string | null; displayName: string | null; avatarUrl: string | null }): Promise<BackendUser | null> => {
        try {
            const response = await fetch(`${API_Base}/api/users/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                console.error('Sync failed:', await response.text());
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Error syncing user:', error);
            return null;
        }
    },

    // 2. Get User Profile (from Postgres)
    getMyProfile: async (token: string): Promise<BackendUser | null> => {
        try {
            const response = await fetch(`${API_Base}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    }
};
