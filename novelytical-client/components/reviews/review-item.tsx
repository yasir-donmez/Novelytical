import { Review, reviewService } from "@/services/review-service";
import { StarRating } from "./star-rating";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Info, Trash2, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

interface ReviewItemProps {
    review: Review;
    onDelete: (id: string) => void;
}

export default function ReviewItem({ review, onDelete }: ReviewItemProps) {
    const { user } = useAuth();
    // Use firebaseUid for accurate ownership check
    const isOwner = user?.uid === review.firebaseUid;

    const [isExpanded, setIsExpanded] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);

    // Reaction State
    const [likes, setLikes] = useState(review.likeCount || 0);
    const [dislikes, setDislikes] = useState(review.dislikeCount || 0);
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(
        review.userReaction === 1 ? 'like' : review.userReaction === -1 ? 'dislike' : null
    );
    const [isVoting, setIsVoting] = useState(false);

    useEffect(() => {
        setLikes(review.likeCount || 0);
        setDislikes(review.dislikeCount || 0);
        setUserReaction(review.userReaction === 1 ? 'like' : review.userReaction === -1 ? 'dislike' : null);
    }, [review]);

    // Use nested ratings object from Review interface
    const ratings = review.ratings;

    const MAX_REVIEW_LENGTH = 400;
    const isLongReview = review.content.length > MAX_REVIEW_LENGTH;
    const isBlurry = review.isSpoiler && !isRevealed;

    const displayContent = isExpanded || !isLongReview
        ? review.content
        : review.content.substring(0, MAX_REVIEW_LENGTH) + "...";

    const handleDelete = async () => {
        onDelete(review.id.toString());
    };

    const avatarSrc = review.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${review.userName}`;
    const displayName = review.userName || "Anonim";

    const handleReaction = async (type: 'like' | 'dislike') => {
        if (!user) {
            toast.error("Giriş yapmalısınız!");
            return;
        }
        if (isVoting) return;
        setIsVoting(true);

        const previousState = { likes, dislikes, userReaction };

        let newReaction: 'like' | 'dislike' | null = type;
        if (userReaction === type) {
            newReaction = null;
            if (type === 'like') setLikes(l => Math.max(0, l - 1));
            else setDislikes(d => Math.max(0, d - 1));
        } else {
            if (userReaction === 'like') setLikes(l => Math.max(0, l - 1));
            else if (userReaction === 'dislike') setDislikes(d => Math.max(0, d - 1));

            if (type === 'like') setLikes(l => l + 1);
            else setDislikes(d => d + 1);
        }
        setUserReaction(newReaction);

        try {
            const token = await user.getIdToken();
            const typeToSend = type === 'like' ? 1 : -1;
            await reviewService.toggleReviewReaction(token, parseInt(review.id), typeToSend);
        } catch (error) {
            setLikes(previousState.likes);
            setDislikes(previousState.dislikes);
            setUserReaction(previousState.userReaction);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="bg-white/10 dark:bg-zinc-800/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 flex-shrink-0 shadow-sm">
                        <UserAvatar
                            src={avatarSrc}
                            alt={displayName}
                            className="h-9 w-9 transition-transform hover:scale-105"
                            fallbackClass="bg-gradient-to-tr from-purple-500 to-indigo-500 text-white text-xs font-bold"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground/95 hover:underline decoration-primary transition-all cursor-pointer">{displayName}</span>
                            <span className="text-[10px] text-muted-foreground/80 uppercase tracking-wide">
                                {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: tr }) : "Bilinmiyor"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <StarRating value={Math.round(review.averageRating)} readOnly size={13} />
                            <span className="text-xs font-bold text-foreground/90">{review.averageRating.toFixed(1)}</span>

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
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Kurgu:</span> <b className="text-purple-400 ml-2">{ratings.story}</b></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Karakterler:</span> <b className="text-purple-400 ml-2">{ratings.characters}</b></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Dünya:</span> <b className="text-purple-400 ml-2">{ratings.world}</b></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Akıcılık:</span> <b className="text-purple-400 ml-2">{ratings.flow}</b></div>
                                            <div className="flex justify-between items-center"><span className="text-zinc-300">Dilbilgisi:</span> <b className="text-purple-400 ml-2">{ratings.grammar}</b></div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>
                {isOwner && (
                    <button
                        onClick={handleDelete}
                        className="text-[11px] font-medium text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                        <Trash2 size={13} />
                        Sil
                    </button>
                )}
            </div>

            {review.isSpoiler && (
                <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/20 font-medium flex items-center gap-1">
                        <AlertTriangle size={12} /> Spoiler İçeriyor
                    </span>
                    {!isRevealed && (
                        <button
                            onClick={() => setIsRevealed(true)}
                            className="text-purple-400/80 hover:text-purple-400 font-medium transition-colors"
                        >
                            Göster
                        </button>
                    )}
                </div>
            )}

            <p className={cn(
                "text-sm leading-relaxed whitespace-pre-wrap break-words mb-4 pl-1 text-foreground/90 transition-all",
                isBlurry && "blur-md select-none opacity-50"
            )}>
                {displayContent}
            </p>

            {isLongReview && !isBlurry && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[11px] font-medium text-purple-400/80 hover:text-purple-400 transition-colors mb-3"
                >
                    {isExpanded ? "Daha az göster" : "Devamını gör"}
                </button>
            )}

            <div className="flex items-center gap-4 mt-1">
                <button
                    onClick={() => handleReaction('like')}
                    className={cn(
                        "flex items-center gap-1.5 text-xs font-medium transition-colors",
                        userReaction === 'like' ? "text-green-400" : "text-muted-foreground hover:text-green-400"
                    )}
                >
                    <ThumbsUp size={14} className={cn(userReaction === 'like' && "fill-green-400/20 text-green-400")} />
                    <span className="tabular-nums min-w-[14px] text-center">{likes}</span>
                </button>

                <button
                    onClick={() => handleReaction('dislike')}
                    className={cn(
                        "flex items-center gap-1.5 text-xs font-medium transition-colors",
                        userReaction === 'dislike' ? "text-red-400" : "text-muted-foreground hover:text-red-400"
                    )}
                >
                    <ThumbsDown size={14} className={cn(userReaction === 'dislike' && "fill-red-400/20 text-red-400")} />
                    <span className="tabular-nums min-w-[14px] text-center">{dislikes}</span>
                </button>
            </div>
        </div>
    );
}
