import Link from "next/link";
import { Metadata } from "next";
import { Users } from "lucide-react";
import { PaginationClient } from "@/components/ui/pagination-client";
import { AuthorsListClient } from "@/components/authors/authors-list-client";
import type { NovelListDto } from "@/types/novel";

export const metadata: Metadata = {
    title: "Yazarlar | Novelytical",
    description: "Novelytical'daki popüler yazarları keşfedin.",
};

async function getTopAuthors(page: number) {
    try {
        const res = await fetch(`${process.env.API_URL || 'http://localhost:5050'}/api/authors/top?page=${page}&pageSize=30`, {
            next: { revalidate: 60 } // Cache for 1 minute (Redis is fast)
        });

        if (!res.ok) return { authors: [], maxScore: 0, totalCount: 0 };

        const data = await res.json();
        return {
            authors: data.authors || [],
            maxScore: data.maxScore || 0,
            totalCount: data.totalCount || 0
        };
    } catch (error) {
        console.error("Failed to fetch authors:", error);
        return { authors: [], maxScore: 0, totalCount: 0 };
    }
}

export default async function YazarlarPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    // Pagination Logic
    const params = await searchParams;
    const currentPage = Number(params?.page) || 1;
    const pageSize = 30;

    const { authors, maxScore, totalCount } = await getTopAuthors(currentPage);

    // Total pages calculation requires total count from backend (SortedSet length)
    // For now assuming 200 authors as per plan or infinite scroll
    // Let's assume 10 pages max for now or fetch total count
    // AuthorsController currently returns paginated list but no total count.

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
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
                            maxScore={maxScore}
                        />

                        {/* Pagination Control */}
                        <PaginationClient
                            totalPages={totalPages}
                            currentPage={currentPage}
                            pageSize={pageSize}
                            totalRecords={totalCount}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
