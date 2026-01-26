"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { reviewService, CommentDto } from "@/services/reviewService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale'; // Türkçe tarih formatı

interface CommentsSectionProps {
    novelId: number;
}

export function CommentsSection({ novelId }: CommentsSectionProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = async () => {
        setLoading(true);
        const data = await reviewService.getComments(novelId);
        setComments(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchComments();
    }, [novelId]);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        if (!user) {
            toast.error("Yorum yapmak için giriş yapmalısınız.");
            return;
        }

        setSubmitting(true);
        try {
            const token = await user.getIdToken();
            const result = await reviewService.addComment(token, novelId, content);
            if (result.succeeded) {
                toast.success("Yorumun gönderildi!");
                setContent("");
                fetchComments(); // Refresh list
            } else {
                toast.error(result.message || "Bir hata oluştu.");
            }
        } catch (error) {
            toast.error("Yorum gönderilemedi.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-12 space-y-8 max-w-4xl mx-auto px-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                💬 Yorumlar
                <span className="text-sm font-normal text-muted-foreground bg-white/5 px-3 py-1 rounded-full">
                    {comments.length}
                </span>
            </h3>

            {/* Comment Form */}
            {user ? (
                <div className="flex gap-4 p-6 rounded-xl bg-zinc-900/50 border border-white/5 shadow-inner">
                    <Avatar className="w-10 h-10 border border-white/10">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                        <Textarea
                            placeholder="Bu roman hakkında ne düşünüyorsun?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="bg-black/40 border-white/10 text-gray-200 min-h-[100px] resize-none focus:ring-amber-500/20"
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || !content.trim()}
                                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 transition-all"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Gönder
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center bg-zinc-900/30 rounded-xl border border-dashed border-white/10">
                    <p className="text-gray-400">Yorum yapmak için giriş yapmalısınız.</p>
                </div>
            )}

            {/* Comment List */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
                    </div>
                ) : comments.length > 0 ? (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                            <Avatar className="w-10 h-10 border border-white/10 mt-1">
                                <AvatarImage src={comment.userAvatar || undefined} />
                                <AvatarFallback>{comment.userName?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-200">{comment.userName}</span>
                                    <span className="text-xs text-gray-500">•</span>
                                    <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: tr })}
                                    </span>
                                </div>
                                <div className="bg-zinc-900/50 p-4 rounded-xl rounded-tl-sm border border-white/5 text-gray-300 text-sm leading-relaxed group-hover:border-white/10 transition-colors">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500 italic">
                        Henüz hiç yorum yok. İlk yorumu sen yap!
                    </div>
                )}
            </div>
        </div>
    );
}
