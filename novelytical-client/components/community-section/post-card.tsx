'use client';

import { Post } from '@/services/feed-service';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { UserHoverCard } from '@/components/ui/user-hover-card';
import { Trash2, BarChart2, ArrowRight, MessageSquare, Users } from 'lucide-react';
import { PollDisplay } from './poll-display';

interface PostCardProps {
    post: Post;
    user: any;
    savedPostIds: number[]; // Changed to number[]
    onDelete?: (postId: number) => void;
    onVote: (postId: number, optionId: number) => void;
    onBookmark: (postId: number) => void;
    onViewDetails: (postId: number) => void;
    isChatLayout?: boolean;
    showPollSummaryOnly?: boolean;
    onGoToPoll?: (postId: number) => void;
    id?: string;
}

// ... helper timeAgo ...
function timeAgo(dateStr: string | undefined) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " yıl önce";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " ay önce";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " gün önce";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " saat önce";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " dakika önce";
    return "Az önce";
}

// Helper to render content with highlighted mentions
function renderContentWithMentions(content: string) {
    if (!content) return null;
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            return (
                <span key={index} className="text-primary font-semibold hover:underline cursor-pointer">
                    {part}
                </span>
            );
        }
        return part;
    });
}


export function PostCard({
    post,
    user,
    savedPostIds,
    onDelete,
    onVote,
    onBookmark,
    onViewDetails,
    isChatLayout = false,
    showPollSummaryOnly = false,
    onGoToPoll,
    id,
    className
}: PostCardProps & { className?: string }) {
    // Note: API returns userId as Firebase UID string, so comparison is valid
    const isOwner = user?.uid === post.userId;
    const shouldAlignRight = isChatLayout && isOwner;

    return (
        <div id={id} className={`w-full flex mb-2 sm:mb-3 px-1 ${shouldAlignRight ? 'justify-end' : 'justify-start'} ${className || ''}`}>
            <div className={`flex gap-2 sm:gap-3 max-w-[95%] sm:max-w-[85%] min-w-0 ${shouldAlignRight ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                <UserHoverCard
                    userId={post.userId}
                    username={post.userDisplayName}
                    image={post.userAvatarUrl}
                    frame={post.userFrame}
                    className="shrink-0 self-start"
                >
                    <UserAvatar
                        src={post.userAvatarUrl}
                        alt={post.userDisplayName}
                        frameId={post.userFrame}
                        className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-105"
                        fallbackClass="text-[10px] bg-primary/10 text-primary"
                    />
                </UserHoverCard>
                <div className={`relative min-w-0 p-2.5 sm:p-3 shadow-sm transition-all overflow-hidden
                    ${isOwner
                        ? 'bg-primary/5 rounded-xl sm:rounded-2xl rounded-tr-none border border-primary/20'
                        : 'bg-muted/30 rounded-xl sm:rounded-2xl rounded-tl-none border border-border/40'
                    }
                `}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                            <UserHoverCard
                                userId={post.userId}
                                username={post.userDisplayName}
                                image={post.userAvatarUrl}
                                frame={post.userFrame}
                            >
                                <span className="font-semibold text-[11px] sm:text-xs text-foreground/90 hover:underline decoration-primary transition-all cursor-pointer">
                                    {post.userDisplayName}
                                </span>
                            </UserHoverCard>
                            <span className="text-[10px] text-muted-foreground/60">{timeAgo(post.createdAt)}</span>
                        </div>
                        {/* Delete button for text posts only - top right */}
                        {isOwner && post.type === 'text' && onDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 -mt-1 -mr-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onDelete(post.id)}
                                title="Sil"
                            >
                                <Trash2 size={12} />
                            </Button>
                        )}
                    </div>

                    <p
                        className="text-[11px] sm:text-xs text-foreground/80 leading-snug whitespace-pre-wrap break-all w-full"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}
                    >
                        {renderContentWithMentions(post.content)}
                    </p>

                    {/* Poll Display or Summary */}
                    {post.type === 'poll' && (
                        showPollSummaryOnly ? (
                            <div className="mt-1 flex items-center justify-between gap-3 group">
                                <div
                                    className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDetails(post.id);
                                    }}
                                >
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <BarChart2 size={12} className="text-primary" />
                                    </div>
                                    <span className="text-xs italic">Bir anket başlattı.</span>
                                </div>

                                {onGoToPoll && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onGoToPoll(post.id);
                                        }}
                                        title="Ankete git"
                                    >
                                        <ArrowRight size={14} />
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <PollDisplay
                                post={post}
                                user={user}
                                savedPostIds={savedPostIds}
                                onVote={onVote}
                                onBookmark={onBookmark}
                                onDelete={onDelete}
                                onViewDetails={onViewDetails}
                            />
                        )
                    )}

                    {/* Room Display */}
                    {post.type === 'room' && (
                        showPollSummaryOnly ? (
                            <div className="mt-1 flex items-center justify-between gap-3 group">
                                <div
                                    className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onGoToPoll) onGoToPoll(post.id);
                                    }}
                                >
                                    <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                        <MessageSquare size={12} className="text-purple-500" />
                                    </div>
                                    <span className="text-xs italic truncate max-w-[150px] sm:max-w-xs">
                                        Bir oda kurdu: <span className="font-semibold not-italic">{post.roomTitle}</span>
                                    </span>
                                </div>

                                {onGoToPoll && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onGoToPoll(post.id);
                                        }}
                                        title="Odaya git"
                                    >
                                        <ArrowRight size={14} />
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="mt-3 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
                                {/* Ambient Bg */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />

                                <div className="relative z-10">
                                    <h4 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                                        <MessageSquare size={18} className="text-purple-500" />
                                        {post.roomTitle}
                                    </h4>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                        <div className="flex items-center gap-1">
                                            <Users size={12} />
                                            <span>{post.participantCount || 1} Katılımcı</span>
                                        </div>
                                        <div className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide">
                                            Aktif
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onGoToPoll) onGoToPoll(post.id); // Triggers entry in the Rooms tab
                                        }}
                                    >
                                        Sohbete Katıl
                                    </Button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
