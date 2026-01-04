"use client";

import { useEffect, useState } from "react";
import { getReviewsByNovelId, Review } from "@/services/review-service";
import ReviewForm from "./review-form";
import ReviewList from "./review-list";
import { Badge } from "@/components/ui/badge";

interface ReviewSectionProps {
    novelId: number;
}

export default function ReviewSection({ novelId }: ReviewSectionProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        const data = await getReviewsByNovelId(novelId);
        setReviews(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchReviews();
    }, [novelId]);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold">Okur Değerlendirmeleri</h2>
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50">
                    {reviews.length}
                </Badge>
            </div>

            <ReviewForm novelId={novelId} onReviewAdded={fetchReviews} />

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <ReviewList reviews={reviews} />
            )}
        </div>
    );
}
