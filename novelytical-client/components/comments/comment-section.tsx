"use client";

import { useEffect, useState } from "react";
import { getCommentsByNovelId, deleteComment, Comment } from "@/services/comment-service";
import CommentForm from "./comment-form";
import CommentList from "./comment-list";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface CommentSectionProps {
    novelId: number;
}

export default function CommentSection({ novelId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchComments = async () => {
        const data = await getCommentsByNovelId(novelId);
        setComments(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchComments();
    }, [novelId]);

    const handleDelete = async (commentId: string) => {
        if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;

        try {
            await deleteComment(commentId);
            toast.success("Yorum silindi.");
            fetchComments();
        } catch (error) {
            console.error(error);
            toast.error("Silme işlemi başarısız.");
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold">Yorumlar</h2>
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50">
                    {comments.length}
                </Badge>
            </div>

            <CommentForm novelId={novelId} onCommentAdded={fetchComments} />

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <CommentList comments={comments} onDelete={handleDelete} onReplyAdded={fetchComments} />
            )}
        </div>
    );
}
