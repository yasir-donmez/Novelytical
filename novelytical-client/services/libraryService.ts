const API_Base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export interface UserLibraryDto {
    novelId: number;
    novelTitle: string;
    novelSlug: string;
    coverImage: string | null;
    status: number; // Enum: 1=Reading, 2=Completed, etc.
    addedAt: string;
}

export enum ReadingStatus {
    Reading = 1,
    Completed = 2,
    PlanToRead = 3,
    OnHold = 4,
    Dropped = 5
}

export const libraryService = {
    // Add or Update Status
    updateStatus: async (token: string, novelId: number, status: ReadingStatus, currentChapter?: number) => {
        try {
            const response = await fetch(`${API_Base}/api/library`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ novelId, status, currentChapter })
            });
            return response.ok;
        } catch (error) {
            console.error('Library update failed:', error);
            return false;
        }
    },

    // Get My Library
    getMyLibrary: async (token: string): Promise<UserLibraryDto[]> => {
        try {
            const response = await fetch(`${API_Base}/api/library`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Get library failed:', error);
            return [];
        }
    },

    // Get Status for a Novel
    getNovelStatus: async (token: string, novelId: number): Promise<ReadingStatus | null> => {
        try {
            const response = await fetch(`${API_Base}/api/library/${novelId}/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.status;
        } catch (error) {
            return null;
        }
    }
};
