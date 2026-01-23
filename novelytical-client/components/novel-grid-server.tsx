import { fetchNovels } from '@/lib/data/novels';
import { RankedNovelGrid } from '@/components/ranked-novel-grid';
import { EmptyState } from '@/components/empty-state';
import { FilterControls } from '@/components/filter-controls';
import { PaginationClient } from '@/components/pagination-client';
import { NovelGridSkeleton } from '@/components/novel-grid-skeleton';

// Note: This is an async Server Component
export async function NovelGridServer({
    searchString,
    tags,
    sortOrder,
    pageNumber,
    minChapters,
    maxChapters,
    minRating,
    maxRating
}: {
    searchString?: string,
    tags?: string[],
    sortOrder?: string,
    pageNumber?: number,
    minChapters?: number | null,
    maxChapters?: number | null,
    minRating?: number | null,
    maxRating?: number | null
}) {

    // Server-side data fetching
    let data;
    try {
        data = await fetchNovels({
            searchString,
            tags,
            sortOrder,
            pageNumber: pageNumber || 1,
            pageSize: 24,
            minChapters,
            maxChapters,
            minRating,
            maxRating
        });
    } catch (error) {
        // Show skeleton instead of error message - better UX
        return <NovelGridSkeleton />;
    }

    if (data.data.length === 0) {
        // Show skeleton instead of empty state - user thinks data is loading
        return <NovelGridSkeleton />;
    }

    return (
        <>
            <FilterControls totalRecords={data.totalRecords} searchString={searchString} />

            <RankedNovelGrid novels={data.data} sortOrder={sortOrder} />

            <PaginationClient
                totalPages={data.totalPages}
                currentPage={pageNumber || 1}
                pageSize={data.pageSize}
                totalRecords={data.totalRecords}
            />
        </>
    );
}
