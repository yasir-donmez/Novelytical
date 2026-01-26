"use client";

import { useEffect, useState } from "react";
import { ReviewDto, Review, reviewService } from "@/services/review-service";
import ReviewForm from "./review-form";
import ReviewList from "./review-list";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

interface ReviewSectionProps {
    novelId: number;
    coverImage?: string;
}

export default function ReviewSection({ novelId, coverImage }: ReviewSectionProps) {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            setPage(1);
            const newReviews = await reviewService.getReviews(novelId, 1, 5);

            if (user && newReviews.length > 0) {
                try {
                    const token = await user.getIdToken();
                    const reactionMap = await reviewService.getReviewReactions(token, newReviews.map(r => r.id));
                    newReviews.forEach(r => {
                        if (reactionMap[r.id]) {
                            r.userReaction = reactionMap[r.id];
                        }
                    });
                } catch (e) { console.error(e); }
            }

            // Map to Review
            const mappedReviews: Review[] = newReviews.map(r => ({
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
                novelTitle: "",
                novelCover: undefined,
                createdAt: new Date(r.createdAt),
                firebaseUid: r.firebaseUid,
                likeCount: r.likeCount,
                dislikeCount: r.dislikeCount,
                userReaction: r.userReaction,
                isSpoiler: r.isSpoiler
            }));

            setReviews(mappedReviews);
            setHasMore(newReviews.length >= 5);
            setLoading(false);
        };
        fetchInitial();
    }, [novelId, user]);

    // Load More Function
    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        const newReviews = await reviewService.getReviews(novelId, nextPage, 5);

        if (newReviews.length > 0) {
            if (user) {
                try {
                    const token = await user.getIdToken();
                    const reactionMap = await reviewService.getReviewReactions(token, newReviews.map(r => r.id));
                    newReviews.forEach(r => {
                        if (reactionMap[r.id]) {
                            r.userReaction = reactionMap[r.id];
                        }
                    });
                } catch (e) { console.error(e); }
            }

            // Map to Review
            const mappedReviews: Review[] = newReviews.map(r => ({
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
                novelTitle: "",
                novelCover: undefined,
                createdAt: new Date(r.createdAt),
                firebaseUid: r.firebaseUid,
                likeCount: r.likeCount,
                dislikeCount: r.dislikeCount,
                userReaction: r.userReaction,
                isSpoiler: r.isSpoiler
            }));

            setReviews(prev => [...prev, ...mappedReviews]);
            setPage(nextPage);
            setHasMore(newReviews.length >= 5);
        } else {
            setHasMore(false);
        }
        setLoadingMore(false);
    };

    // Callback
    const handleReviewAdded = () => {
        const fetchInitial = async () => {
            setPage(1);
            const newReviews = await reviewService.getReviews(novelId, 1, 5);
            if (user && newReviews.length > 0) {
                try {
                    const token = await user.getIdToken();
                    const reactionMap = await reviewService.getReviewReactions(token, newReviews.map(r => r.id));
                    newReviews.forEach(r => {
                        if (reactionMap[r.id]) {
                            r.userReaction = reactionMap[r.id];
                        }
                    });
                } catch (e) { console.error(e); }
            }

            // Map to Review
            const mappedReviews: Review[] = newReviews.map(r => ({
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
                novelTitle: "",
                novelCover: undefined,
                createdAt: new Date(r.createdAt),
                firebaseUid: r.firebaseUid,
                likeCount: r.likeCount,
                dislikeCount: r.dislikeCount,
                userReaction: r.userReaction,
                isSpoiler: r.isSpoiler
            }));

            setReviews(mappedReviews);
            setHasMore(newReviews.length >= 5);
        };
        fetchInitial();
    };

    const userReview = user ? reviews.find(r => r.firebaseUid === user.uid) : undefined;

    const handleDelete = async (id: string) => {
        if (!user) return;
        if (!confirm("Bunu silmek istediğinize emin misiniz?")) return;

        try {
            const token = await user.getIdToken();
            const success = await reviewService.deleteReview(token, parseInt(id));
            if (success) {
                setReviews(prev => prev.filter(r => r.id !== id));
                toast.success("Değerlendirme silindi.");
            } else {
                toast.error("Silme başarısız.");
            }
        } catch (e) {
            toast.error("Bir hata oluştu.");
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">Okur Değerlendirmeleri</h2>
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {reviews.length}{hasMore ? "+" : ""}
                    </Badge>
                </div>
            </div>

            <ReviewForm
                novelId={novelId}
                coverImage={coverImage}
                onReviewAdded={handleReviewAdded}
                existingReview={userReview}
            />

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
                </div>
            ) : (
                <>
                    <ReviewList reviews={reviews} onDelete={handleDelete} />

                    {hasMore && (
                        <div className="flex justify-center mt-6">
                            <Button
                                variant="outline"
                                onClick={loadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Daha Fazla Yükle
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
