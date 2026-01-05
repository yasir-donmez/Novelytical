"use client";

import { useEffect, useState } from "react";
import { getReviewsByUserId, Review } from "@/services/review-service";
import { getCommentsByUserId, Comment } from "@/services/comment-service"; // Assuming simple getComments exists
import { novelService } from "@/services/novelService";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Star, MessageCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { NovelListDto } from "@/types/novel";

interface InteractionSummary {
    novelId: number;
    novel?: NovelListDto; // Will serve as detail container
    userReview?: Review;
    commentCount: number;
    lastInteraction: Date;
}

export default function UserInteractionList() {
    const { user } = useAuth();
    const [interactions, setInteractions] = useState<InteractionSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Parallel fetch
                const [reviews, comments] = await Promise.all([
                    getReviewsByUserId(user.uid),
                    getCommentsByUserId(user.uid)
                ]);

                // Map to group by Novel ID
                const interactionMap = new Map<number, InteractionSummary>();

                // Process Reviews
                reviews.forEach(review => {
                    if (!interactionMap.has(review.novelId)) {
                        interactionMap.set(review.novelId, {
                            novelId: review.novelId,
                            commentCount: 0,
                            lastInteraction: review.createdAt?.toDate() || new Date()
                        });
                    }
                    const summary = interactionMap.get(review.novelId)!;
                    summary.userReview = review;
                    if (review.createdAt?.toDate() > summary.lastInteraction) {
                        summary.lastInteraction = review.createdAt.toDate();
                    }
                });

                // Process Comments
                comments.forEach(comment => {
                    if (!interactionMap.has(comment.novelId)) {
                        interactionMap.set(comment.novelId, {
                            novelId: comment.novelId,
                            commentCount: 0,
                            lastInteraction: comment.createdAt?.toDate() || new Date()
                        });
                    }
                    const summary = interactionMap.get(comment.novelId)!;
                    summary.commentCount++;
                    if (comment.createdAt?.toDate() > summary.lastInteraction) {
                        summary.lastInteraction = comment.createdAt.toDate();
                    }
                });

                const summaryList = Array.from(interactionMap.values());

                // Fetch Novel Details (Batched/Parallel if possible, or individually for now)
                // Since there is no batch endpoint, we will fetch individually but in parallel
                // Limit concurrency if needed, but for now Promise.all is okay for reasonable amounts
                const summariesWithNovels = await Promise.all(summaryList.map(async (item) => {
                    try {
                        // Assuming getNovelById returns detailed info, can be heavy.
                        // Ideally we'd have a lighter endpoint or ID list support.
                        const novelData = await novelService.getNovelById(item.novelId);
                        // Convert Detail to ListDto shape vaguely or just use relevant fields
                        return { ...item, novel: novelData as unknown as NovelListDto };
                    } catch (e) {
                        console.error(`Failed to load novel ${item.novelId}`, e);
                        return item;
                    }
                }));

                // Sort by last interaction
                summariesWithNovels.sort((a, b) => b.lastInteraction.getTime() - a.lastInteraction.getTime());

                setInteractions(summariesWithNovels);

            } catch (error) {
                console.error("Error fetching interactions", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-purple-500" /></div>;
    }

    if (interactions.length === 0) {
        return (
            <div className="text-center py-16 bg-black/5 dark:bg-zinc-800/40 rounded-xl border border-black/5 dark:border-white/10">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Henüz etkileşiminiz yok</h3>
                <p className="text-muted-foreground mt-2 mb-6">Romanlara yorum yaparak veya değerlendirerek burada görebilirsiniz.</p>
                <Link href="/" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium transition-colors">
                    Kitapları Keşfet
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {interactions.map((item) => (
                <div key={item.novelId} className="flex flex-col sm:flex-row gap-4 p-4 bg-black/5 dark:bg-zinc-800/40 backdrop-blur-sm border border-black/5 dark:border-white/10 rounded-xl transition-all group">
                    {/* Novel Cover (Small) */}
                    <div className="shrink-0 w-full sm:w-20 h-28 bg-black/20 rounded-md overflow-hidden relative">
                        {item.novel?.coverUrl ? (
                            <img src={item.novel.coverUrl} alt={item.novel.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                <BookOpen size={24} />
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <Link href={`/novel/${item.novelId}`}>
                                <h3 className="font-bold text-lg hover:text-purple-400 transition-colors line-clamp-1 inline-block">
                                    {item.novel?.title || `Roman #${item.novelId}`}
                                </h3>
                            </Link>

                            <div className="flex flex-wrap gap-2 mt-3">
                                {item.userReview && (
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 gap-1.5 py-1">
                                        <Star size={12} className="fill-purple-400" />
                                        Puanınız: <span className="font-bold">{item.userReview.averageRating}</span>
                                    </Badge>
                                )}
                                {item.commentCount > 0 && (
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1.5 py-1">
                                        <MessageCircle size={12} />
                                        {item.commentCount} Yorum
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-end mt-4 sm:mt-0">
                            <span className="text-xs text-muted-foreground">
                                Son etkileşim: {item.lastInteraction.toLocaleDateString('tr-TR')}
                            </span>
                            <Link
                                href={`/novel/${item.novelId}`}
                                className="text-xs font-medium text-foreground/70 hover:text-foreground bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
                            >
                                Romana Git →
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
