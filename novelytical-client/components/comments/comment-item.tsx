"use client";

import { Comment, addComment, toggleCommentVote, getUserVoteForComment } from "@/services/comment-service";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/contexts/auth-context";
import { Trash2, MessageCircle, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserHoverCard } from "@/components/ui/user-hover-card";
import { cn } from "@/lib/utils";

interface CommentItemProps {
    comment: Comment;
    onDelete: (id: string) => void;
    allComments: Comment[];
    onReplyAdded: () => void;
    depth?: number; // Track nesting depth
}

const MAX_VISIBLE_REPLIES = 2;

// Helper to format name (strip email domain)
const formatDisplayName = (name: string, email?: string) => {
    if (name.includes('@')) {
        return name.split('@')[0];
    }
    return name;
};

export default function CommentItem({ comment, onDelete, allComments, onReplyAdded, depth = 0 }: CommentItemProps) {
    const { user } = useAuth();
    const isOwner = user?.uid === comment.userId;
    const canDelete = isOwner;

    // Avatar Logic:
    // 1. If it's the current user, prefer their live photoURL (so they see their new pic instantly).
    // 2. If not, try the stored userImage from the comment doc.
    // 3. Fallback to DiceBear initials.
    const avatarSrc = (isOwner && user?.photoURL)
        ? user.photoURL
        : (comment.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.userName}`);
    const isDeleted = comment.userId === "deleted"; // Check if it's a ghost comment
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [showAllReplies, setShowAllReplies] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSpoiler, setShowSpoiler] = useState(false);
    const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);

    // Local state for optimistic updates
    const [likes, setLikes] = useState(Math.max(0, comment.likeCount || 0));
    const [dislikes, setDislikes] = useState(Math.max(0, comment.dislikeCount || 0));

    // Sync with server changes
    useEffect(() => {
        setLikes(Math.max(0, comment.likeCount || 0));
    }, [comment.likeCount]);

    useEffect(() => {
        setDislikes(Math.max(0, comment.dislikeCount || 0));
    }, [comment.dislikeCount]);

    useEffect(() => {
        if (user && comment.id) {
            getUserVoteForComment(comment.id, user.uid).then(setUserVote);
        }
    }, [user, comment.id]);

    const handleVote = async (action: 'like' | 'dislike') => {
        if (!user) {
            toast.error("Oy vermek için giriş yapmalısınız.");
            return;
        }

        const previousVote = userVote;
        const previousLikes = likes;
        const previousDislikes = dislikes;

        // Optimistic Update
        if (userVote === action) {
            // Toggle off
            setUserVote(null);
            if (action === 'like') setLikes(prev => Math.max(0, prev - 1));
            else setDislikes(prev => Math.max(0, prev - 1));
        } else {
            // Change vote or New vote
            setUserVote(action);
            if (action === 'like') {
                setLikes(prev => prev + 1);
                if (userVote === 'dislike') setDislikes(prev => Math.max(0, prev - 1));
            } else {
                setDislikes(prev => prev + 1);
                if (userVote === 'like') setLikes(prev => Math.max(0, prev - 1));
            }
        }

        try {
            await toggleCommentVote(
                comment.id,
                user.uid,
                action,
                comment.novelId,
                user.displayName || formatDisplayName(user.email || "Okur"),
                user.photoURL || undefined,
                undefined // senderFrame (will be fetched by service)
            );
        } catch (error) {
            // Revert on error
            setUserVote(previousVote);
            setLikes(previousLikes);
            setDislikes(previousDislikes);
            toast.error("İşlem başarısız oldu.");
        }
    };

    const MAX_COMMENT_LENGTH = 300;
    const isLongComment = comment.content.length > MAX_COMMENT_LENGTH;
    const displayContent = isExpanded || !isLongComment
        ? comment.content
        : comment.content.substring(0, MAX_COMMENT_LENGTH) + "...";

    const replies = useMemo(() =>
        allComments.filter(c => c.parentId === comment.id),
        [allComments, comment.id]
    );

    const formattedDate = comment.createdAt
        ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: tr })
        : "Bilinmiyor";

    const displayName = formatDisplayName(comment.userName);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !replyContent.trim()) return;

        setLoading(true);

        // Close form immediately for smooth UX
        setIsReplying(false);

        try {
            await addComment(
                comment.novelId,
                user.uid,
                user.displayName || formatDisplayName(user.email || "Okur"),
                user.photoURL, // Add user image
                undefined, // userFrame (will be fetched by service)
                replyContent,
                comment.id
            );
            toast.success("Yanıtınız eklendi!");
            setReplyContent("");
            onReplyAdded();
        } catch (error) {
            toast.error("Yanıt eklenirken hata oluştu.");
            // Reopen form on error
            setIsReplying(true);
        } finally {
            setLoading(false);
        }
    };

    const visibleReplies = showAllReplies ? replies : replies.slice(0, MAX_VISIBLE_REPLIES);
    const hiddenRepliesCount = replies.length - MAX_VISIBLE_REPLIES;

    return (
        <div className="group">
            {/* Main Comment Card */}
            <div className={cn(
                "rounded-xl p-3 transition-colors shadow-sm border",
                isDeleted
                    ? "bg-muted/10 border-dashed border-muted/30"
                    : "bg-white/10 dark:bg-zinc-800/40 backdrop-blur-md border border-white/20 dark:border-white/10"
            )}>
                <div className="flex gap-3">
                    {/* Avatar */}
                    {isDeleted ? (
                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted/20 flex items-center justify-center">
                            <Trash2 size={14} className="text-muted-foreground/50" />
                        </div>
                    ) : (
                        <UserHoverCard
                            userId={comment.userId}
                            username={comment.userName}
                            image={avatarSrc}
                            frame={comment.userFrame}
                            className="h-8 w-8 flex-shrink-0 shadow-sm"
                        >
                            <UserAvatar
                                src={avatarSrc}
                                alt={displayName}
                                frameId={comment.userFrame}
                                className="h-8 w-8 transition-transform hover:scale-105"
                                fallbackClass="bg-gradient-to-tr from-purple-500 to-indigo-500 text-white text-[10px] font-bold"
                            />
                        </UserHoverCard>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            {isDeleted ? (
                                <span className="font-semibold text-sm text-muted-foreground italic">
                                    {displayName}
                                </span>
                            ) : (
                                <UserHoverCard
                                    userId={comment.userId}
                                    username={comment.userName}
                                    image={avatarSrc}
                                    frame={comment.userFrame}
                                >
                                    <span className="font-semibold text-sm text-foreground/95 hover:underline decoration-primary transition-all cursor-pointer">
                                        {displayName}
                                    </span>
                                </UserHoverCard>
                            )}
                            {!isDeleted && (
                                <>
                                    <span className="text-[10px] text-muted-foreground/80">•</span>
                                    <span className="text-[10px] text-muted-foreground/80 uppercase font-medium tracking-wide">
                                        {formattedDate}
                                    </span>
                                </>
                            )}
                        </div>

                        {comment.isSpoiler && (
                            <div className="mb-2 flex items-center gap-2 text-xs">
                                <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/20 font-medium text-[10px]">⚠️ Spoiler</span>
                                {!showSpoiler && (
                                    <button
                                        onClick={() => setShowSpoiler(true)}
                                        className="text-purple-400/80 hover:text-purple-400 font-medium transition-colors text-[10px]"
                                    >
                                        Göster
                                    </button>
                                )}
                            </div>
                        )}

                        <p className={cn(
                            "text-sm leading-relaxed whitespace-pre-wrap break-words mb-2",
                            isDeleted ? "text-muted-foreground/50 italic" : "text-foreground/90",
                            comment.isSpoiler && !showSpoiler && "blur-sm select-none"
                        )}>
                            {displayContent}
                        </p>

                        {/* Read More/Less Button */}
                        {isLongComment && !isDeleted && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-[11px] font-medium text-purple-400/80 hover:text-purple-400 transition-colors mb-2"
                            >
                                {isExpanded ? "Daha az göster" : "Devamını gör"}
                            </button>
                        )}

                        {/* Actions */}
                        {!isDeleted && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 mr-2">
                                    <button
                                        onClick={() => handleVote('like')}
                                        className={cn(
                                            "text-[10px] font-medium flex items-center gap-1 transition-colors",
                                            userVote === 'like' ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <ThumbsUp size={12} className={cn(userVote === 'like' && "fill-current")} />
                                        <span className="tabular-nums min-w-[14px] text-center">{likes}</span>
                                    </button>
                                    <button
                                        onClick={() => handleVote('dislike')}
                                        className={cn(
                                            "text-[10px] font-medium flex items-center gap-1 transition-colors",
                                            userVote === 'dislike' ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <ThumbsDown size={12} className={cn(userVote === 'dislike' && "fill-current")} />
                                        <span className="tabular-nums min-w-[14px] text-center">{dislikes}</span>
                                    </button>
                                </div>

                                {user && (
                                    <button
                                        onClick={() => setIsReplying(!isReplying)}
                                        className="text-[11px] font-medium text-muted-foreground hover:text-purple-400 transition-colors flex items-center gap-1"
                                    >
                                        <MessageCircle size={13} />
                                        Yanıtla
                                    </button>
                                )}

                                {isOwner && (
                                    <button
                                        onClick={() => onDelete(comment.id)}
                                        className="text-[11px] font-medium text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 size={13} />
                                        Sil
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reply Form */}
            {isReplying && (
                <div className="mt-2 ml-4 pl-4 border-l-2 border-white/20 dark:border-white/10 rounded-bl-xl">
                    <div className="bg-white/5 dark:bg-zinc-800/30 backdrop-blur-sm border border-white/10 dark:border-white/5 rounded-xl p-3">
                        <form onSubmit={handleReplySubmit} className="space-y-2">
                            <Textarea
                                className="min-h-[60px] text-sm resize-none bg-black/10 dark:bg-black/20 border-white/10 focus-visible:ring-purple-500/30 placeholder:text-muted-foreground/50 text-foreground"
                                placeholder={`${displayName} kullanıcısına yanıt ver...`}
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsReplying(false)}
                                    className="h-7 text-xs hover:bg-white/5"
                                >
                                    İptal
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={loading || !replyContent.trim()}
                                    className="bg-purple-600 hover:bg-purple-500 text-white h-7 text-xs px-4"
                                >
                                    {loading ? "..." : "Yanıtla"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Nested Replies Tree */}
            {replies.length > 0 && (
                <div className="mt-2 ml-4 pl-4 border-l-2 border-white/20 dark:border-white/10 rounded-bl-2xl space-y-2 relative">
                    {visibleReplies.map(reply => (
                        <div key={reply.id} className="relative mt-2">
                            {/* Curved Connector - only for first level */}
                            <div className="absolute -left-[17px] top-4 w-4 h-4 border-l-2 border-b-2 border-white/20 dark:border-white/10 rounded-bl-lg pointer-events-none" />

                            <CommentItem
                                comment={reply}
                                onDelete={onDelete}
                                onReplyAdded={onReplyAdded}
                                allComments={allComments}
                                depth={depth + 1}
                            />
                        </div>
                    ))}

                    {/* Show More Actions */}
                    {(hiddenRepliesCount > 0 && !showAllReplies) || (showAllReplies && replies.length > MAX_VISIBLE_REPLIES) ? (
                        <div className="relative mt-2">
                            <div className="absolute -left-[17px] top-3 w-4 h-4 border-l-2 border-b-2 border-white/20 dark:border-white/10 rounded-bl-lg pointer-events-none" />

                            <button
                                onClick={() => setShowAllReplies(!showAllReplies)}
                                className="text-[11px] font-medium text-purple-400/80 hover:text-purple-400 flex items-center gap-1 ml-0.5 transition-colors"
                            >
                                {showAllReplies ? (
                                    <><ChevronUp size={12} /> Daha az göster</>
                                ) : (
                                    <><ChevronDown size={12} /> Diğer {hiddenRepliesCount} yanıtı gör</>
                                )}
                            </button>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
