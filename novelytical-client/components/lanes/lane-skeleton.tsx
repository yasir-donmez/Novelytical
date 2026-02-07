'use client';

import { ScrollableSection } from '@/components/layout/scrollable-section';
import { Skeleton } from '@/components/ui/skeleton';

export function LaneSkeleton({ title, icon, variant = 'default', hideBorder = false }: { title?: string, icon?: React.ReactNode, variant?: 'default' | 'trending', hideBorder?: boolean }) {
    // Card width depends on variant
    const cardWidthClass = variant === 'trending'
        ? "w-[210px] sm:w-[230px]"
        : "w-[160px] sm:w-[200px]";

    return (
        <div className={`mt-12 pt-8 min-h-[500px] ${!hideBorder ? 'border-t' : ''}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    {icon ? (
                        <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                            {icon}
                        </div>
                    ) : (
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                    )}

                    {title ? (
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">
                            {title}
                        </h2>
                    ) : (
                        <Skeleton className="h-8 w-48 rounded-md" />
                    )}
                </div>

                {/* Header Actions Area */}
                <div className="flex items-center gap-2">
                    {/* "See All" Button Placeholder */}
                    <Skeleton className="h-8 w-24 rounded-md opacity-50" />

                    {/* Navigation Arrows Placeholder (List Buttons) */}
                    <div className="hidden md:flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-full opacity-50" />
                        <Skeleton className="h-8 w-8 rounded-full opacity-50" />
                    </div>
                </div>
            </div>

            <div className="flex gap-4 overflow-hidden py-12 md:py-8 pl-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`${cardWidthClass} flex-none h-full relative`}>
                        {variant === 'trending' ? (
                            // Trending Variant Skeleton
                            <div className="relative w-full h-full">
                                {/* Rank Number Placeholder */}
                                <div className="absolute -left-2 bottom-4 z-10 w-16 h-24 flex items-end justify-center pointer-events-none">
                                    <Skeleton className="w-12 h-20 bg-muted/20 -skew-x-6 rounded-md opacity-30" />
                                </div>
                                {/* Card Container with Spacing */}
                                <div className="relative z-20 h-full flex flex-col pl-8 pr-4">
                                    <div className="bg-card/60 border border-border/50 rounded-xl h-full flex flex-col overflow-hidden">
                                        {/* Image Section - p-3 */}
                                        <div className="p-3">
                                            <Skeleton className="w-full aspect-[2/3] rounded-xl" />
                                        </div>
                                        {/* Content Section - px-4 pb-2 pt-3 flex-grow */}
                                        <div className="px-4 pb-2 pt-3 flex-grow space-y-2">
                                            <Skeleton className="h-4 w-full rounded-sm opacity-70" />
                                            <Skeleton className="h-3 w-2/3 rounded-sm opacity-50" />
                                        </div>
                                        {/* Footer Section - px-4 h-12 */}
                                        <div className="px-4 mt-auto h-12 flex items-center gap-2">
                                            <Skeleton className="h-6 w-16 rounded-md opacity-30" />
                                            <Skeleton className="h-6 w-14 rounded-md opacity-30" />
                                            <Skeleton className="h-6 w-12 rounded-md opacity-30" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Default Variant Skeleton
                            <div className="bg-card/60 border border-border/50 rounded-xl h-full flex flex-col overflow-hidden">
                                {/* Image Section - p-3 */}
                                <div className="p-3">
                                    <Skeleton className="w-full aspect-[2/3] rounded-xl" />
                                </div>
                                {/* Content Section - px-4 pb-2 pt-3 flex-grow */}
                                <div className="px-4 pb-2 pt-3 flex-grow space-y-2">
                                    <Skeleton className="h-4 w-full rounded-sm opacity-70" />
                                    <Skeleton className="h-3 w-2/3 rounded-sm opacity-50" />
                                </div>
                                {/* Footer Section - px-4 h-12 */}
                                <div className="px-4 mt-auto h-12 flex items-center gap-2">
                                    <Skeleton className="h-6 w-16 rounded-md opacity-30" />
                                    <Skeleton className="h-6 w-14 rounded-md opacity-30" />
                                    <Skeleton className="h-6 w-12 rounded-md opacity-30" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
