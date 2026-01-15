import { Suspense } from 'react';
import { NovelCardSkeleton } from '@/components/novel-card-skeleton';
import { SearchBar } from '@/components/search-bar';
import { NovelGridServer } from '@/components/novel-grid-server';
import { HomeTags } from '@/components/home-tags';

export const experimental_ppr = true;

/**
 * Loading fallback for the novel grid
 */
function NovelGridFallback() {
    return (
        <div>
            {/* Filter Layout Skeleton */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                {/* Total Count Text Skeleton */}
                <div className="h-7 w-32 bg-muted/50 rounded-md animate-pulse" />

                {/* Filter Buttons Skeleton */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="h-10 w-28 bg-muted/50 rounded-md animate-pulse" /> {/* Category Button */}
                    <div className="h-10 w-28 bg-muted/50 rounded-md animate-pulse" /> {/* Advanced Filter Button */}
                    <div className="h-10 w-40 bg-muted/50 rounded-md animate-pulse" /> {/* Sort Select */}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6">
                {Array.from({ length: 15 }).map((_, i) => (
                    <NovelCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

export default async function NovelsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;

    const searchString = typeof params.q === 'string' ? params.q : undefined;
    const tags = typeof params.tag === 'string' ? [params.tag] : (Array.isArray(params.tag) ? params.tag : undefined);
    const sortOrder = typeof params.sort === 'string' ? params.sort : 'date_desc';
    const pageNumber = typeof params.page === 'string' ? parseInt(params.page) : 1;

    // Advanced filter params
    const minChapters = typeof params.minChapters === 'string' ? parseInt(params.minChapters) : null;
    const maxChapters = typeof params.maxChapters === 'string' ? parseInt(params.maxChapters) : null;
    const minRating = typeof params.minRating === 'string' ? parseFloat(params.minRating) : null;
    const maxRating = typeof params.maxRating === 'string' ? parseFloat(params.maxRating) : null;

    return (
        <div className="min-h-screen bg-background">
            {/* Header Section */}
            <section className="relative overflow-hidden border-b bg-background/50">
                <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                    <div className="max-w-4xl mx-auto text-center space-y-6">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                            Kütüphane & Arşiv
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Binlerce roman arasında arama yapın, filtreleyin ve yeni dünyalar keşfedin.
                        </p>

                        {/* Search Bar */}
                        <div className="mt-8 max-w-2xl mx-auto">
                            <SearchBar />
                        </div>

                        {/* Selected Tags */}
                        <div className="max-w-6xl mx-auto -mt-4">
                            <HomeTags />
                        </div>
                    </div>
                </div>
            </section>

            {/* Novel Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            </section>
        </div>
    );
}
