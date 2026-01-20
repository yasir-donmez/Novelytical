import HeroSkeleton from '@/components/hero-skeleton';
import { LaneSkeleton } from '@/components/lanes/lane-skeleton';
import { BentoLaneSkeleton } from '@/components/lanes/bento-lane-skeleton';

export default function Loading() {
    return (
        <div className="min-h-screen bg-background pb-20 w-full overflow-x-hidden">
            <HeroSkeleton />

            <div className="relative z-20 -mt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                <LaneSkeleton variant="trending" hideBorder={true} />
                <BentoLaneSkeleton />
            </div>
        </div>
    );
}
