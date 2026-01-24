import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

export default function Loading() {
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

                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
                    {Array.from({ length: 30 }).map((_, i) => (
                        // Mimic Link wrapper
                        <div key={i} className="block h-full">
                            <div className="p-4 md:p-5 rounded-xl border border-border bg-card h-full relative overflow-hidden">
                                {/* Rank Badge Skeleton */}
                                <div className="absolute top-0 left-0 z-20">
                                    <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-br-2xl rounded-tl-none rounded-tr-none rounded-bl-none" />
                                </div>

                                <div className="flex items-center gap-4 mt-2 pl-2">
                                    {/* Avatar Skeleton */}
                                    <Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-full shrink-0 border border-border" />

                                    <div className="flex-1 min-w-0">
                                        {/* Name Skeleton - Match text-lg line-height (28px ~ h-7) */}
                                        <Skeleton className="h-7 w-3/4 mb-1" />

                                        {/* Stats Skeleton - Match text-xs line-height (16px ~ h-4) */}
                                        <div className="flex gap-2 mb-3">
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>

                                        {/* Rank Bar Skeleton */}
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-1.5 flex-1 rounded-full" />
                                            {/* Score Text Skeleton - Match text-xs (16px ~ h-4) */}
                                            <Skeleton className="h-4 w-12" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination Skeleton - Matches NovelGridSkeleton */}
                <div className="mt-12 space-y-4 flex flex-col items-center">
                    {/* Page Info Text Skeleton */}
                    <div className="h-4 w-48 bg-muted/20 rounded-md animate-pulse" />

                    {/* Buttons Skeleton */}
                    <div className="flex items-center gap-1">
                        <div className="h-9 w-20 bg-muted/20 rounded-md border border-white/5 animate-pulse" /> {/* Previous */}
                        <div className="flex items-center gap-1">
                            <div className="h-9 w-9 bg-card/60 border border-white/5 rounded-md animate-pulse" /> {/* 1 */}
                            <div className="h-9 w-9 bg-muted/20 border border-white/5 rounded-md animate-pulse" /> {/* 2 */}
                            <div className="h-9 w-9 bg-muted/20 border border-white/5 rounded-md animate-pulse" /> {/* 3 */}
                            <div className="h-9 w-9 bg-transparent flex items-center justify-center">...</div>
                            <div className="h-9 w-9 bg-muted/20 border border-white/5 rounded-md animate-pulse" /> {/* Last */}
                        </div>
                        <div className="h-9 w-20 bg-muted/20 rounded-md border border-white/5 animate-pulse" /> {/* Next */}
                    </div>
                </div>
            </div>
        </div>
    );
}
