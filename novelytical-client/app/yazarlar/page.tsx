import Link from "next/link";
import { Metadata } from "next";
import { getNovelStats, calculateRank } from "@/services/novel-stats-service";
import { TrendingUp, BookOpen, Star } from "lucide-react";

export const metadata: Metadata = {
    title: "Yazarlar | Novelytical",
    description: "Novelytical'daki popüler yazarları keşfedin.",
};

async function getTopAuthors() {
    try {
        // Fetch a larger dataset (1000) to get a better representation of "Top Authors"
        // Ideally this should be an aggregation endpoint on the backend in the future.
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/novels?pageSize=1000`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) return [];

        const data = await res.json();
        const novels = data.data || data || [];

        // Fetch live stats for ALL fetched novels to calculate accurate Ranks
        // This might be heavy, but it's cached for 1 hour.
        const novelsWithStats = await Promise.all(
            novels.map(async (novel: any) => {
                const stats = await getNovelStats(novel.id);
                // Use standard rank calculation
                const rankScore = calculateRank(novel.viewCount || 0, stats);
                return { ...novel, rankScore };
            })
        );

        // Aggregate per author
        const authorStats: Record<string, { count: number; totalChapters: number; totalRankScore: number; topNovels: { coverUrl: string; rankScore: number }[] }> = {};

        novelsWithStats.forEach((novel: any) => {
            const author = novel.author || "Bilinmeyen";
            if (!authorStats[author]) {
                authorStats[author] = { count: 0, totalChapters: 0, totalRankScore: 0, topNovels: [] };
            }
            authorStats[author].count++;
            authorStats[author].totalChapters += novel.chapterCount || 0;
            authorStats[author].totalRankScore += novel.rankScore;

            // Collect novel info for avatar
            if (novel.coverUrl) {
                authorStats[author].topNovels.push({ coverUrl: novel.coverUrl, rankScore: novel.rankScore });
            }
        });

        // Sort by Total Rank Score and process top novels
        return Object.entries(authorStats)
            .map(([name, stats]) => {
                // Sort top novels by rank score desc and take top 3
                const sortedTopNovels = stats.topNovels.sort((a, b) => b.rankScore - a.rankScore).slice(0, 3);
                return { name, ...stats, topNovels: sortedTopNovels };
            })
            .sort((a, b) => b.totalRankScore - a.totalRankScore)
            .slice(0, 50);

    } catch (error) {
        console.error("Failed to fetch authors:", error);
        return [];
    }
}

export default async function YazarlarPage() {
    const authors = await getTopAuthors();

    const getRankStyles = (index: number) => {
        switch (index) {
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
            return <img src={novels[0].coverUrl} alt="Cover" className="w-full h-full object-cover" />;
        }

        if (novels.length === 2) {
            return (
                <div className="w-full h-full flex">
                    <div className="w-1/2 h-full overflow-hidden border-r border-white/10">
                        <img src={novels[0].coverUrl} alt="Cover 1" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden">
                        <img src={novels[1].coverUrl} alt="Cover 2" className="w-full h-full object-cover" />
                    </div>
                </div>
            );
        }

        // 3+ Novels (T-split / Mercedes ish)
        return (
            <div className="w-full h-full flex flex-col">
                <div className="h-1/2 w-full overflow-hidden border-b border-white/10">
                    <img src={novels[0].coverUrl} alt="Cover 1" className="w-full h-full object-cover" />
                </div>
                <div className="h-1/2 w-full flex">
                    <div className="w-1/2 h-full overflow-hidden border-r border-white/10">
                        <img src={novels[1].coverUrl} alt="Cover 2" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden">
                        <img src={novels[2].coverUrl} alt="Cover 3" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className="container px-4 py-8 md:py-12 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Popüler Yazarlar</h1>
                        <p className="text-sm md:text-base text-muted-foreground">
                            En yüksek etkileşim ve okunma oranına sahip yazarlar.
                        </p>
                    </div>
                </div>

                {authors.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Henüz yazar verisi yok.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {authors.map((author, index) => {
                            const styles = getRankStyles(index);
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
                                                        {index + 1}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-bold text-base md:text-lg truncate transition-colors mb-1 ${index > 2 ? styles.text : styles.icon}`}>{author.name}</h3>

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
                                                            className={`h-full rounded-full ${index < 3 ? `bg-gradient-to-r ${styles.badge.split(' ').slice(0, 2).join(' ')}` : 'bg-gradient-to-r from-primary to-purple-500'}`}
                                                            style={{ width: `${Math.min(100, (author.totalRankScore / authors[0].totalRankScore) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-bold ${index < 3 ? styles.icon : 'text-primary'}`}>
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
                )}
            </div>
        </main>
    );
}
