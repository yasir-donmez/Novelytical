"use client";

import { Review, interactWithReview, deleteReview, getUserInteractionForReview } from "@/services/review-service";
import { StarRating } from "./star-rating";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { ThumbsUp, ThumbsDown, Info, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
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
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserHoverCard } from "@/components/ui/user-hover-card";
import { cn } from "@/lib/utils";

interface ReviewItemProps {
    review: Review;
    onDelete: (id: string) => void;
}

export default function ReviewItem({ review, onDelete }: ReviewItemProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSpoiler, setShowSpoiler] = useState(false);
    const [userVote, setUserVote] = useState<'like' | 'unlike' | null>(null);
    const [isVoting, setIsVoting] = useState(false);

    // Local state for optimistic updates
    const [likes, setLikes] = useState(Math.max(0, review.likes || 0));
    const [unlikes, setUnlikes] = useState(Math.max(0, review.unlikes || 0));

    // Sync with server changes
    useEffect(() => {
        setLikes(Math.max(0, review.likes || 0));
    }, [review.likes]);

    useEffect(() => {
        setUnlikes(Math.max(0, review.unlikes || 0));
    }, [review.unlikes]);

    useEffect(() => {
        if (user && review.id) {
            getUserInteractionForReview(review.id, user.uid).then(setUserVote);
        }
    }, [user, review.id]);

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
        if (isVoting) return; // Prevent rapid clicks
        setIsVoting(true);

        const previousVote = userVote;
        const previousLikes = likes;
        const previousUnlikes = unlikes;

        if (userVote === action) {
            setUserVote(null);
            if (action === 'like') setLikes(l => Math.max(0, l - 1));
            else setUnlikes(u => Math.max(0, u - 1));
        } else {
            setUserVote(action);
            if (action === 'like') {
                setLikes(l => l + 1);
                if (userVote === 'unlike') setUnlikes(u => Math.max(0, u - 1));
            } else {
                setUnlikes(u => u + 1);
                if (userVote === 'like') setLikes(l => Math.max(0, l - 1));
            }
        }

        try {
            await interactWithReview(
                review.id,
                user.uid,
                action,
                user.displayName || 'İsimsiz Kullanıcı',
                user.photoURL || undefined,
                undefined, // senderFrame
                review.userId,
                review.novelId
            );
        } catch (error) {
            setUserVote(previousVote);
            setLikes(previousLikes);
            setUnlikes(previousUnlikes);
            console.error(error);
        } finally {
            setIsVoting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Bu değerlendirmeyi silmek istediğinize emin misiniz?")) return;

        try {
            await deleteReview(review.id);
            toast.success("Değerlendirme silindi.");
            onDelete(review.id);
        } catch (error) {
            toast.error("Silinirken hata oluştu.");
        }
    };

    return (
        <div className="bg-white/10 dark:bg-zinc-800/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <UserHoverCard
                        userId={review.userId}
                        username={review.userName}
                        image={review.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${review.userName}`}
                        frame={review.userFrame}
                        className="h-9 w-9 flex-shrink-0 shadow-sm"
                    >
                        <UserAvatar
                            src={review.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${review.userName}`}
                            alt={review.userName}
                            frameId={review.userFrame}
                            className="h-9 w-9 transition-transform hover:scale-105"
                            fallbackClass="bg-gradient-to-tr from-purple-500 to-indigo-500 text-white text-xs font-bold"
                        />
                    </UserHoverCard>
                    <div>
                        <div className="flex items-center gap-2">
                            <UserHoverCard
                                userId={review.userId}
                                username={review.userName}
                                image={review.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${review.userName}`}
                                frame={review.userFrame}
                            >
                                <span className="font-semibold text-sm text-foreground/95 hover:underline decoration-primary transition-all cursor-pointer">{review.userName}</span>
                            </UserHoverCard>
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
                                    <TooltipContent className="bg-zinc-950 border-white/10 text-zinc-100">
                                        <div className="space-y-1 text-xs min-w-[140px]">
                                            <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                                                <span className="text-zinc-400">Kriterler</span>
                                                <span className="font-semibold text-zinc-100">Puan</span>
                                            </div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Kurgu:</span> <b className="text-purple-400 ml-2">{review.ratings.story}</b></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Karakterler:</span> <b className="text-purple-400 ml-2">{review.ratings.characters}</b></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Dünya:</span> <b className="text-purple-400 ml-2">{review.ratings.world}</b></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Akıcılık:</span> <b className="text-purple-400 ml-2">{review.ratings.flow}</b></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Dilbilgisi:</span> <b className="text-purple-400 ml-2">{review.ratings.grammar}</b></div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>
                {user?.uid === review.userId && (
                    <button
                        onClick={handleDelete}
                        className="text-muted-foreground hover:text-red-400 p-1 flex items-center gap-1.5 transition-colors group"
                        title="Değerlendirmeyi Sil"
                    >
                        <Trash2 size={13} className="text-muted-foreground/70 group-hover:text-red-400" />
                        <span className="text-xs font-medium text-muted-foreground/70 group-hover:text-red-400">Sil</span>
                    </button>
                )}
            </div>

            {review.isSpoiler && (
                <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/20 font-medium">⚠️ Spoiler İçeriyor</span>
                    {!showSpoiler && (
                        <button
                            onClick={() => setShowSpoiler(true)}
                            className="text-purple-400/80 hover:text-purple-400 font-medium transition-colors"
                        >
                            Göster
                        </button>
                    )}
                </div>
            )}

            <p className={cn(
                "text-sm leading-relaxed whitespace-pre-wrap break-words mb-4 pl-1 text-foreground/90",
                review.isSpoiler && !showSpoiler && "blur-sm select-none"
            )}>
                {displayContent}
            </p>

            {isLongReview && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[11px] font-medium text-purple-400/80 hover:text-purple-400 transition-colors mb-3"
                >
                    {isExpanded ? "Daha az göster" : "Devamını gör"}
                </button>
            )}

            <div className="flex items-center gap-4 mt-1">
                <button
                    onClick={() => handleInteraction('like')}
                    className={cn(
                        "text-xs font-medium flex items-center gap-1.5 transition-colors",
                        userVote === 'like' ? "text-green-400" : "text-muted-foreground hover:text-green-400"
                    )}
                >
                    <ThumbsUp size={14} className={cn(userVote === 'like' && "fill-green-400/20 text-green-400")} />
                    <span className="tabular-nums min-w-[14px] text-center">{likes}</span>
                </button>

                <button
                    onClick={() => handleInteraction('unlike')}
                    className={cn(
                        "text-xs font-medium flex items-center gap-1.5 transition-colors",
                        userVote === 'unlike' ? "text-red-400" : "text-muted-foreground hover:text-red-400"
                    )}
                >
                    <ThumbsDown size={14} className={cn(userVote === 'unlike' && "fill-red-400/20 text-red-400")} />
                    <span className="tabular-nums min-w-[14px] text-center">{unlikes}</span>
                </button>
            </div>
        </div>
    );
}
