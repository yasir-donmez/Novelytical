"use client";

import { useEffect, useState, useCallback } from "react";
import { getCommentsByUserId, Comment, deleteComment } from "@/services/comment-service";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Loader2, Trash2, Calendar, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

export default function UserComments() {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComments = useCallback(async () => {
        if (!user) return;
        // Don't set loading true if we are refreshing after delete to avoid full spinner
        // But for initial load we want it.
        // We can check if comments are empty?
        // simple approach:
        try {
            const data = await getCommentsByUserId(user.uid);
            setComments(data);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        setLoading(true);
        fetchComments();
    }, [fetchComments]);

    const handleDelete = async (commentId: string) => {
        if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
        try {
            await deleteComment(commentId);
            toast.success("Yorum silindi.");
            fetchComments();
        } catch (error) {
            toast.error("Silinirken hata oluştu.");
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500" /></div>;
    }

    if (comments.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-white/5 rounded-xl border border-white/10">
                <p>Henüz hiç yorum yapmadınız.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {comments.map((comment) => (
                <div key={comment.id} className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-purple-500/30 transition-colors group">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                                <Link href={`/novel/${comment.novelId}`} className="flex items-center gap-1 hover:text-purple-400 transition-colors font-medium">
                                    <BookOpen size={12} />
                                    <span>Roman #{comment.novelId}</span>
                                </Link>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: tr }) : ""}
                                </span>
                            </div>

                            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {comment.content}
                            </p>

                            {comment.parentId && (
                                <div className="mt-2 text-xs text-muted-foreground/60 italic border-l-2 border-white/10 pl-2">
                                    Bir yoruma yanıt verildi
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => handleDelete(comment.id)}
                            className="text-muted-foreground/50 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Yorumu sil"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
