'use client';

import { Post } from '@/services/feed-service';
import { Button } from '@/components/ui/button';
import { Lock, Bookmark, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface PollDisplayProps {
    post: Post;
    user: any;
    savedPostIds: string[];
    onVote: (postId: string, optionId: number) => void;
    onBookmark: (postId: string) => void;
    onDelete?: (postId: string) => void;
    onViewDetails: (postId: string) => void;
    className?: string;
}

export function PollDisplay({
    post,
    user,
    savedPostIds,
    onVote,
    onBookmark,
    onDelete,
    onViewDetails,
    className
}: PollDisplayProps) {
    if (post.type !== 'poll' || !post.pollOptions) return null;

    const isOwner = user?.uid === post.userId;
    const isExpired = post.expiresAt && post.expiresAt.toDate() < new Date();

    return (
        <div className={`mt-2 space-y-1.5 w-full ${className}`}>
            {post.pollOptions.map((opt, idx) => {
                const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
                const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);

                // Vibrant Colors (Like original Feed)
                const colors = [
                    { bg: 'from-purple-500/20 to-purple-600/20', glow: 'shadow-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
                    { bg: 'from-blue-500/20 to-blue-600/20', glow: 'shadow-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
                    { bg: 'from-pink-500/20 to-pink-600/20', glow: 'shadow-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400' },
                    { bg: 'from-green-500/20 to-green-600/20', glow: 'shadow-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
                ];
                const color = colors[idx % colors.length];

                return (
                    <button
                        key={opt.id}
                        onClick={() => onVote(post.id, opt.id)}
                        disabled={!!isExpired}
                        className={`w-full relative h-10 sm:h-12 rounded-lg bg-black/5 dark:bg-zinc-700/50 transition-all duration-200 overflow-hidden border border-black/5 dark:border-white/10 ${isExpired
                            ? 'cursor-default opacity-60'
                            : 'hover:bg-black/10 dark:hover:bg-zinc-700/70 hover:border-primary/20'
                            }`}
                    >
                        {/* Progress Bar */}
                        <div
                            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color.bg} transition-all duration-700 ease-out`}
                            style={{ width: `${percentage}%` }}
                        />

                        <div className="absolute inset-0 flex items-center justify-between px-3.5 z-10">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                {/* Novel Cover */}
                                {opt.novelCover && (
                                    <div className="w-7 h-9 bg-muted/50 rounded-md overflow-hidden flex-shrink-0 relative shadow-sm border border-white/10">
                                        <Image
                                            src={opt.novelCover}
                                            alt={opt.novelTitle || 'Novel cover'}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <span className="font-medium truncate text-foreground text-xs sm:text-sm max-w-[60%] sm:max-w-[50%]">
                                    {opt.novelTitle || opt.text}
                                </span>
                            </div>
                            {opt.votes > 0 && (
                                <span className={`font-mono font-semibold ${color.text} ml-2 shrink-0 text-sm`}>
                                    {opt.votes}
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}

            {/* Action Buttons and Vote Count - Bottom Row */}
            <div className="flex items-center justify-between mt-2">
                {/* Left: Action Buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 ${savedPostIds.includes(post.id) ? 'text-primary fill-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => onBookmark(post.id)}
                        title="Kaydet"
                    >
                        <Bookmark size={14} fill={savedPostIds.includes(post.id) ? "currentColor" : "none"} />
                    </Button>

                    {isOwner && onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(post.id)}
                            title="Sil"
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}

                    {/* Lock Icon for Expired Polls */}
                    {isExpired && (
                        <span title="Anket kapandı - oy kullanılamaz" className="inline-flex cursor-default">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground pointer-events-none opacity-100"
                                disabled
                            >
                                <Lock size={14} />
                            </Button>
                        </span>
                    )}
                </div>

                {/* Right: Vote Count and Details */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-muted-foreground hover:text-primary px-2 gap-1.5"
                    onClick={() => onViewDetails(post.id)}
                >
                    <span className="font-semibold">{post.pollOptions.reduce((acc, curr) => acc + curr.votes, 0)} oy</span>
                    <span className="opacity-60">• Detaylar</span>
                </Button>
            </div>
        </div>
    );
}
