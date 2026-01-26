export interface BackendUser {
    id: string; // Postgres ID (Guid)
    firebaseUid: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    role: 'User' | 'Admin' | 'Moderator';
    createdAt: string;
}
