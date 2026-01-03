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

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;

  const searchString = typeof params.q === 'string' ? params.q : undefined;
  const tags = typeof params.tag === 'string' ? [params.tag] : (Array.isArray(params.tag) ? params.tag : undefined);
  const sortOrder = typeof params.sort === 'string' ? params.sort : undefined;
  const pageNumber = typeof params.page === 'string' ? parseInt(params.page) : 1;

  // Advanced filter params
  const minChapters = typeof params.minChapters === 'string' ? parseInt(params.minChapters) : null;
  const maxChapters = typeof params.maxChapters === 'string' ? parseInt(params.maxChapters) : null;
  const minRating = typeof params.minRating === 'string' ? parseFloat(params.minRating) : null;
  const maxRating = typeof params.maxRating === 'string' ? parseFloat(params.maxRating) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Static Part */}
      <section className="relative overflow-hidden border-b bg-background/50">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500/30 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500/30 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-gradient">
                Novelytical
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Yapay zeka ile roman keşfet
            </p>

            {/* Search Bar */}
            <div className="mt-8">
              <SearchBar />
            </div>
          </div>

          {/* Category Tags - Full Width */}
          <div className="mt-10">
            <HomeTags />
          </div>
        </div>
      </section>

      {/* Novel Grid - Dynamic Part */}
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
