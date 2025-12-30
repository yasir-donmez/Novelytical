import { Skeleton } from "@/components/ui/skeleton"

export function NovelDetailSkeleton() {
    return (
        <div className="animate-pulse space-y-8">
            {/* Top Section: Cover & Info */}
            <div className="flex flex-col md:flex-row gap-8">
                {/* Cover Image Skeleton */}
                <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                    <Skeleton className="w-full aspect-[2/3] rounded-xl shadow-lg" />
                </div>

                {/* Info Skeleton */}
                <div className="flex-1 space-y-6">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-3/4 rounded-lg" /> {/* Title */}
                        <Skeleton className="h-6 w-1/2 rounded-md" /> {/* Author */}
                    </div>

                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>

                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Skeleton className="h-12 w-32 rounded-lg" />
                        <Skeleton className="h-12 w-32 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* AI Analysis Skeleton */}
            <div className="space-y-4 pt-8 border-t">
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
