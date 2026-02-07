import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { NovelCardSkeleton } from "./novel-card-skeleton"

export function NovelDetailSkeleton() {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
            {/* Go Back Button Skeleton */}
            <Skeleton className="h-10 w-32 rounded-md" />

            <div className="grid grid-cols-1 min-[550px]:grid-cols-[200px_1fr] md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr] gap-6 sm:gap-8 lg:gap-12">
                {/* Left Column: Cover & Stats */}
                <div className="space-y-6">
                    {/* Cover Image Skeleton */}
                    <Skeleton className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-border/10" />

                    {/* Stats Card Skeleton */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-12" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Details */}
                <div className="space-y-8">
                    <div>
                        {/* Badges */}
                        {/* Badges Removed to match 'No Badge' default layout and preventing shift */}
                        {/* Title */}
                        <Skeleton className="h-10 sm:h-12 w-3/4 mb-4 rounded-lg" />

                        {/* Author & Share */}
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <Skeleton className="h-6 w-1/3 rounded-md" />
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-9 rounded-md" />
                                <Skeleton className="h-9 w-9 rounded-md" />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                        <Skeleton className="h-7 w-24 mb-2" /> {/* 'Özet' title */}
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[95%]" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[92%]" />
                        <Skeleton className="h-4 w-[60%]" />
                    </div>



                    {/* Tags */}
                    <div className="pt-4 border-t space-y-3">
                        <Skeleton className="h-5 w-16" />
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-6 w-20 rounded-full" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Author's Other Novels Carousel Skeleton */}
            <div className="mt-12 border-t pt-8">
                <Skeleton className="h-8 w-64 mb-6" /> {/* Section Title Match */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row md:items-stretch overflow-hidden h-[350px] md:h-auto py-24 md:py-8 gap-6 md:gap-4 px-0 md:px-0 w-full relative">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="w-full md:w-40 lg:w-[calc((100%-6.25rem)/6)] flex-shrink-0 space-y-3 flex flex-col">
                            <NovelCardSkeleton />
                        </div>
                    ))}
                </div>
            </div>

            {/* Similar Novels Carousel Skeleton */}
            <div className="mt-12 border-t pt-8 pb-8">
                <div className="flex items-center gap-3 mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row md:items-stretch overflow-hidden h-[350px] md:h-auto py-24 md:py-8 gap-6 md:gap-4 px-0 md:px-0 w-full relative">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="w-full md:w-40 lg:w-[calc((100%-6.25rem)/6)] flex-shrink-0 space-y-3 flex flex-col">
                            <NovelCardSkeleton />
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}
