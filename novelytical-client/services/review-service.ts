import api from '@/lib/axios';

export interface Ratings {
    story: number;
    characters: number;
    world: number;
    flow: number;
    grammar: number;
}

// Keeping definitions compatible with existing UI code for now
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
    userReaction?: number;
    parentId?: number;
    replies?: CommentDto[];
    isDeleted?: boolean;
    novelId: number;
}

export interface ReviewDto {
    id: number;
    novelId: number;
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
    userReaction?: number;
}

// UI Model for compatibility
export interface Review extends Omit<ReviewDto, 'id' | 'novelId' | 'createdAt'> {
    id: string;
    novelId: string;
    userName: string;
    userImage?: string;
    ratings: Ratings;
    averageRating: number;
    createdAt: Date;
    novelTitle?: string;
    novelCover?: string;
}

export const reviewService = {
    // Queries
    async getComments(novelId: number, page: number = 1, pageSize: number = 10): Promise<CommentDto[]> {
        const { data } = await api.get<CommentDto[] | { data: CommentDto[] }>(`/reviews/novel/${novelId}/comments`, {
            params: { page, pageSize }
        });
        // Handle both raw array and wrapped response
        const comments = Array.isArray(data) ? data : (data as { data: CommentDto[] }).data;
        return comments || [];
    },

    async getReviews(novelId: number, page: number = 1, pageSize: number = 5): Promise<ReviewDto[]> {
        const { data } = await api.get<ReviewDto[] | { data: ReviewDto[] }>(`/reviews/novel/${novelId}/reviews`, {
            params: { page, pageSize }
        });
        // Handle both raw array and wrapped response
        const reviews = Array.isArray(data) ? data : (data as { data: ReviewDto[] }).data;
        return reviews || [];
    },

    async getReviewsByUserId(userId: string): Promise<Review[]> {
        try {
            const { data } = await api.get<ReviewDto[] | { data: ReviewDto[] }>(`/reviews/user/${userId}/reviews`);

            // Handle both raw array and wrapped response
            const reviews = Array.isArray(data) ? data : (data as { data: ReviewDto[] }).data;

            if (!reviews || !Array.isArray(reviews)) return [];

            // Map DTO to UI Model
            return reviews.map(r => ({
                ...r,
                id: r.id.toString(),
                novelId: r.novelId.toString(),
                userName: r.userDisplayName,
                userImage: r.userAvatarUrl,
                ratings: {
                    story: r.ratingStory,
                    characters: r.ratingCharacters,
                    world: r.ratingWorld,
                    flow: r.ratingFlow,
                    grammar: r.ratingGrammar
                },
                averageRating: r.ratingOverall,
                createdAt: new Date(r.createdAt),
                novelTitle: "Novel " + r.novelId // Backend should ideally provide this
            }));
        } catch (error) {
            console.error("Error fetching user reviews:", error);
            return [];
        }
    },

    async getLatestReviews(count: number = 5): Promise<Review[]> {
        try {
            const { data } = await api.get<ReviewDto[] | { data: ReviewDto[] }>(`/reviews/latest`, {
                params: { count }
            });

            // Handle both raw array and wrapped response
            const reviews = Array.isArray(data) ? data : (data as { data: ReviewDto[] }).data;

            if (!reviews || !Array.isArray(reviews)) return [];

            return reviews.map(r => ({
                ...r,
                id: r.id.toString(),
                novelId: r.novelId.toString(),
                userName: r.userDisplayName,
                userImage: r.userAvatarUrl,
                ratings: {
                    story: r.ratingStory,
                    characters: r.ratingCharacters,
                    world: r.ratingWorld,
                    flow: r.ratingFlow,
                    grammar: r.ratingGrammar
                },
                averageRating: r.ratingOverall,
                createdAt: new Date(r.createdAt),
                novelTitle: "Novel " + r.novelId
            }));
        } catch (error) {
            console.error("Error fetching latest reviews:", error);
            return [];
        }
    },

    // Commands
    async addComment(token: string, novelId: number, content: string, isSpoiler: boolean, parentId?: number) {
        try {
            await api.post('/reviews/comment', { novelId, content, isSpoiler, parentId });
            return { succeeded: true };
        } catch (error: any) {
            return { succeeded: false, message: error.response?.data?.message || "Yorum eklenemedi" };
        }
    },

    async addReview(token: string, novelId: number, content: string, ratings: Ratings, isSpoiler: boolean) {
        try {
            await api.post('/reviews/review', {
                novelId,
                content,
                isSpoiler,
                ratingOverall: (ratings.story + ratings.characters + ratings.world + ratings.flow + ratings.grammar) / 5,
                ratingStory: ratings.story,
                ratingCharacters: ratings.characters,
                ratingWorld: ratings.world,
                ratingFlow: ratings.flow,
                ratingGrammar: ratings.grammar
            });
            return { succeeded: true };
        } catch (error: any) {
            return { succeeded: false, message: error.response?.data?.message || "İnceleme eklenemedi" };
        }
    },

    async deleteComment(token: string, commentId: number) {
        try {
            await api.delete(`/reviews/comment/${commentId}`);
            return true;
        } catch { return false; }
    },

    async deleteReview(token: string, reviewId: number) {
        try {
            await api.delete(`/reviews/review/${reviewId}`);
            return true;
        } catch { return false; }
    },

    async toggleReaction(entityType: 'comment' | 'review', id: number, reactionType: number) {
        try {
            const endpoint = entityType === 'comment'
                ? `/reviews/comment/${id}/reaction`
                : `/reviews/review/${id}/reaction`;

            const { data } = await api.post<{ data: { likes: number, dislikes: number } }>(endpoint, { reactionType });
            return data.data;
        } catch (error) {
            throw new Error("Reaction failed");
        }
    },

    // Bulk Reaction Fetching
    async getReactions(entityType: 'comment' | 'review', ids: number[]) {
        try {
            const endpoint = entityType === 'comment'
                ? `/reviews/comments/reactions`
                : `/reviews/reviews/reactions`;

            const { data } = await api.post<{ data: Record<number, number> }>(endpoint, ids);
            return data.data;
        } catch { return {}; }
    }
};

// Aliases for compatibility
export const getReviewsByUserId = reviewService.getReviewsByUserId;
export const getLatestReviews = reviewService.getLatestReviews;
export const deleteReview = (token: string, id: number) => reviewService.deleteReview(token, id);
export const getReviewsByNovelId = async (novelId: number) => {
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
        createdAt: new Date(r.createdAt)
    }));
};
