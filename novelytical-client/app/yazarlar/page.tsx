import Link from "next/link";
import { Metadata } from "next";
import { Users } from "lucide-react";
import { PaginationClient } from "@/components/pagination-client";
import { AuthorsListClient } from "@/components/authors/authors-list-client";
import type { NovelListDto } from "@/types/novel";

export const metadata: Metadata = {
    title: "Yazarlar | Novelytical",
    description: "Novelytical'daki popüler yazarları keşfedin.",
};

async function getTopAuthors() {
    try {
        // Fetch a larger dataset (1000) to get a better representation of "Top Authors"
        const res = await fetch(`${process.env.API_URL || 'http://localhost:5050'}/api/novels?pageSize=1000`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) return [];

        const data = await res.json();
        const novels: NovelListDto[] = data.data || data || [];

        // ✅ Use only backend data for ranking (no Firebase calls during build)
        const novelsWithRank = novels.map((novel) => {
            // Simple ranking based on backend viewCount
            const rankScore = novel.viewCount || 0;
            return { ...novel, rankScore };
        });

        // Aggregate per author
        const authorStats: Record<string, { count: number; totalChapters: number; totalRankScore: number; topNovels: { coverUrl: string; rankScore: number }[] }> = {};

        novelsWithRank.forEach((novel) => {
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
            .sort((a, b) => b.totalRankScore - a.totalRankScore); // Return all authors
    } catch (error) {
        console.error("Failed to fetch authors:", error);
        return [];
    }
}

export default async function YazarlarPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const allAuthors = await getTopAuthors();

    // Pagination Logic
    const params = await searchParams;
    const currentPage = Number(params?.page) || 1;
    const pageSize = 30;
    const totalAuthors = allAuthors.length;
    const totalPages = Math.ceil(totalAuthors / pageSize);

    // Get current page data
    const authors = allAuthors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12">
            <div className="w-full">
                {/* Visual Anchor Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                        <Users className="h-6 w-6 text-purple-500 fill-purple-500/20" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">
                            Popüler Yazarlar
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground mt-1">
                            En yüksek etkileşim ve okunma oranına sahip yazarlar.
                        </p>
                    </div>
                </div>

                {authors.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Henüz yazar verisi yok.
                    </div>
                ) : (
                    <>
                        <AuthorsListClient
                            initialAuthors={authors}
                            currentPage={currentPage}
                            pageSize={pageSize}
                        />

                        {/* Pagination Control */}
                        <PaginationClient
                            totalPages={totalPages}
                            currentPage={currentPage}
                            pageSize={pageSize}
                            totalRecords={totalAuthors}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
