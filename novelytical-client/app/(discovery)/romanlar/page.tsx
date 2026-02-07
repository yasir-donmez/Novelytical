import { Suspense } from 'react';
import { NovelGridServer } from '@/components/features/novel/novel-grid-server';
import { Library } from 'lucide-react';
import { NovelGridSkeleton } from '@/components/features/novel/novel-grid-skeleton';
import { HomeTags } from '@/components/features/novel/home-tags';

function NovelGridFallback() {
    return <NovelGridSkeleton />;
}

export default async function RomanlarPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;

    const searchString = typeof params.q === 'string' ? params.q : undefined;
    const tags = typeof params.tag === 'string' ? [params.tag] : (Array.isArray(params.tag) ? params.tag : undefined);
    const sortOrder = typeof params.sort === 'string' ? params.sort : 'rank_desc';
    const pageNumber = typeof params.page === 'string' ? parseInt(params.page) : 1;

    const minChapters = typeof params.minChapters === 'string' ? parseInt(params.minChapters) : null;
    const maxChapters = typeof params.maxChapters === 'string' ? parseInt(params.maxChapters) : null;
    const minRating = typeof params.minRating === 'string' ? parseFloat(params.minRating) : null;
    const maxRating = typeof params.maxRating === 'string' ? parseFloat(params.maxRating) : null;

    return (
        <div className="space-y-4 min-h-screen -mt-20 relative z-10">
            {/* Visual Anchor Header - Matches Home Page Design */}
            <div className="relative z-10 py-4 mb-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                        <Library className="h-6 w-6 text-blue-500 fill-blue-500/20" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">
                        Kütüphane & Arşiv
                    </h2>
                </div>
            </div>

            {/* Tags Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                <Suspense fallback={
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
                }>
                    <HomeTags />
                </Suspense>
            </div>

            {/* Novel Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <Suspense fallback={<NovelGridFallback />}>
                    <NovelGridServer
                        searchString={searchString}
                        tags={tags}
                        sortOrder={sortOrder}
                        pageNumber={pageNumber}
                        minChapters={minChapters}
                        maxChapters={maxChapters}
                        minRating={minRating}
                        maxRating={maxRating}
                    />
                </Suspense>
            </div>
        </div>
    );
}
