"use client";

import { useState, useEffect } from "react";
import { reviewService, CommentDto } from "@/services/review-service";
import CommentForm from "./comment-form";
import CommentList from "./comment-list";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommentSectionProps {
    novelId: number;
}

export default function CommentSection({ novelId }: CommentSectionProps) {
    const [comments, setComments] = useState<CommentDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const { user } = useAuth();

    // Initial Fetch
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            setPage(1);
            const newComments = await reviewService.getComments(novelId, 1, 10);

            if (user && newComments.length > 0) {
                try {
                    const token = await user.getIdToken();
                    const reactionMap = await reviewService.getCommentReactions(token, newComments.map(c => c.id));
                    // Merge reactions
                    newComments.forEach(c => {
                        if (reactionMap[c.id]) {
                            c.userReaction = reactionMap[c.id];
                        }
                    });
                } catch (e) { console.error(e); }
            }

            setComments(newComments);
            setHasMore(newComments.length >= 10);
            setLoading(false);
        };
        fetchInitial();
    }, [novelId, user]);

    // Load More
    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        const newComments = await reviewService.getComments(novelId, nextPage, 10);

        if (newComments.length > 0) {
            if (user) {
                try {
                    const token = await user.getIdToken();
                    const reactionMap = await reviewService.getCommentReactions(token, newComments.map(c => c.id));
                    newComments.forEach(c => {
                        if (reactionMap[c.id]) {
                            c.userReaction = reactionMap[c.id];
                        }
                    });
                } catch (e) { console.error(e); }
            }

            setComments(prev => [...prev, ...newComments]);
            setPage(nextPage);
            setHasMore(newComments.length >= 10);
        } else {
            setHasMore(false);
        }
        setLoadingMore(false);
    };

    // Callback when a new comment is added
    const handleCommentAdded = () => {
        // Refresh list: reload first page
        const fetchInitial = async () => {
            setPage(1);
            const newComments = await reviewService.getComments(novelId, 1, 10);
            if (user && newComments.length > 0) {
                try {
                    const token = await user.getIdToken();
                    const reactionMap = await reviewService.getCommentReactions(token, newComments.map(c => c.id));
                    newComments.forEach(c => {
                        if (reactionMap[c.id]) {
                            c.userReaction = reactionMap[c.id];
                        }
                    });
                } catch (e) { console.error(e); }
            }
            setComments(newComments);
            setHasMore(newComments.length >= 10);
        };
        fetchInitial();
    };

    // Recursive helper to remove comment from tree
    const deleteCommentFromTree = (list: CommentDto[], targetId: number): CommentDto[] => {
        return list
            .filter(c => c.id !== targetId) // Filter from current level
            .map(c => ({
                ...c,
                replies: c.replies ? deleteCommentFromTree(c.replies, targetId) : [] // Recurse
            }));
    };

    const handleDelete = async (commentId: string) => {
        if (!user) return;
        if (!confirm("Bunu silmek istediğinize emin misiniz?")) return;

        try {
            const token = await user.getIdToken();
            const success = await reviewService.deleteComment(token, parseInt(commentId));
            if (success) {
                setComments(prev => deleteCommentFromTree(prev, parseInt(commentId)));
                toast.success("Yorum silindi.");
            } else {
                toast.error("Silme işlemi başarısız.");
            }
        } catch (e) {
            toast.error("Bir hata oluştu.");
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">Yorumlar</h2>
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {comments.length}{hasMore ? "+" : ""}
                    </Badge>
                </div>
                {/* Sorting removed as API currently doesn't support generic sort params easily mapped */}
            </div>

            <CommentForm novelId={novelId} onCommentAdded={handleCommentAdded} />

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <>
                    <CommentList
                        comments={comments}
                        novelId={novelId}
                        onDelete={handleDelete}
                        onReplyAdded={handleCommentAdded}
                    />

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
