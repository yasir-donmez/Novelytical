import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function NovelCardSkeleton() {
    return (
        <>
            {/* Mobile/Tablet: Horizontal Layout */}
            <Card className="lg:hidden flex flex-row rounded-xl p-1.5 overflow-hidden">
                {/* Cover Skeleton */}
                <div className="w-28 aspect-[3/4] flex-shrink-0">
                    <Skeleton className="w-full h-full rounded-xl" />
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded-md" />
                        <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-4 rounded-full" />
                        <Skeleton className="h-3 w-8 rounded-md" />
                        <Skeleton className="h-3 w-12 rounded-md" />
                    </div>
                </div>
            </Card>

            {/* Desktop: Vertical Layout */}
            <Card className="hidden lg:block overflow-hidden border-transparent shadow-sm">
                <CardHeader className="p-3">
                    <div className="aspect-[3/4] rounded-xl overflow-hidden">
                        <Skeleton className="w-full h-full" />
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-6 w-11/12 rounded-md" /> {/* Title */}
                    <Skeleton className="h-4 w-2/3 rounded-md" />   {/* Author */}
                    <div className="flex items-center gap-2 pt-1">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-8 rounded-md" />
                        <Skeleton className="h-4 w-16 rounded-md" />
                    </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                </CardFooter>
            </Card>
        </>
    );
}
