"use client";

import { useEffect, useState } from "react";
import { Review, getReviewsPaginated } from "@/services/review-service";
import ReviewForm from "./review-form";
import ReviewList from "./review-list";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Loader2 } from "lucide-react";

interface ReviewSectionProps {
    novelId: number;
    coverImage?: string;
}

export default function ReviewSection({ novelId, coverImage }: ReviewSectionProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOption, setSortOption] = useState("newest");
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            const { reviews: newReviews, lastVisible } = await getReviewsPaginated(novelId, sortOption, 10, null);
            setReviews(newReviews);
            setLastDoc(lastVisible);
            setHasMore(newReviews.length === 10);
            setLoading(false);
        };
        fetchInitial();
    }, [novelId, sortOption]);

    // Load More Function
    const loadMore = async () => {
        if (loadingMore || !hasMore || !lastDoc) return;
        setLoadingMore(true);
        const { reviews: newReviews, lastVisible } = await getReviewsPaginated(novelId, sortOption, 10, lastDoc);

        if (newReviews.length > 0) {
            setReviews(prev => [...prev, ...newReviews]);
            setLastDoc(lastVisible);
            setHasMore(newReviews.length === 10);
        } else {
            setHasMore(false);
        }
        setLoadingMore(false);
    };

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
                    loadMore();
                }
            },
            { threshold: 1.0 }
        );

        const sentinel = document.getElementById("review-sentinel");
        if (sentinel) observer.observe(sentinel);

        return () => observer.disconnect();
    }, [loading, loadingMore, hasMore, lastDoc]);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">Okur Değerlendirmeleri</h2>
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50">
                        {reviews.length}
                    </Badge>
                </div>
                <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[200px] h-9 text-xs font-medium bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-colors focus:ring-0">
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Sıralama" />
                        </div>
                    </SelectTrigger>
                    <SelectContent position="popper" align="end" sideOffset={5}>
                        <SelectItem value="newest">En Yeni</SelectItem>
                        <SelectItem value="oldest">En Eski</SelectItem>
                        <SelectItem value="likes_desc">En Çok Beğenilenler</SelectItem>
                        <SelectItem value="dislikes_desc">En Çok Beğenilmeyenler</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <ReviewForm novelId={novelId} coverImage={coverImage} onReviewAdded={() => { }} />

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
                </div>
            ) : (
                <>
                    <ReviewList reviews={reviews} onDelete={async (id) => {
                        setReviews(prev => prev.filter(r => r.id !== id));
                    }} />

                    {/* Sentinel for Infinite Scroll */}
                    <div id="review-sentinel" className="h-4 w-full flex justify-center mt-4">
                        {loadingMore && <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />}
                    </div>
                </>
            )}
        </div>
    );
}
