"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { addReview, Ratings } from "@/services/review-service";
import { StarRating } from "./star-rating";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReviewFormProps {
    novelId: number;
    onReviewAdded: () => void;
}

export default function ReviewForm({ novelId, onReviewAdded }: ReviewFormProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const [ratings, setRatings] = useState<Ratings>({
        story: 0,
        characters: 0,
        world: 0,
        flow: 0,
        grammar: 0
    });

    const [content, setContent] = useState("");

    const updateRating = (field: keyof Ratings, value: number) => {
        setRatings(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error("Değerlendirme yapmak için giriş yapmalısınız.");
            return;
        }

        if (Object.values(ratings).some(r => r === 0)) {
            toast.error("Lütfen tüm kategorilere puan veriniz.");
            return;
        }

        if (content.length < 10) {
            toast.error("Lütfen en az 10 karakterlik bir yorum yazınız.");
            return;
        }

        setLoading(true);
        try {
            await addReview(novelId, user.uid, user.displayName || user.email || "Okur", ratings, content);
            toast.success("Değerlendirmeniz başarıyla eklendi!");

            setRatings({ story: 0, characters: 0, world: 0, flow: 0, grammar: 0 });
            setContent("");
            setIsOpen(false);
            onReviewAdded();
        } catch (error) {
            console.error(error);
            toast.error("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="mb-8">
                <div className="p-6 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border/50">
                    Değerlendirme yapmak için lütfen giriş yapın.
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
                    <span>Bir Değerlendirme Yaz</span>
                    {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>

                {isOpen && (
                    <div className="p-6 pt-2 border-t border-white/10 dark:border-white/5 animate-in slide-in-from-top-2 fade-in duration-200">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground/80">Kurgu</span>
                                    <StarRating value={ratings.story} onChange={(v) => updateRating('story', v)} />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground/80">Karakterler</span>
                                    <StarRating value={ratings.characters} onChange={(v) => updateRating('characters', v)} />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground/80">Dünya Tasarımı</span>
                                    <StarRating value={ratings.world} onChange={(v) => updateRating('world', v)} />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground/80">Akıcılık</span>
                                    <StarRating value={ratings.flow} onChange={(v) => updateRating('flow', v)} />
                                </div>
                                <div className="flex justify-between items-center md:col-span-2 md:w-1/2 md:pr-4">
                                    <span className="text-sm font-medium text-muted-foreground/80">Dilbilgisi & Yazım</span>
                                    <StarRating value={ratings.grammar} onChange={(v) => updateRating('grammar', v)} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground/80">Detaylı İncelemeniz</label>
                                <Textarea
                                    rows={4}
                                    placeholder="Bu roman hakkında ne düşünüyorsunuz? Güçlü ve zayıf yönleri neler?"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="resize-y bg-black/5 dark:bg-black/20 border-white/10 focus-visible:ring-purple-500/30 w-full break-words whitespace-pre-wrap placeholder:text-muted-foreground/50"
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                >
                                    {loading ? "Gönderiliyor..." : "Değerlendirmeyi Yayınla"}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
