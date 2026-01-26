"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, BookOpen, Star } from "lucide-react";
import { ProductionImageLoader } from "@/components/production-image-loader";
import { getNovelStats, calculateRank } from "@/services/novel-stats-service";
import type { NovelListDto } from "@/types/novel";

interface AuthorData {
    name: string;
    count: number;
    totalChapters: number;
    totalRankScore: number;
    topNovels: { coverUrl: string; rankScore: number }[];
}

interface AuthorsListClientProps {
    initialAuthors: AuthorData[];
    currentPage: number;
    pageSize: number;
    maxScore: number;
}

export function AuthorsListClient({ initialAuthors, currentPage, pageSize, maxScore }: AuthorsListClientProps) {
    const [authors, setAuthors] = useState(initialAuthors);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    // Sync state with props when page changes
    useEffect(() => {
        setAuthors(initialAuthors);
    }, [initialAuthors]);

    useEffect(() => {
        // Fetch Firebase stats on client-side after hydration
        const fetchStats = async () => {
            // ... existing code ...
        };

        fetchStats();
    }, [initialAuthors]);

    const getRankStyles = (index: number) => {
        // ... existing code ...
        const absoluteIndex = (currentPage - 1) * pageSize + index;

        switch (absoluteIndex) {
            // ... existing code ...
            case 0: // Gold
                return {
                    border: "border-yellow-500/50 shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]",
                    bg: "bg-yellow-500/5 hover:bg-yellow-500/10",
                    badge: "from-yellow-400 to-amber-600 text-white shadow-yellow-500/20",
                    text: "text-yellow-500",
                    icon: "text-yellow-500",
                    frame: "frame-gold"
                };
            case 1: // Silver
                return {
                    border: "border-slate-400/50 shadow-[0_0_15px_-3px_rgba(148,163,184,0.3)]",
                    bg: "bg-slate-400/5 hover:bg-slate-400/10",
                    badge: "from-slate-300 to-slate-500 text-white shadow-slate-400/20",
                    text: "text-slate-400",
                    icon: "text-slate-400",
                    frame: "frame-silver"
                };
            case 2: // Bronze
                return {
                    border: "border-orange-700/50 shadow-[0_0_15px_-3px_rgba(194,65,12,0.3)]",
                    bg: "bg-orange-700/5 hover:bg-orange-700/10",
                    badge: "from-orange-400 to-amber-800 text-white shadow-orange-700/20",
                    text: "text-orange-700",
                    icon: "text-orange-700",
                    frame: "frame-bronze"
                };
            default:
                return {
                    border: "border-border shadow-sm",
                    bg: "bg-card hover:bg-accent/40",
                    badge: "from-primary/10 to-purple-500/10 text-primary border-white/5",
                    text: "group-hover:text-primary",
                    icon: "text-primary",
                    frame: "border-border"
                };
        }
    };

    const renderAvatar = (novels: { coverUrl: string }[]) => {
        if (!novels || novels.length === 0) {
            return (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 opacity-20" />
                </div>
            );
        }

        if (novels.length === 1) {
            return <ProductionImageLoader src={novels[0].coverUrl} alt="Cover" className="w-full h-full object-cover" />;
        }

        if (novels.length === 2) {
            return (
                <div className="w-full h-full flex relative">
                    <div className="w-1/2 h-full overflow-hidden border-r border-white/10 relative">
                        <ProductionImageLoader src={novels[0].coverUrl} alt="Cover 1" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden relative">
                        <ProductionImageLoader src={novels[1].coverUrl} alt="Cover 2" className="w-full h-full object-cover" />
                    </div>
                </div>
            );
        }

        // 3+ Novels (T-split)
        return (
            <div className="w-full h-full flex flex-col relative">
                <div className="h-1/2 w-full overflow-hidden border-b border-white/10 relative">
                    <ProductionImageLoader src={novels[0].coverUrl} alt="Cover 1" className="w-full h-full object-cover" />
                </div>
                <div className="h-1/2 w-full flex relative">
                    <div className="w-1/2 h-full overflow-hidden border-r border-white/10 relative">
                        <ProductionImageLoader src={novels[1].coverUrl} alt="Cover 2" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden relative">
                        <ProductionImageLoader src={novels[2].coverUrl} alt="Cover 3" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
            {authors.map((author, index) => {
                // ... existing loop code ...
                const styles = getRankStyles(index);
                const displayRank = (currentPage - 1) * pageSize + index + 1;

                return (
                    // ... existing JSX ...
                    <Link
                        href={`/yazarlar/${encodeURIComponent(author.name)}`}
                        key={author.name}
                        className="block group"
                    >
                        <div
                            className={`p-4 md:p-5 rounded-xl border transition-all duration-300 h-full relative overflow-hidden ${styles.border} ${styles.bg}`}
                        >
                            {/* ... existing card content ... */}
                            <div className={`absolute top-0 left-0 p-0 m-0 z-20`}>
                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-br-2xl flex items-center justify-center text-sm md:text-base font-bold shadow-md bg-gradient-to-br ${styles.badge}`}>
                                    {displayRank}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 z-10 relative mt-2 pl-2">
                                {/* ... avatar ... */}
                                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden relative shadow-inner shrink-0 ${displayRank <= 3 ? styles.frame : 'border border-border'}`}>
                                    {renderAvatar(author.topNovels)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-base md:text-lg truncate transition-colors mb-1 ${displayRank <= 3 ? styles.text : styles.icon}`}>{author.name}</h3>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                                        <span className="flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" />
                                            {author.count} Kitap
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(author.totalChapters)} Bölüm
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${displayRank <= 3 ? `bg-gradient-to-r ${styles.badge.split(' ').slice(0, 2).join(' ')}` : 'bg-gradient-to-r from-primary to-purple-500'}`}
                                                style={{ width: `${Math.min(100, (author.totalRankScore / (Number(maxScore) || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold ${displayRank <= 3 ? styles.icon : 'text-primary'}`}>
                                            {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(author.totalRankScore)} Puan
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
