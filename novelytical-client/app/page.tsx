import { Suspense } from 'react';
import { HeroSection } from '@/components/hero-section';
import HeroSkeleton from '@/components/hero-skeleton';
import { fetchNovels } from '@/lib/data/novels';
import { Flame, Sparkles, Trophy, BookOpen } from 'lucide-react';
import { GenericLane } from '@/components/lanes/generic-lane';
import { TrendingLane } from '@/components/lanes/trending-lane';
import { LaneSkeleton } from '@/components/lanes/lane-skeleton';
import { CommunityPulse } from '@/components/community-section/community-pulse';
import { BentoGridLane } from '@/components/lanes/bento-grid-lane';

export const experimental_ppr = true;

export default async function DiscoveryPage() {
  // 1. Critical Path: Fetch only the Hero content for LCP (Largest Contentful Paint)
  let featuredNovel = null;
  try {
    const featuredRes = await fetchNovels({ pageSize: 1, sortOrder: 'views_desc' });
    featuredNovel = featuredRes.data?.[0] || null;
  } catch (e) {
    console.error("Hero Fetch Failed", e);
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section - Static/Server Fetched Immediately */}
      {featuredNovel ? (
        <HeroSection novel={featuredNovel} />
      ) : (
        <HeroSkeleton />
      )}


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 -mt-64 relative z-20">
        {/* 1. Trending Lane (With Numbers) */}
        <Suspense fallback={<LaneSkeleton title="Haftanın Trendleri" icon={<Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />} />}>
          <TrendingLane
            title="Haftanın Trendleri"
            icon={<Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />}
          />
        </Suspense>

        {/* 2. New Arrivals Lane */}
        <Suspense fallback={<LaneSkeleton title="Yeni Eklenenler" icon={<Sparkles className="h-6 w-6 text-yellow-400 fill-yellow-400/20" />} />}>
          <BentoGridLane
            title="Yeni Eklenenler"
            icon={<Sparkles className="h-6 w-6 text-yellow-400 fill-yellow-400/20" />}
          />
        </Suspense>

        {/* 2.5 Community Pulse - Real Social Activity */}
        <CommunityPulse />

        {/* 3. Editor's Choice Lane */}
        <Suspense fallback={<LaneSkeleton title="Editörün Seçimi" icon={<Trophy className="h-6 w-6 text-purple-500 fill-purple-500/20" />} />}>
          <GenericLane
            title="Editörün Seçimi"
            icon={<Trophy className="h-6 w-6 text-purple-500 fill-purple-500/20" />}
            params={{ pageSize: 12, sortOrder: 'rating_desc' }}
          />
        </Suspense>

        {/* 4. Fantasy Lane */}
        <Suspense fallback={<LaneSkeleton title="Fantastik Dünyalar" icon={<BookOpen className="h-6 w-6 text-blue-500" />} />}>
          <GenericLane
            title="Fantastik Dünyalar"
            icon={<BookOpen className="h-6 w-6 text-blue-500" />}
            params={{ pageSize: 12, tags: ['Fantastik'] }}
          />
        </Suspense>
      </div>
    </div>
  );
}
