'use client';

import { ScrollableSection } from '@/components/scrollable-section';
import { Skeleton } from '@/components/ui/skeleton';

export function LaneSkeleton({ title, icon }: { title?: string, icon?: React.ReactNode }) {
    // Helper to create a dummy header/icon if not provided, 
    // though in real usage we usually pass the title even during loading if possible.
    // If title is dynamic, we can render a skeleton title.

    return (
        <div className="mt-12 border-t pt-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    {title ? (
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {title}
                            {icon}
                        </h2>
                    ) : (
                        <Skeleton className="h-8 w-48 rounded-md" />
                    )}
                </div>
            </div>

            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-[160px] sm:w-[200px] flex-none space-y-3">
                        {/* Cover aspect ratio portrait 2/3 roughly */}
                        <Skeleton className="w-full aspect-[2/3] rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
