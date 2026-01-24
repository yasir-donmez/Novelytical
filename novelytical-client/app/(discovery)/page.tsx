import { Suspense } from 'react';
import { Flame, Sparkles, Trophy } from 'lucide-react';
import { GenericLane } from '@/components/lanes/generic-lane';
import { TrendingLane } from '@/components/lanes/trending-lane';
import { LaneSkeleton } from '@/components/lanes/lane-skeleton';
import { BentoGridLane } from '@/components/lanes/bento-grid-lane';
import { BentoLaneSkeleton } from '@/components/lanes/bento-lane-skeleton';

export default async function HomePage() {
    return (
        <div className="space-y-4 min-h-screen -mt-20 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-20">
                {/* 1. Trending Lane (With Numbers) */}
                <Suspense fallback={<LaneSkeleton title="Haftanın Trendleri" icon={<Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />} variant="trending" hideBorder={true} />}>
                    <TrendingLane
                        title="Haftanın Trendleri"
                        icon={<Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />}
                        className="mt-0 pt-4"
                    />
                </Suspense>
                {/* 2. New Arrivals Lane */}
                <Suspense fallback={<BentoLaneSkeleton title="Son Güncellenenler" icon={<Sparkles className="h-6 w-6 text-yellow-400 fill-yellow-400/20" />} />}>
                    <BentoGridLane
                        title="Son Güncellenenler"
                        icon={<Sparkles className="h-6 w-6 text-yellow-400 fill-yellow-400/20" />}
                    />
                </Suspense>

                {/* 3. Editor's Choice Lane */}
                <Suspense fallback={<LaneSkeleton title="Editörün Seçimi" icon={<Trophy className="h-6 w-6 text-purple-500 fill-purple-500/20" />} />}>
                    <GenericLane
                        title="Editörün Seçimi"
                        icon={<Trophy className="h-6 w-6 text-purple-500 fill-purple-500/20" />}
                        params={{ pageSize: 12, sortOrder: 'rating_desc', revalidate: 3600 }}
                    />
                </Suspense>


            </div>
        </div>
    );
}
