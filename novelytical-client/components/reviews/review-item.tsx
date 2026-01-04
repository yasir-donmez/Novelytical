"use client";

import { Review, interactWithReview } from "@/services/review-service";
import { StarRating } from "./star-rating";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { ThumbsUp, ThumbsDown, Info } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ReviewItemProps {
    review: Review;
}

export default function ReviewItem({ review }: ReviewItemProps) {
    const { user } = useAuth();
    const [likes, setLikes] = useState(review.likes || 0);
    const [unlikes, setUnlikes] = useState(review.unlikes || 0);
    const [isExpanded, setIsExpanded] = useState(false);

    const MAX_REVIEW_LENGTH = 400;
    const isLongReview = review.content.length > MAX_REVIEW_LENGTH;
    const displayContent = isExpanded || !isLongReview
        ? review.content
        : review.content.substring(0, MAX_REVIEW_LENGTH) + "...";

    const handleInteraction = async (action: 'like' | 'unlike') => {
        if (!user) {
            toast.error("Etkileşim için giriş yapmalısınız.");
            return;
        }
        try {
            const result = await interactWithReview(review.id, user.uid, action);
            if (result === 'added') {
                action === 'like' ? setLikes(l => l + 1) : setUnlikes(u => u + 1);
            } else if (result === 'removed') {
                action === 'like' ? setLikes(l => l - 1) : setUnlikes(u => u - 1);
            } else if (result === 'changed') {
                if (action === 'like') {
                    setLikes(l => l + 1);
                    setUnlikes(u => u - 1);
                } else {
                    setLikes(l => l - 1);
                    setUnlikes(u => u + 1);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-white/10 dark:bg-zinc-800/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-white/20 dark:ring-white/10 shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${review.userName}`} />
                        <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold text-xs">
                            {review.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground/95">{review.userName}</span>
                            <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wide">
                                {review.createdAt ? formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true, locale: tr }) : "Bilinmiyor"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <StarRating value={Math.round(review.averageRating)} readOnly size={13} />
                            <span className="text-xs font-bold text-foreground/90">{review.averageRating}</span>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info size={13} className="text-muted-foreground/70 hover:text-purple-400 cursor-help transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black/90 border-white/10">
                                        <div className="space-y-1 text-xs min-w-[140px]">
                                            <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                                                <span className="text-muted-foreground">Kriterler</span>
                                                <span className="font-semibold">Puan</span>
                                            </div>
                                            <div className="flex justify-between"><span>Kurgu:</span> <b className="text-purple-400">{review.ratings.story}</b></div>
                                            <div className="flex justify-between"><span>Karakter:</span> <b className="text-purple-400">{review.ratings.characters}</b></div>
                                            <div className="flex justify-between"><span>Dünya:</span> <b className="text-purple-400">{review.ratings.world}</b></div>
                                            <div className="flex justify-between"><span>Akıcılık:</span> <b className="text-purple-400">{review.ratings.flow}</b></div>
                                            <div className="flex justify-between"><span>Dilbilgisi:</span> <b className="text-purple-400">{review.ratings.grammar}</b></div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>
            </div>

            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-4 pl-1 text-foreground/90">
                {displayContent}
            </p>

            {/* Read More/Less Button */}
            {isLongReview && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[11px] font-medium text-purple-400/80 hover:text-purple-400 transition-colors mb-3"
                >
                    {isExpanded ? "Daha az göster" : "Devamını gör"}
                </button>
            )}

            <div className="flex items-center gap-3 pt-3 border-t border-white/10 dark:border-white/5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInteraction('like')}
                    className="h-7 px-3 gap-1.5 text-muted-foreground hover:bg-green-500/10 hover:text-green-500 transition-colors rounded-full"
                >
                    <ThumbsUp size={14} />
                    <span className="text-xs font-medium">Faydalı ({likes})</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInteraction('unlike')}
                    className="h-7 px-3 gap-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors rounded-full"
                >
                    <ThumbsDown size={14} />
                    <span className="text-xs font-medium">Katılmıyorum ({unlikes})</span>
                </Button>
            </div>
        </div>
    );
}
