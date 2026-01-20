import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BentoLaneSkeletonProps {
    title?: string;
    icon?: React.ReactNode;
}

export function BentoLaneSkeleton({ title, icon }: BentoLaneSkeletonProps) {
    return (
        <section className="space-y-4 mt-12 pt-8 border-t border-white/5">
            {/* Header - Matches ScrollableSection / BentoGridLane */}
            <div className="flex items-center justify-between px-1 mb-6">
                <div className="flex items-center gap-4 select-none">
                    {icon ? (
                        <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                            {icon}
                        </div>
                    ) : (
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                    )}

                    {title ? (
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">{title}</h2>
                    ) : (
                        <Skeleton className="h-8 w-48 rounded-md" />
                    )}
                </div>
                {/* Placeholder for "Tümünü Gör" button to match layout */}
                <Skeleton className="h-9 w-24 rounded-md opacity-50" />
            </div>

            {/* Grid Layout - Matches BentoGridLane EXACTLY */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 h-auto lg:h-[650px]">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "relative group rounded-xl overflow-hidden bg-muted/20 border border-white/5",
                            i === 0
                                ? "col-span-2 row-span-2 aspect-[16/9] sm:aspect-auto sm:col-span-1 lg:col-span-2 lg:row-span-2 lg:aspect-auto"
                                : "col-span-1 row-span-1 aspect-[2/3] sm:aspect-auto"
                        )}
                    >
                        {/* Full Image Skeleton */}
                        <Skeleton className="w-full h-full rounded-none" />

                        {/* Overlay Text Skeleton (Matches Bento Card Overlay) */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 flex flex-col justify-end gap-1.5">
                            <Skeleton className="h-5 w-3/4 bg-white/30" />
                            <Skeleton className="h-3 w-1/2 bg-white/20" />
                            <div className="flex gap-1 mt-1">
                                <Skeleton className="h-4 w-12 rounded-md bg-white/10" />
                                <Skeleton className="h-4 w-10 rounded-md bg-white/10" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
