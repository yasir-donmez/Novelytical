import { LaneSkeleton } from '@/components/lanes/lane-skeleton';
import { BentoLaneSkeleton } from '@/components/lanes/bento-lane-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-20">
            {/* Mimic Home Page Structure which is the most likely entry */}
            <LaneSkeleton variant="trending" hideBorder={true} />
            <BentoLaneSkeleton />

            {/* Community Pulse Skeleton - Matches `CommunityPulse` structure */}
            <div className="mt-12 pt-8 border-t border-white/5">
                {/* Header: Title */}
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <Skeleton className="h-8 w-32 rounded-md" />
                </div>

                {/* Community Pulse Content Wrapper - Matches the huge spacing of the real component */}
                <div className="w-full mt-32 py-20 relative border-t border-purple-500/20">
                    <div className="space-y-6">
                        {/* Tabs & Active Users mock */}
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-24 rounded-full" />
                                <Skeleton className="h-9 w-24 rounded-full" />
                                <Skeleton className="h-9 w-32 rounded-full" />
                            </div>
                            <Skeleton className="h-6 w-32 rounded-full opacity-50 hidden sm:block" />
                        </div>

                        {/* Main Content Card Skeleton */}
                        <div className="border border-border/50 bg-background/50 backdrop-blur-sm h-[calc(100vh-180px)] min-h-[500px] flex flex-col rounded-xl p-4 space-y-4">
                            {/* Fake Posts */}
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <div className="flex gap-2">
                                            <Skeleton className="h-4 w-24 rounded-sm" />
                                            <Skeleton className="h-4 w-12 rounded-sm opacity-50" />
                                        </div>
                                        <Skeleton className="h-16 w-full rounded-xl opacity-60" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Editor's Choice Lane */}
            <LaneSkeleton title="Editörün Seçimi" />
        </div>
    );
}
