"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { reviewService } from "@/services/review-service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CommentFormProps {
    novelId: number;
    onCommentAdded: () => void;
}

export default function CommentForm({ novelId, onCommentAdded }: CommentFormProps) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [isSpoiler, setIsSpoiler] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error("Yorum yapmak için giriş yapmalısınız.");
            return;
        }

        if (!content.trim()) {
            toast.error("Yorum boş olamaz.");
            return;
        }

        setLoading(true);

        try {
            const token = await user.getIdToken();
            const result = await reviewService.addComment(token, novelId, content, isSpoiler);

            if (result.succeeded) {
                toast.success("Yorumunuz eklendi!");
                setContent("");
                setIsSpoiler(false);
                setIsOpen(false);
                onCommentAdded();
            } else {
                toast.error(result.message || "Bir hata oluştu.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Yorum eklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="mb-4 max-w-3xl">
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border/50">
                    Yorum yapmak için lütfen giriş yapın.
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8 transition-all duration-300">
            <div className="bg-white/10 dark:bg-zinc-800/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors text-sm font-medium text-foreground/90"
                >
                    <span>Yorum Yap</span>
                    {isOpen ? (
                        <ChevronUp size={16} className="text-muted-foreground" />
                    ) : (
                        <ChevronDown size={16} className="text-muted-foreground" />
                    )}
                </button>

                {isOpen && (
                    <div className="p-4 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                            <Textarea
                                rows={3}
                                placeholder="Düşüncelerini paylaş..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e as unknown as React.FormEvent);
                                    }
                                }}
                                disabled={loading}
                                className="resize-y bg-black/5 dark:bg-black/20 border-white/10 focus-visible:ring-purple-500/30 min-h-[80px] w-full break-words whitespace-pre-wrap"
                            />

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="comment-spoiler"
                                        checked={isSpoiler}
                                        onChange={(e) => setIsSpoiler(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-purple-500/30 bg-black/5"
                                    />
                                    <label htmlFor="comment-spoiler" className="text-xs text-muted-foreground cursor-pointer select-none">
                                        Spoiler İçeriyor
                                    </label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading || !content.trim()}
                                    className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                >
                                    {loading ? "Gönderiliyor..." : "Yorumu Gönder"}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
