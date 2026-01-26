"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { reviewService } from "@/services/reviewService";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

interface ReviewModalProps {
    novelId: number;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function ReviewModal({ novelId, trigger, onSuccess }: ReviewModalProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Ratings
    const [ratings, setRatings] = useState({
        overall: 0,
        story: 0,
        characters: 0,
        world: 0,
        flow: 0,
        grammar: 0
    });

    const [content, setContent] = useState("");

    const handleRate = (category: keyof typeof ratings, value: number) => {
        setRatings(prev => ({ ...prev, [category]: value }));
    };

    const handleSubmit = async () => {
        if (!user) {
            toast.error("Giriş yapmalısınız.");
            return;
        }
        if (ratings.overall === 0) {
            toast.error("Lütfen en azından Genel Puan verin.");
            return;
        }

        setSubmitting(true);
        try {
            const token = await user.getIdToken();
            const result = await reviewService.addReview(token, novelId, {
                content,
                ratingOverall: ratings.overall,
                ratingStory: ratings.story,
                ratingCharacters: ratings.characters,
                ratingWorld: ratings.world,
                ratingFlow: ratings.flow,
                ratingGrammar: ratings.grammar
            });

            if (result.succeeded) {
                toast.success("İncelemeniz kaydedildi!");
                setOpen(false);
                onSuccess?.();
            } else {
                toast.error(result.message || "Hata oluştu.");
            }
        } catch (error) {
            toast.error("Bağlantı hatası.");
        } finally {
            setSubmitting(false);
        }
    };

    const StarRating = ({ category, label }: { category: keyof typeof ratings, label: string }) => (
        <div className="flex items-center justify-between py-1">
            <Label className="text-gray-300 w-32">{label}</Label>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => handleRate(category, star)}
                        className={`p-1 transition-colors ${ratings[category] >= star
                                ? "text-amber-500 hover:text-amber-400"
                                : "text-gray-600 hover:text-gray-500"
                            }`}
                        type="button"
                    >
                        <Star className={`w-5 h-5 ${ratings[category] >= star ? "fill-current" : ""}`} />
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">İnceleme Yaz</Button>}
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-center border-b border-white/10 pb-4">
                        Romanı Değerlendir
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-2">
                    {/* Main Rating */}
                    <div className="bg-white/5 p-4 rounded-xl flex flex-col items-center gap-2">
                        <Label className="text-lg font-semibold text-amber-500">Genel Puan</Label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                (
                                    <button
                                        key={star}
                                        onClick={() => handleRate('overall', star)}
                                        className={`p-1 transition-transform hover:scale-110 ${ratings.overall >= star
                                                ? "text-amber-500"
                                                : "text-gray-700"
                                            }`}
                                    >
                                        <Star className={`w-8 h-8 ${ratings.overall >= star ? "fill-current" : ""}`} />
                                    </button>
                                )
                            ))}
                        </div>
                    </div>

                    {/* Detailed Ratings */}
                    <div className="grid grid-cols-1 gap-1 px-2">
                        <StarRating category="story" label="Hikaye" />
                        <StarRating category="characters" label="Karakterler" />
                        <StarRating category="world" label="Dünya İnşası" />
                        <StarRating category="flow" label="Akıcılık" />
                        <StarRating category="grammar" label="Çeviri Kalitesi" />
                    </div>

                    {/* Review Content */}
                    <div className="space-y-2">
                        <Label>İncelemeniz (Opsiyonel)</Label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Bu roman neden iyi veya kötü? Detayları paylaş..."
                            className="bg-black/30 border-white/10 min-h-[100px]"
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        İncelemeyi Gönder
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
