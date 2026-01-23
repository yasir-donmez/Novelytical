"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TrendingUp, BookOpen, Star } from "lucide-react";
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
}

export function AuthorsListClient({ initialAuthors, currentPage, pageSize }: AuthorsListClientProps) {
    const [authors, setAuthors] = useState(initialAuthors);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        // Fetch Firebase stats on client-side after hydration
        const fetchStats = async () => {
            try {
                // Get all unique novels from all authors
                const allNovels = new Map<number, NovelListDto>();

                // We need to reconstruct novel data from author data
                // This is a limitation - we'll need to pass novels separately
                // For now, skip client-side stats fetching and use backend data only
                setIsLoadingStats(false);
            } catch (error) {
                console.error("Error fetching stats:", error);
                setIsLoadingStats(false);
            }
        };

        fetchStats();
    }, [initialAuthors]);

    const getRankStyles = (index: number) => {
        const absoluteIndex = (currentPage - 1) * pageSize + index;

        switch (absoluteIndex) {
            case 0: // Gold
                return {
                    border: "border-yellow-500/50",
                    bg: "bg-yellow-500/5 hover:bg-yellow-500/10",
                    badge: "from-yellow-400 to-amber-600 text-white shadow-yellow-500/20",
                    text: "text-yellow-500",
                    icon: "text-yellow-500"
                };
            case 1: // Silver
                return {
                    border: "border-slate-400/50",
                    bg: "bg-slate-400/5 hover:bg-slate-400/10",
                    badge: "from-slate-300 to-slate-500 text-white shadow-slate-400/20",
                    text: "text-slate-400",
                    icon: "text-slate-400"
                };
            case 2: // Bronze
                return {
                    border: "border-orange-700/50",
                    bg: "bg-orange-700/5 hover:bg-orange-700/10",
                    badge: "from-orange-400 to-amber-800 text-white shadow-orange-700/20",
                    text: "text-orange-700",
                    icon: "text-orange-700"
                };
            default:
                return {
                    border: "border-border",
                    bg: "bg-card hover:bg-accent/40",
                    badge: "from-primary/10 to-purple-500/10 text-primary border-white/5",
                    text: "group-hover:text-primary",
                    icon: "text-primary"
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
            return <Image src={novels[0].coverUrl} alt="Cover" className="w-full h-full object-cover" fill sizes="64px" />;
        }

        if (novels.length === 2) {
            return (
                <div className="w-full h-full flex relative">
                    <div className="w-1/2 h-full overflow-hidden border-r border-white/10 relative">
                        <Image src={novels[0].coverUrl} alt="Cover 1" className="w-full h-full object-cover" fill sizes="32px" />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden relative">
                        <Image src={novels[1].coverUrl} alt="Cover 2" className="w-full h-full object-cover" fill sizes="32px" />
                    </div>
                </div>
            );
        }

        // 3+ Novels (T-split)
        return (
            <div className="w-full h-full flex flex-col relative">
                <div className="h-1/2 w-full overflow-hidden border-b border-white/10 relative">
                    <Image src={novels[0].coverUrl} alt="Cover 1" className="w-full h-full object-cover" fill sizes="64px" />
                </div>
                <div className="h-1/2 w-full flex relative">
                    <div className="w-1/2 h-full overflow-hidden border-r border-white/10 relative">
                        <Image src={novels[1].coverUrl} alt="Cover 2" className="w-full h-full object-cover" fill sizes="32px" />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden relative">
                        <Image src={novels[2].coverUrl} alt="Cover 3" className="w-full h-full object-cover" fill sizes="32px" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {authors.map((author, index) => {
                const styles = getRankStyles(index);
                const displayRank = (currentPage - 1) * pageSize + index + 1;

                return (
                    <Link
                        href={`/yazarlar/${encodeURIComponent(author.name)}`}
                        key={author.name}
                        className="block group"
                    >
                        <div
                            className={`p-4 md:p-5 rounded-xl border transition-all duration-300 h-full relative overflow-hidden ${styles.border} ${styles.bg}`}
                        >
                            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${styles.icon}`}>
                                <TrendingUp className="w-10 h-10 md:w-12 md:h-12" />
                            </div>

                            <div className="flex items-center gap-4 z-10 relative">
                                {/* Dynamic Avatar */}
                                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden relative border shadow-inner shrink-0 ${styles.border}`}>
                                    {renderAvatar(author.topNovels)}
                                    {/* Rank Badge Overlay */}
                                    <div className={`absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]`}>
                                        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shadow-md ${styles.badge}`}>
                                            {displayRank}
                                        </div>
                                    </div>
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
                                                style={{ width: `${Math.min(100, (author.totalRankScore / authors[0].totalRankScore) * 100)}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold ${displayRank <= 3 ? styles.icon : 'text-primary'}`}>
                                            {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(author.totalRankScore)}
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
