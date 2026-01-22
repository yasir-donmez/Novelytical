'use client';

import { Suspense } from 'react';
import { Flame, Sparkles, Trophy, BookOpen } from 'lucide-react';
import { GenericLane } from '@/components/lanes/generic-lane';
import { TrendingLane } from '@/components/lanes/trending-lane';
import { LaneSkeleton } from '@/components/lanes/lane-skeleton';

import { BentoGridLane } from '@/components/lanes/bento-grid-lane';
import { BentoLaneSkeleton } from '@/components/lanes/bento-lane-skeleton';

export default function HomePage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-20 pt-20">
            {/* 1. Trending Lane (With Numbers) */}
            <Suspense fallback={<LaneSkeleton title="Haftanın Trendleri" icon={<Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />} variant="trending" hideBorder={true} />}>
                <TrendingLane
                    title="Haftanın Trendleri"
                    icon={<Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />}
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
                    params={{ pageSize: 12, sortOrder: 'rating_desc', revalidate: 600 }} // 10 minutes cache
                />
            </Suspense>

            {/* 4. Fantasy Lane */}
            <Suspense fallback={<LaneSkeleton title="Fantastik Dünyalar" icon={<BookOpen className="h-6 w-6 text-blue-500" />} />}>
                <GenericLane
                    title="Fantastik Dünyalar"
                    icon={<BookOpen className="h-6 w-6 text-blue-500" />}
                    params={{ pageSize: 12, tags: ['Fantastik'], revalidate: 600 }} // 10 minutes cache
                />
            </Suspense>
        </div>
    );
}
