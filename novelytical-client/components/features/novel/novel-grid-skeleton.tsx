import { NovelCardSkeleton } from '@/components/features/novel/novel-card-skeleton';

export function NovelGridSkeleton() {
    return (
        <>
            {/* Controls Skeleton - MATCH FilterControls exactly */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="h-5 w-32 bg-muted/20 rounded-md animate-pulse" />
                <div className="flex flex-wrap items-center gap-4">
                    <div className="h-10 w-28 bg-card/60 border border-white/5 rounded-md animate-pulse" /> {/* Category */}
                    <div className="h-10 w-32 bg-card/60 border border-white/5 rounded-md animate-pulse" /> {/* Advanced */}
                    <div className="h-10 w-28 bg-card/60 border border-white/5 rounded-md animate-pulse" /> {/* Sort */}
                </div>
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
                {Array.from({ length: 24 }).map((_, i) => (
                    <NovelCardSkeleton key={i} />
                ))}
            </div>

            {/* Pagination Skeleton */}
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
        </>
    );
}
