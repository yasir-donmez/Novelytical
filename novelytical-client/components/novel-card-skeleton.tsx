import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function NovelCardSkeleton() {
    return (
        <>
            {/* Mobile: Horizontal Layout (Only on very small screens) */}
            <Card className="md:hidden flex flex-row rounded-xl p-1.5 overflow-hidden border border-border/50 bg-slate-100/50 dark:bg-card">
                {/* Cover Skeleton */}
                <div className="w-24 aspect-[2/3] flex-shrink-0 overflow-hidden rounded-lg">
                    <Skeleton className="w-full h-full" />
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-[95%] rounded-md" /> {/* Title Line 1 */}
                        <Skeleton className="h-4 w-[60%] rounded-md" /> {/* Author */}
                    </div>
                    <div className="mt-auto space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-10 rounded-md" /> {/* Rating */}
                            <Skeleton className="h-4 w-14 rounded-md" /> {/* Chapter Count */}
                        </div>
                        <div className="flex gap-1">
                            <Skeleton className="h-5 w-12 rounded-md" />
                            <Skeleton className="h-5 w-14 rounded-md" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tablet/Desktop: Vertical Layout */}
            <div className="hidden md:block h-full w-full">
                <Card className="h-full overflow-hidden border border-border/50 bg-slate-100/50 dark:bg-card shadow-sm flex flex-col group">
                    <CardHeader className="p-3">
                        <div className="aspect-[2/3] rounded-xl overflow-hidden relative shadow-sm bg-muted/20">
                            <Skeleton className="w-full h-full" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-2 flex-grow flex flex-col">
                        {/* Title - emulating 2 lines or a block */}
                        <div className="space-y-1.5 pt-1">
                            <Skeleton className="h-5 w-full rounded-sm" />
                            <Skeleton className="h-5 w-3/4 rounded-sm" />
                        </div>
                        {/* Author */}
                        <Skeleton className="h-4 w-1/2 rounded-sm mt-1" />

                        {/* Rating row */}
                        <div className="flex items-center gap-2 pt-1 text-sm mt-1">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 w-8 rounded-sm" />
                            <Skeleton className="h-4 w-4" /> {/* Bullet */}
                            <Skeleton className="h-4 w-16 rounded-sm" />
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex gap-2 mt-auto flex-wrap">
                        {/* Tags */}
                        <Skeleton className="h-5 w-16 rounded-full opacity-70" />
                        <Skeleton className="h-5 w-20 rounded-full opacity-70" />
                        <Skeleton className="h-5 w-14 rounded-full opacity-70" />
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}
