'use client';

import { Post } from '@/services/feed-service';
import { Button } from '@/components/ui/button';
import { Lock, Bookmark, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface PollDisplayProps {
    post: Post;
    user: any;
    savedPostIds: number[];
    onVote: (postId: number, optionId: number) => void;
    onBookmark: (postId: number) => void;
    onDelete?: (postId: number) => void;
    onViewDetails: (postId: number) => void;
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
    if (post.type !== 'poll' || !post.options) return null;

    const isOwner = user?.uid === post.userId;
    // expiresAt is ISO string from API, convert to Date
    const isExpired = post.expiresAt ? new Date(post.expiresAt) < new Date() : false;

    const hasImages = post.options.some(opt => opt.relatedNovelCover || opt.relatedNovelId);

    // Image Grid Layout (Vertical)
    if (hasImages) {
        return (
            <div className={`mt-2 w-fit ${className}`}>
                <div className="flex gap-2 flex-wrap">
                    {post.options.map((opt, idx) => {
                        const totalVotes = post.options!.reduce((acc, curr) => acc + curr.voteCount, 0);
                        const percentage = totalVotes === 0 ? 0 : Math.round((opt.voteCount / totalVotes) * 100);

                        // Vibrant border/glow for selected/active state
                        const colors = [
                            { border: 'border-purple-500', bg: 'bg-purple-500' },
                            { border: 'border-blue-500', bg: 'bg-blue-500' },
                            { border: 'border-pink-500', bg: 'bg-pink-500' },
                            { border: 'border-green-500', bg: 'bg-green-500' },
                        ];
                        const color = colors[idx % colors.length];

                        return (
                            <button
                                key={opt.id}
                                onClick={() => onVote(post.id, opt.id)}
                                disabled={!!isExpired}
                                className={`group relative shrink-0 w-24 h-36 rounded-lg overflow-hidden transition-all duration-300 border-2 ${isExpired ? 'opacity-80 grayscale' : 'hover:scale-[1.02] hover:shadow-lg'
                                    } ${post.userVotedOptionId === opt.id ? color.border : 'border-transparent'}`}
                            >
                                {/* Background Image */}
                                {opt.relatedNovelCover ? (
                                    <Image
                                        src={opt.relatedNovelCover}
                                        alt={opt.text}
                                        fill
                                        unoptimized
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        sizes="(max-width: 768px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${color.bg} opacity-20`} />
                                )}

                                {/* Dark Gradient Overlay for Text Visibility */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                                {/* Progress Bar (Vertical/Overlay) */}
                                <div
                                    className={`absolute bottom-0 left-0 right-0 ${color.bg} opacity-30 transition-all duration-700 ease-out`}
                                    style={{ height: `${percentage}%` }}
                                />

                                {/* Content Overlay */}
                                <div className="absolute inset-0 p-3 flex flex-col justify-end text-left">
                                    {/* Percentage Badge */}
                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-0.5 text-[10px] font-bold text-white border border-white/10">
                                        %{percentage}
                                    </div>

                                    {/* Title (Always visible at bottom or hover? User asked for hover but for mobile accessibility always visible is better. 
                                        Let's do: Truncated default, Full on hover/group-hover) */}
                                    <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                        <span className="text-xs font-bold text-white line-clamp-2 drop-shadow-md group-hover:line-clamp-none">
                                            {opt.text}
                                        </span>
                                        {opt.voteCount > 0 && (
                                            <span className="text-[10px] text-zinc-300 block mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {opt.voteCount} oy
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => onBookmark(post.id)}>
                            <Bookmark size={14} />
                        </Button>
                        {isOwner && onDelete && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDelete(post.id)}>
                                <Trash2 size={14} />
                            </Button>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-[10px] text-muted-foreground hover:bg-transparent hover:text-primary gap-1"
                        onClick={() => onViewDetails(post.id)}
                    >
                        <span>{post.options.reduce((a, b) => a + b.voteCount, 0)} oy</span>
                        {isExpired && (
                            <>
                                <span className="opacity-60 text-[8px]">•</span>
                                <div className="flex items-center gap-1 group/lock relative cursor-help">
                                    <span className="text-amber-500 bg-amber-500/10 p-1 rounded">
                                        <Lock size={10} />
                                    </span>
                                    <span className="text-[10px] text-amber-500 font-medium opacity-0 w-0 group-hover/lock:opacity-100 group-hover/lock:w-auto transition-all duration-300 overflow-hidden whitespace-nowrap">
                                        Sona Erdi
                                    </span>
                                </div>
                            </>
                        )}
                        <span className="opacity-60">• Detay</span>
                    </Button>
                </div>
            </div>
        );
    }

    // Default Text List Layout (Standard Width)
    return (
        <div className={`mt-2 space-y-1 w-[240px] max-w-full ${className}`}>
            {post.options.map((opt, idx) => {
                const totalVotes = post.options!.reduce((acc, curr) => acc + curr.voteCount, 0);
                const percentage = totalVotes === 0 ? 0 : Math.round((opt.voteCount / totalVotes) * 100);

                // Vibrant Colors
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
                        className={`w-full relative h-8 rounded bg-black/5 dark:bg-zinc-700/50 transition-all duration-200 overflow-hidden border border-black/5 dark:border-white/10 ${isExpired
                            ? 'cursor-default opacity-60'
                            : 'hover:bg-black/10 dark:hover:bg-zinc-700/70 hover:border-primary/20'
                            }`}
                    >
                        {/* Progress Bar */}
                        <div
                            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color.bg} transition-all duration-700 ease-out`}
                            style={{ width: `${percentage}%` }}
                        />

                        <div className="absolute inset-0 flex items-center justify-between px-2.5 z-10">
                            <span className="font-medium truncate text-foreground text-[10px] sm:text-xs max-w-[calc(100%-2.5rem)] block text-left leading-tight">
                                {opt.text}
                            </span>
                            {opt.voteCount > 0 && (
                                <span className={`font-mono font-bold ${color.text} ml-2 shrink-0 text-[10px]`}>
                                    {percentage}%
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}

            {/* Action Buttons and Details */}
            <div className="flex items-center justify-between mt-1 px-1">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-5 w-5 ${savedPostIds.includes(post.id) ? 'text-primary fill-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => onBookmark(post.id)}
                        title="Kaydet"
                    >
                        <Bookmark size={12} fill={savedPostIds.includes(post.id) ? "currentColor" : "none"} />
                    </Button>

                    {isOwner && onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(post.id)}
                            title="Sil"
                        >
                            <Trash2 size={12} />
                        </Button>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-muted-foreground hover:text-primary px-1.5 gap-1"
                    onClick={() => onViewDetails(post.id)}
                >
                    <span className="font-semibold">{post.options.reduce((acc, curr) => acc + curr.voteCount, 0)} oy</span>
                    {isExpired && (
                        <>
                            <span className="opacity-60 text-[8px]">•</span>
                            <div className="flex items-center gap-1 group/lock relative cursor-help">
                                <span className="text-amber-500 bg-amber-500/10 p-1 rounded">
                                    <Lock size={10} />
                                </span>
                                <span className="text-[10px] text-amber-500 font-medium opacity-0 w-0 group-hover/lock:opacity-100 group-hover/lock:w-auto transition-all duration-300 overflow-hidden whitespace-nowrap">
                                    Sona Erdi
                                </span>
                            </div>
                        </>
                    )}
                    <span className="opacity-60">• Detay</span>
                </Button>
            </div>
        </div>
    );
}
