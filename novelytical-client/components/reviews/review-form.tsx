"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { addReview, Ratings, getUserReviewForNovel, updateReview } from "@/services/review-service";
import { StarRating } from "./star-rating";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReviewFormProps {
    novelId: number;
    coverImage?: string;
    onReviewAdded: () => void;
}

export default function ReviewForm({ novelId, coverImage, onReviewAdded }: ReviewFormProps) {
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

    const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
    const [content, setContent] = useState("");
    const [isSpoiler, setIsSpoiler] = useState(false);

    const [initialRatings, setInitialRatings] = useState<Ratings | null>(null);
    const [initialContent, setInitialContent] = useState("");
    const [initialIsSpoiler, setInitialIsSpoiler] = useState(false);

    useEffect(() => {
        if (user) {
            checkExistingReview();
        }
    }, [user, novelId]);

    const checkExistingReview = async () => {
        if (!user) return;
        const review = await getUserReviewForNovel(novelId, user.uid);
        if (review) {
            setExistingReviewId(review.id);
            setRatings(review.ratings);
            setContent(review.content);
            setIsSpoiler(review.isSpoiler || false);
            setInitialRatings(review.ratings);
            setInitialContent(review.content);
            setInitialIsSpoiler(review.isSpoiler || false);
        }
    };

    const updateRating = (field: keyof Ratings, value: number) => {
        setRatings(prev => ({ ...prev, [field]: value }));
    };

    const hasChanges = () => {
        if (!existingReviewId) return true;
        if (!initialRatings) return true;

        const ratingsChanged = JSON.stringify(ratings) !== JSON.stringify(initialRatings);
        const contentChanged = content !== initialContent;
        const spoilerChanged = isSpoiler !== initialIsSpoiler;

        return ratingsChanged || contentChanged || spoilerChanged;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error("Değerlendirme yapmak için giriş yapmalısınız.");
            return;
        }

        if (!hasChanges() && existingReviewId) {
            toast.info("Herhangi bir değişiklik yapmadınız.");
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
            if (existingReviewId) {
                await updateReview(existingReviewId, {
                    ratings,
                    content,
                    isSpoiler,
                    // recalculate average if backend doesn't handle it, client side recalc:
                    averageRating: parseFloat((Object.values(ratings).reduce((a, b) => a + b, 0) / 5).toFixed(1))
                });
                toast.success("Değerlendirmeniz güncellendi!");
                // Update initial state after successful save
                setInitialRatings(ratings);
                setInitialContent(content);
                setInitialIsSpoiler(isSpoiler);
            } else {
                await addReview(novelId, user.uid, user.displayName || user.email || "Okur", user.photoURL || null, null, ratings, content, isSpoiler);
                toast.success("Değerlendirmeniz başarıyla eklendi!");
            }

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
                    <span>{existingReviewId ? "Değerlendirmeni Düzenle" : "Bir Değerlendirme Yaz"}</span>
                    {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>

                {isOpen && (
                    <div className="p-6 pt-2 border-white/10 dark:border-white/5 animate-in slide-in-from-top-2 fade-in duration-200">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-2xl mx-auto w-full py-4">
                                {/* Cover Image */}
                                {coverImage && (
                                    <div className="flex-shrink-0 mx-auto md:mx-0">
                                        <div className="w-[120px] aspect-[2/3] rounded-lg overflow-hidden shadow-md border border-white/10 relative group">
                                            <img
                                                src={coverImage}
                                                alt="Novel Cover"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
                                                <span className="text-[10px] font-medium text-white/90">Değerlendir</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Ratings Column */}
                                <div className="flex-1 space-y-4 w-full">
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
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-muted-foreground/80">Dilbilgisi & Yazım</span>
                                        <StarRating value={ratings.grammar} onChange={(v) => updateRating('grammar', v)} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground/80">Detaylı İncelemeniz</label>
                                <Textarea
                                    rows={4}
                                    placeholder="Bu roman hakkında ne düşünüyorsunuz? Güçlü ve zayıf yönleri neler?"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e as unknown as React.FormEvent);
                                        }
                                    }}
                                    className="resize-y bg-black/5 dark:bg-black/20 border-white/10 focus-visible:ring-purple-500/30 w-full break-words whitespace-pre-wrap placeholder:text-muted-foreground/50"
                                />
                            </div>

                            <div className="flex items-center gap-2 py-2">
                                <input
                                    type="checkbox"
                                    id="spoiler-checkbox"
                                    checked={isSpoiler}
                                    onChange={(e) => setIsSpoiler(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-purple-500/30"
                                />
                                <label htmlFor="spoiler-checkbox" className="text-sm text-muted-foreground cursor-pointer">
                                    Bu değerlendirme spoiler içeriyor
                                </label>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={loading || (existingReviewId ? !hasChanges() : false)}
                                    className="w-full sm:w-auto bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                >
                                    {loading ? "İşleniyor..." : (existingReviewId ? "Değerlendirmeyi Güncelle" : "Değerlendirmeyi Yayınla")}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
