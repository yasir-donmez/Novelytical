"use client";

import { useState, useEffect } from "react";
import { deleteComment, Comment, getCommentsPaginated } from "@/services/comment-service";
import CommentForm from "./comment-form";
import CommentList from "./comment-list";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";

interface CommentSectionProps {
    novelId: number;
}

export default function CommentSection({ novelId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOption, setSortOption] = useState("newest");
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const { user } = useAuth();

    // Initial Fetch
    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            const { comments: newComments, lastVisible } = await getCommentsPaginated(novelId, sortOption, 10, null);
            setComments(newComments);
            setLastDoc(lastVisible);
            setHasMore(newComments.length === 10);
            setLoading(false);
        };
        fetchInitial();
    }, [novelId, sortOption]);

    // Load More
    const loadMore = async () => {
        if (loadingMore || !hasMore || !lastDoc) return;
        setLoadingMore(true);
        const { comments: newComments, lastVisible } = await getCommentsPaginated(novelId, sortOption, 10, lastDoc);

        if (newComments.length > 0) {
            setComments(prev => [...prev, ...newComments]);
            setLastDoc(lastVisible);
            setHasMore(newComments.length === 10);
        } else {
            setHasMore(false);
        }
        setLoadingMore(false);
    };

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
                    loadMore();
                }
            },
            { threshold: 1.0 }
        );

        const sentinel = document.getElementById("comment-sentinel");
        if (sentinel) observer.observe(sentinel);

        return () => observer.disconnect();
    }, [loading, loadingMore, hasMore, lastDoc]);

    const handleDelete = async (commentId: string) => {
        if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;

        try {
            await deleteComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success("Yorum silindi.");
        } catch (error) {
            console.error(error);
            toast.error("Silme işlemi başarısız.");
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">Yorumlar</h2>
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50">
                        {comments.length}
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

            <CommentForm novelId={novelId} onCommentAdded={() => { }} />

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <>
                    <CommentList comments={comments} onDelete={handleDelete} onReplyAdded={() => { }} />

                    {/* Sentinel for Infinite Scroll */}
                    <div id="comment-sentinel" className="h-4 w-full flex justify-center mt-4">
                        {loadingMore && <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />}
                    </div>
                </>
            )}
        </div>
    );
}
