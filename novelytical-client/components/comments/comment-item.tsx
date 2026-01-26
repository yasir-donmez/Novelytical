import { CommentDto, reviewService } from "@/services/review-service";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/contexts/auth-context";
import { Trash2, ThumbsUp, ThumbsDown, AlertTriangle, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface CommentItemProps {
    comment: CommentDto;
    novelId: number;
    onDelete: (id: string) => void;
    onReplyAdded?: () => void;
}

// Helper to format name (strip email domain)
const formatDisplayName = (name: string) => {
    if (name && name.includes('@')) {
        return name.split('@')[0];
    }
    return name || "Anonim";
};

export default function CommentItem({ comment, novelId, onDelete, onReplyAdded }: CommentItemProps) {
    const { user } = useAuth();
    // Use firebaseUid for accurate ownership check
    const isOwner = user?.uid === comment.firebaseUid;

    const [isExpanded, setIsExpanded] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);

    // Reply State
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    const handleReplySubmit = async () => {
        if (!user) {
            toast.error("Giriş yapmalısınız.");
            return;
        }
        setIsSubmittingReply(true);
        try {
            const token = await user.getIdToken();
            const result = await reviewService.addComment(
                token,
                novelId,
                replyContent,
                false, // IsSpoiler
                comment.id // ParentId: We are replying to THIS comment.
            );

            if (result.succeeded) {
                toast.success("Yanıt eklendi!");
                setIsReplying(false);
                setReplyContent("");
                onReplyAdded?.();
            } else {
                toast.error(result.message || "Bir hata oluştu.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Bir hata oluştu.");
        } finally {
            setIsSubmittingReply(false);
        }
    };

    // ... rest of state
    const [likes, setLikes] = useState(comment.likeCount || 0);
    const [dislikes, setDislikes] = useState(comment.dislikeCount || 0);
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(
        comment.userReaction === 1 ? 'like' : comment.userReaction === -1 ? 'dislike' : null
    );
    const [isVoting, setIsVoting] = useState(false);

    useEffect(() => {
        setLikes(comment.likeCount || 0);
        setDislikes(comment.dislikeCount || 0);
        setUserReaction(comment.userReaction === 1 ? 'like' : comment.userReaction === -1 ? 'dislike' : null);
    }, [comment]);

    // Avatar Logic
    const avatarSrc = (comment.userAvatarUrl)
        ? comment.userAvatarUrl
        : "/images/profile-placeholder.svg";

    const MAX_COMMENT_LENGTH = 300;
    const isLongComment = comment.content.length > MAX_COMMENT_LENGTH;
    const isBlurry = comment.isSpoiler && !isRevealed;

    // If blurry, we might want to hide text completely or show a generic message initially
    const displayContent = isExpanded || !isLongComment
        ? comment.content
        : comment.content.substring(0, MAX_COMMENT_LENGTH) + "...";

    const formattedDate = comment.createdAt
        ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: tr })
        : "Bilinmiyor";

    const displayName = formatDisplayName(comment.userDisplayName);

    const handleReaction = async (type: 'like' | 'dislike') => {
        if (!user) {
            toast.error("Giriş yapmalısınız!");
            return;
        }
        if (isVoting) return;
        setIsVoting(true);

        const previousState = { likes, dislikes, userReaction };

        // Optimistic Update
        let newReaction: 'like' | 'dislike' | null = type;

        if (userReaction === type) {
            // Toggle off
            newReaction = null;
            if (type === 'like') setLikes(l => Math.max(0, l - 1));
            else setDislikes(d => Math.max(0, d - 1));
        } else {
            // Switch or Add
            if (userReaction === 'like') setLikes(l => Math.max(0, l - 1));
            else if (userReaction === 'dislike') setDislikes(d => Math.max(0, d - 1));

            if (type === 'like') setLikes(l => l + 1);
            else setDislikes(d => d + 1);
        }
        setUserReaction(newReaction);

        try {
            const token = await user.getIdToken();
            const reactionValue = newReaction === 'like' ? 1 : newReaction === 'dislike' ? -1 : 0; // 0 for remove?
            // API expects 1 or -1. If toggle off (0), we just send the SAME type again?
            // Backend logic: "if existing.ReactionType == reactionType -> Remove".
            // So if I was Like and I click Like, I send 1. Backend removes it.
            // If I was Like and I click Dislike, I send -1. Backend switches.
            // So I should always send the clicked type (1 or -1).

            const typeToSend = type === 'like' ? 1 : -1;
            await reviewService.toggleCommentReaction(token, comment.id, typeToSend);
        } catch (error) {
            // Revert
            setLikes(previousState.likes);
            setDislikes(previousState.dislikes);
            setUserReaction(previousState.userReaction);
            console.error(error);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="group">
            {/* Main Comment Card */}
            <div className={cn(
                "rounded-xl p-3 transition-colors shadow-sm border bg-white/10 dark:bg-zinc-800/40 backdrop-blur-md border-white/20 dark:border-white/10"
            )}>
                <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="h-8 w-8 flex-shrink-0 shadow-sm">
                        <UserAvatar
                            src={avatarSrc}
                            alt={displayName}
                            className="h-8 w-8 transition-transform hover:scale-105"
                            fallbackClass="bg-gradient-to-tr from-purple-500 to-indigo-500 text-white text-[10px] font-bold"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-semibold text-sm text-foreground/95 hover:underline decoration-primary transition-all cursor-pointer">
                                {displayName}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80">•</span>
                            <span className="text-[10px] text-muted-foreground/80 uppercase font-medium tracking-wide">
                                {formattedDate}
                            </span>
                        </div>

                        {comment.isSpoiler && (
                            <div className="mb-2 flex items-center gap-1.5">
                                <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                                    <AlertTriangle size={10} /> SPOILER
                                </span>
                                {!isRevealed && (
                                    <button
                                        onClick={() => setIsRevealed(true)}
                                        className="text-[10px] font-medium text-purple-400 hover:text-purple-300 underline"
                                    >
                                        Göster
                                    </button>
                                )}
                            </div>
                        )}

                        <p className={cn(
                            "text-sm leading-relaxed whitespace-pre-wrap break-words mb-2 transition-all duration-300",
                            isBlurry && "blur-md select-none opacity-50",
                            comment.isDeleted ? "text-muted-foreground italic" : "text-foreground/90"
                        )}>
                            {displayContent}
                        </p>

                        {!comment.isDeleted && (
                            <>
                                {/* Read More/Less Button */}
                                {isLongComment && !isBlurry && (
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="text-[11px] font-medium text-purple-400/80 hover:text-purple-400 transition-colors mb-2"
                                    >
                                        {isExpanded ? "Daha az göster" : "Devamını gör"}
                                    </button>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleReaction('like')}
                                        className={cn(
                                            "flex items-center gap-1 text-[11px] font-medium transition-colors",
                                            userReaction === 'like' ? "text-green-500" : "text-muted-foreground hover:text-green-500"
                                        )}
                                    >
                                        <ThumbsUp size={13} className={cn(userReaction === 'like' && "fill-current")} />
                                        <span>{likes}</span>
                                    </button>

                                    <button
                                        onClick={() => handleReaction('dislike')}
                                        className={cn(
                                            "flex items-center gap-1 text-[11px] font-medium transition-colors",
                                            userReaction === 'dislike' ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                                        )}
                                    >
                                        <ThumbsDown size={13} className={cn(userReaction === 'dislike' && "fill-current")} />
                                        <span>{dislikes}</span>
                                    </button>

                                    <button
                                        onClick={() => setIsReplying(!isReplying)}
                                        className="text-[11px] font-medium text-muted-foreground hover:text-purple-400 transition-colors flex items-center gap-1"
                                    >
                                        <MessageSquare size={13} />
                                        Yanıtla
                                    </button>

                                    {isOwner && (
                                        <button
                                            onClick={() => onDelete(comment.id.toString())}
                                            className="ml-auto text-[11px] font-medium text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                                        >
                                            <Trash2 size={13} />
                                            Sil
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Reply Form */}
                        {isReplying && (
                            <div className="mt-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <Textarea
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            placeholder="Yanıtınız..."
                                            className="min-h-[60px] text-sm bg-black/20 border-white/10 resize-none mb-2"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsReplying(false)}>
                                                İptal
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                                                onClick={handleReplySubmit}
                                                disabled={!replyContent.trim() || isSubmittingReply}
                                            >
                                                {isSubmittingReply ? "..." : "Yanıtla"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-6 md:ml-12 mt-3 space-y-3 relative">
                    {/* Visual guide line */}
                    <div className="absolute left-[-15px] top-0 bottom-4 w-[2px] bg-white/10 dark:bg-white/5 rounded-full"></div>

                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            novelId={novelId}
                            onDelete={onDelete}
                            onReplyAdded={onReplyAdded}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
