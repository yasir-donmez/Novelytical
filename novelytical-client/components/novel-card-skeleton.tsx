import { CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card'; // We import Card but don't use it for the wrapper to avoid padding issues

export function NovelCardSkeleton() {
    return (
        <>
            {/* Mobile: Horizontal Layout (Only on very small screens) */}
            <div className="md:hidden flex flex-row rounded-xl p-1.5 overflow-hidden border border-border/50 bg-slate-100/50 dark:bg-card">
                {/* Cover Skeleton */}
                <div className="w-24 aspect-[2/3] flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800/40">
                    <Skeleton className="w-full h-full opacity-50" />
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
                            <Skeleton className="h-5 w-10 rounded-md" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop: Vertical Layout - EXACT MATCH to NovelCard structure */}
            <div className="hidden md:block h-full w-full">
                <div className="h-full overflow-hidden border border-border/50 bg-card/60 backdrop-blur-md shadow-sm flex flex-col group rounded-xl">
                    <div className="p-3">
                        <div className="aspect-[2/3] rounded-xl overflow-hidden relative shadow-sm bg-muted/20">
                            <Skeleton className="w-full h-full" />
                        </div>
                    </div>
                    {/* Content Section: Must match NovelCard padding and flex-grow */}
                    {/* NovelCard: px-4 pb-2 pt-3 flex-grow */}
                    <CardContent className="px-4 pb-2 pt-3 flex-grow">
                        {/* Title: 3.5rem total (2 lines * leading-7) */}
                        {/* We use a flex-col justify-center to mimic the vertical alignment of text lines */}
                        <div className="min-h-[2.5rem] mb-2 flex flex-col justify-center gap-1">
                            <Skeleton className="h-3.5 w-full rounded-sm opacity-60" />
                            <Skeleton className="h-3.5 w-2/3 rounded-sm opacity-60" />
                        </div>

                        {/* Author: h-5 margin-bottom-2 */}
                        <div className="h-5 mb-2 flex items-center">
                            <Skeleton className="h-4 w-1/2 rounded-sm" />
                        </div>

                        {/* Stats Row: h-5 */}
                        <div className="flex items-center gap-2 h-5 text-sm"> {/* Added text-sm to match parent font sizing context */}
                            <Skeleton className="h-4 w-4 rounded-full bg-yellow-500/20" />
                            <Skeleton className="h-4 w-8 rounded-sm opacity-70" />
                            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <Skeleton className="h-4 w-16 rounded-sm opacity-50" />
                        </div>
                    </CardContent>

                    {/* Footer: Fixed h-12, overflow hidden, matching the real card */}
                    <CardFooter className="px-4 pt-0 gap-2 mt-auto h-12 flex items-center overflow-hidden">
                        <Skeleton className="h-6 w-16 rounded-md opacity-30 flex-shrink-0" />
                        <Skeleton className="h-6 w-14 rounded-md opacity-30 flex-shrink-0" />
                        <Skeleton className="h-6 w-12 rounded-md opacity-30 flex-shrink-0" />
                    </CardFooter>
                </div>
            </div>
        </>
    );
}
