"use client";

import { useEffect, useState } from "react";
import { getReviewsByUserId, Review, deleteReview } from "@/services/review-service";
import ReviewItem from "@/components/reviews/review-item";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function UserReviews() {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        if (!user) return;
        setLoading(true);
        const data = await getReviewsByUserId(user.uid);
        setReviews(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchReviews();
    }, [user]);

    const handleDelete = async (id: string) => {
        // Optimistic update handled in ReviewItem via onDelete callback which we'll use to refetch
        // Actually, ReviewItem handles the delete logic, but notifies parent via onDelete
        await fetchReviews();
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-white/5 rounded-xl border border-white/10">
                <p>Henüz hiç değerlendirme yapmadınız.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {reviews.map((review) => (
                <ReviewItem key={review.id} review={review} onDelete={handleDelete} />
            ))}
        </div>
    );
}
