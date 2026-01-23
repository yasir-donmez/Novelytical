import { Library } from 'lucide-react';
import { NovelCardSkeleton } from '@/components/novel-card-skeleton';
import { NovelGridSkeleton } from '@/components/novel-grid-skeleton';

export default function Loading() {
    return (
        <div className="space-y-4 min-h-screen -mt-6">
            {/* Visual Anchor Header */}
            <div className="relative z-10 bg-background/95 backdrop-blur-sm py-4 mb-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                        <Library className="h-6 w-6 text-blue-500 fill-blue-500/20" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">
                        Kütüphane & Arşiv
                    </h2>
                </div>
            </div>

            {/* Tags Section Skeleton - Matches HomeTags min-h-[140px] layout */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                <div className="relative w-full py-2 h-[140px] flex items-center justify-center">
                    <div className="w-full px-8 md:px-16 py-6 flex flex-col gap-3 items-center animate-pulse">
                        {/* Row 1 */}
                        <div className="flex gap-3 justify-center">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="h-8 w-20 bg-muted/20 rounded-full border border-white/5" />
                            ))}
                        </div>
                        {/* Row 2 */}
                        <div className="flex gap-3 justify-center">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={`r2-${i}`} className="h-8 w-16 bg-muted/20 rounded-full border border-white/5" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Novel Grid Structure */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <NovelGridSkeleton />
            </div>
        </div>
    );
}
