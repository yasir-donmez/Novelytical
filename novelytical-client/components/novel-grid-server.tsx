import { fetchNovels } from '@/lib/data/novels';
import { NovelCard } from '@/components/novel-card';
import { EmptyState } from '@/components/empty-state';
import { FilterControls } from '@/components/filter-controls';
import { PaginationClient } from '@/components/pagination-client';

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
            pageSize: 20,
            minChapters,
            maxChapters,
            minRating,
            maxRating
        });
    } catch (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive text-lg">
                    Romanlar yüklenirken bir hata oluştu.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                    {(error as Error).message}
                </p>
            </div>
        );
    }

    if (data.data.length === 0) {
        return (
            <>
                <FilterControls totalRecords={0} searchString={searchString} />

                <div className="mt-8">
                    <EmptyState
                        title="Roman Bulunamadı 🐲"
                        description={searchString
                            ? `"${searchString}" aramasıyla eşleşen bir hikaye bulamadık.`
                            : "Bu kategoride henüz roman eklenmemiş olabilir."}
                        icon="search"
                        // We can't pass a function to Client component that uses router from Server component easily if it's just for navigation
                        // But EmptyState uses an action.
                        // We can pass a "reset" link or let the EmptyState handle it if it was a client component.
                        // For now, let's look at EmptyState. Ideally it should be Client Component if it handles interactions.
                        // Assuming EmptyState is a client component or reusable UI. 
                        // To keep it simple, we might need to update EmptyState or wrap it.
                        // Actually, for now let's use a simpler version or just omit the action if complex,
                        // but the original code had a clear button.
                        // Let's assume user finds "Clear Filters" button in FilterControls or SearchBar sufficient.
                        // Or we can simple put a "Reset" link.
                        actionLabel="Filtreleri Temizle"
                        href="/romanlar" // Reset to novels page
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <FilterControls totalRecords={data.totalRecords} searchString={searchString} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6">
                {data.data.map((novel: any) => (
                    <NovelCard
                        key={novel.id}
                        novel={novel}
                    />
                ))}
            </div>

            <PaginationClient
                totalPages={data.totalPages}
                currentPage={pageNumber || 1}
                pageSize={data.pageSize}
                totalRecords={data.totalRecords}
            />
        </>
    );
}
