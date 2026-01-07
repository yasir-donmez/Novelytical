import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function HeroSkeleton() {
    return (
        <div className="relative h-[70vh] w-full max-w-7xl mx-auto overflow-hidden bg-muted md:rounded-b-2xl">
            {/* Background Mimic */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>

            {/* Content Skeleton */}
            <div className="relative h-full container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
                <div className="max-w-2xl space-y-6">
                    {/* Badges */}
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-32 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Skeleton className="h-12 md:h-16 w-3/4" />
                        <Skeleton className="h-12 md:h-16 w-1/2" />
                    </div>

                    {/* Description */}
                    <div className="space-y-2 max-w-xl">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-4 pt-4">
                        <Skeleton className="h-12 w-40 rounded-full" />
                        <Skeleton className="h-12 w-40 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

