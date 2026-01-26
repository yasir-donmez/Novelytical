const API_Base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export interface CommentDto {
    id: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    content: string;
    likes: number;
    createdAt: string;
}

export interface ReviewDto {
    id: number;
    userId: string;
    userName: string;
    userAvatar: string | null;
    content: string;
    ratingOverall: number;
    ratingStory: number;
    ratingCharacters: number;
    ratingWorld: number;
    ratingFlow: number;
    ratingGrammar: number;
    createdAt: string;
}

export const reviewService = {
    // Add Comment
    addComment: async (token: string, novelId: number, content: string) => {
        const response = await fetch(`${API_Base}/api/reviews/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ novelId, content })
        });
        return await response.json();
    },

    // Add Review
    addReview: async (token: string, novelId: number, data: any) => {
        const response = await fetch(`${API_Base}/api/reviews/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ novelId, ...data })
        });
        return await response.json();
    },

    // Get Comments
    getComments: async (novelId: number, page: number = 1): Promise<CommentDto[]> => {
        const response = await fetch(`${API_Base}/api/reviews/novel/${novelId}/comments?page=${page}`);
        if (!response.ok) return [];
        return await response.json();
    },

    // Get Reviews
    getReviews: async (novelId: number, page: number = 1): Promise<ReviewDto[]> => {
        const response = await fetch(`${API_Base}/api/reviews/novel/${novelId}/reviews?page=${page}`);
        if (!response.ok) return [];
        return await response.json();
    }
};
