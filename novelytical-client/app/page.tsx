
import { Suspense } from 'react';
import { HeroServer } from '@/components/hero-server';
import { HomeTags } from '@/components/home-tags';
import { NovelGridServer } from '@/components/novel-grid-server';
import { CommunityPulse } from '@/components/community-section/community-pulse';
import { HeroSkeleton } from '@/components/hero-skeleton';
import { NovelGridSkeleton } from '@/components/novel-grid-skeleton';

export const runtime = 'nodejs';
// export const dynamic = 'force-dynamic'; // Keeping standard caching unless necessary

export default async function HomePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedSearchParams = await searchParams;

    // Parse search params for NovelGrid
    const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
    const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'views_desc';
    const query = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
    const tagsParam = typeof resolvedSearchParams.tags === 'string' ? resolvedSearchParams.tags.split(',') : undefined;

    return (
        <main className="min-h-screen bg-background">
            {/* Hero Section */}
            <Suspense fallback={<HeroSkeleton />}>
                <HeroServer />
            </Suspense>

            <div className="container mx-auto px-4 py-8 space-y-12">
                {/* Tags & Filters */}
                <section>
                    <HomeTags />
                </section>

                {/* Community Pulse */}
                <section>
                    <CommunityPulse />
                </section>

                {/* Main Novel Grid */}
                <section id="romanlar" className="scroll-mt-20">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold tracking-tight">
                            Tüm Romanlar
                        </h2>
                    </div>
                    <Suspense fallback={<NovelGridSkeleton />}>
                        <NovelGridServer
                            pageNumber={page}
                            sortOrder={sort}
                            searchString={query}
                            tags={tagsParam}
                        />
                    </Suspense>
                </section>
            </div>
        </main>
    );
}
