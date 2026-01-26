// import { handleApiError } from "@/lib/api-utils";

export interface Ratings {
    story: number;
    characters: number;
    world: number;
    flow: number;
    grammar: number;
}

export interface CommentDto {
    id: number;
    userId: string;
    firebaseUid: string;
    content: string;
    isSpoiler: boolean;
    likeCount: number;
    dislikeCount: number;
    userDisplayName: string;
    userAvatarUrl?: string;
    createdAt: string;
    // Client-side enriched
    userReaction?: number; // 1: Like, -1: Dislike
    parentId?: number;
    replies?: CommentDto[];
    isDeleted?: boolean;
}

export interface ReviewDto {
    id: number;
    novelId: number; // Added novelId
    userId: string;
    firebaseUid: string;
    content: string;
    isSpoiler: boolean;
    likeCount: number;
    dislikeCount: number;
    userDisplayName: string;
    userAvatarUrl?: string;
    ratingOverall: number;
    ratingStory: number;
    ratingCharacters: number;
    ratingWorld: number;
    ratingFlow: number;
    ratingGrammar: number;
    createdAt: string;
    // Client-side enriched
    userReaction?: number;
}
// ... (existing code) ...

export const getReviewsByUserId = async (userId: string): Promise<Review[]> => {
    // Fetch from backend API
    const res = await fetch(`${getApiUrl()}/api/reviews/user/${userId}/reviews`, {
        cache: 'no-store'
    });

    if (!res.ok) return [];

    const dtos: ReviewDto[] = await res.json();

    // Map DTO to UI Model
    return dtos.map(r => ({
        id: r.id.toString(),
        novelId: r.novelId.toString(), // Convert number to string for frontend compatibility if needed, or keep number if UI expects number.
        // Comment interface has novelId: number. Review interface has novelId: string.
        // Let's decide on ONE.
        // Since NovelListDto uses Id: number usually in this app (DB is int), but existing frontend 'Review' interface used string.
        // I will keep it string HERE in Review interface to match existing usages, but coerce it.
        userId: r.userId,
        userName: r.userDisplayName,
        userImage: r.userAvatarUrl,
        content: r.content,
        ratings: {
            story: r.ratingStory,
            characters: r.ratingCharacters,
            world: r.ratingWorld,
            flow: r.ratingFlow,
            grammar: r.ratingGrammar
        },
        averageRating: r.ratingOverall,
        createdAt: new Date(r.createdAt),
        novelTitle: "Yükleniyor...",
        novelCover: undefined,
        firebaseUid: r.firebaseUid,
        likeCount: r.likeCount,
        dislikeCount: r.dislikeCount,
        userReaction: r.userReaction,
        isSpoiler: r.isSpoiler
    }));
};

// Helper to get API URL
const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || '';
    }
    return process.env.NEXT_PUBLIC_API_URL || '';
};

export const reviewService = {
    async getComments(novelId: number, page: number = 1, pageSize: number = 10): Promise<CommentDto[]> {
        const res = await fetch(`${getApiUrl()}/api/reviews/novel/${novelId}/comments?page=${page}&pageSize=${pageSize}`, {
            cache: 'no-store'
        });
        if (!res.ok) return [];
        return await res.json();
    },

    async getReviews(novelId: number, page: number = 1, pageSize: number = 5): Promise<ReviewDto[]> {
        const res = await fetch(`${getApiUrl()}/api/reviews/novel/${novelId}/reviews?page=${page}&pageSize=${pageSize}`, {
            cache: 'no-store'
        });
        if (!res.ok) return [];
        return await res.json();
    },

    async addComment(token: string, novelId: number, content: string, isSpoiler: boolean, parentId?: number) {
        try {
            const res = await fetch(`${getApiUrl()}/api/reviews/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ novelId, content, isSpoiler, parentId })
            });

            if (!res.ok) {
                const error = await res.text();
                return { succeeded: false, message: error };
            }

            return { succeeded: true };
        } catch (error) {
            console.error("Add comment failed", error);
            return { succeeded: false, message: "Bağlantı hatası" };
        }
    },

    async addReview(token: string, novelId: number, content: string, ratings: Ratings, isSpoiler: boolean) {
        // ... (existing logic works as upsert now)
        // Wraps endpoint
        return this._postReview(token, novelId, content, ratings, isSpoiler);
    },

    async _postReview(token: string, novelId: number, content: string, ratings: Ratings, isSpoiler: boolean) {
        try {
            const res = await fetch(`${getApiUrl()}/api/reviews/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    novelId,
                    content,
                    isSpoiler,
                    ratingOverall: (ratings.story + ratings.characters + ratings.world + ratings.flow + ratings.grammar) / 5,
                    ratingStory: ratings.story,
                    ratingCharacters: ratings.characters,
                    ratingWorld: ratings.world,
                    ratingFlow: ratings.flow,
                    ratingGrammar: ratings.grammar
                })
            });

            if (!res.ok) {
                const error = await res.text();
                return { succeeded: false, message: error };
            }

            return { succeeded: true };
        } catch (error) {
            console.error("Add review failed", error);
            return { succeeded: false, message: "Bağlantı hatası" };
        }
    },

    async deleteComment(token: string, commentId: number) {
        try {
            const res = await fetch(`${getApiUrl()}/api/reviews/comment/${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return res.ok;
        } catch (e) { return false; }
    },

    async deleteReview(token: string, reviewId: number) {
        try {
            const res = await fetch(`${getApiUrl()}/api/reviews/review/${reviewId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return res.ok;
        } catch (e) { return false; }
    },

    async toggleCommentReaction(token: string, commentId: number, reactionType: number) {
        const res = await fetch(`${getApiUrl()}/api/reviews/comment/${commentId}/reaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reactionType })
        });
        if (!res.ok) throw new Error("Reaction failed");
        return await res.json();
    },

    async toggleReviewReaction(token: string, reviewId: number, reactionType: number) {
        const res = await fetch(`${getApiUrl()}/api/reviews/review/${reviewId}/reaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reactionType })
        });
        if (!res.ok) throw new Error("Reaction failed");
        return await res.json();
    },

    async getCommentReactions(token: string, commentIds: number[]) {
        const res = await fetch(`${getApiUrl()}/api/reviews/comments/reactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(commentIds)
        });
        if (!res.ok) return {};
        return await res.json();
    },

    async getReviewReactions(token: string, reviewIds: number[]) {
        const res = await fetch(`${getApiUrl()}/api/reviews/reviews/reactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewIds)
        });
        if (!res.ok) return {};
        return await res.json();
    },

    // Legacy Wrappers (if needed for older components not yet updated)
    getReviewsByNovelId: async (novelId: number) => {
        // This is a minimal shim to prevent crashes if other parts of the app call this.
        // It fetches reviews using the new API but maps them to a shape compatible with old code if possible.
        // For now returning empty array or minimal mapped data.
        const dtos = await reviewService.getReviews(novelId, 1, 100);
        return dtos.map(r => ({
            id: r.id.toString(),
            novelId: novelId,
            userId: r.userId,
            userName: r.userDisplayName,
            userImage: r.userAvatarUrl,
            content: r.content,
            ratings: {
                story: r.ratingStory,
                characters: r.ratingCharacters,
                world: r.ratingWorld,
                flow: r.ratingFlow,
                grammar: r.ratingGrammar
            },
            averageRating: r.ratingOverall,
            likes: r.likeCount,
            unlikes: r.dislikeCount,
            createdAt: new Date(r.createdAt) // Convert string to Date object if old code expects Date or Firebase Timestamp
        }));
    }
};

export const getReviewsByNovelId = reviewService.getReviewsByNovelId;
export const deleteReview = reviewService.deleteReview;

// Community Pulse Compatibility Types and Functions
export interface Review {
    id: string;
    novelId: string;
    userId: string;
    userName: string;
    userImage?: string;
    content: string;
    ratings: {
        story: number;
        characters: number;
        world: number;
        flow: number;
        grammar: number;
    };
    averageRating: number;
    novelTitle?: string;
    novelCover?: string;
    createdAt?: Date;
    firebaseUid?: string;
    likeCount?: number;
    dislikeCount?: number;
    userReaction?: number;
    isSpoiler?: boolean;
}

export const getLatestReviews = async (count: number = 5): Promise<Review[]> => {
    try {
        const res = await fetch(`${getApiUrl()}/api/reviews/latest?count=${count}`);
        if (!res.ok) return [];
        const dtos: ReviewDto[] = await res.json();

        return dtos.map(r => ({
            id: r.id.toString(),
            novelId: r.novelId.toString(),
            userId: r.userId,
            userName: r.userDisplayName,
            userImage: r.userAvatarUrl,
            content: r.content,
            ratings: {
                story: r.ratingStory,
                characters: r.ratingCharacters,
                world: r.ratingWorld,
                flow: r.ratingFlow,
                grammar: r.ratingGrammar
            },
            averageRating: r.ratingOverall,
            novelTitle: "Novel " + r.novelId, // Ideally backend returns Title
            novelCover: undefined // Backend currently doesn't populate Novel Title/Cover in DTO?
        }));
    } catch (error) {
        console.error("Error fetching latest reviews:", error);
        return [];
    }
};


