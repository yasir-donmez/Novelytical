'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CategoryModal } from '@/components/category-modal';
import { AdvancedFiltersModal } from '@/components/advanced-filters-modal';
import { SortSelect } from '@/components/sort-select';

export function FilterControls({ totalRecords, searchString }: { totalRecords?: number, searchString?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tagFilters = searchParams.getAll('tag');
    const sortOrder = searchParams.get('sort') || 'rank_desc';

    // Advanced filter params
    const minChapters = searchParams.get('minChapters') ? Number(searchParams.get('minChapters')) : null;
    const maxChapters = searchParams.get('maxChapters') ? Number(searchParams.get('maxChapters')) : null;
    const minRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : null;
    const maxRating = searchParams.get('maxRating') ? Number(searchParams.get('maxRating')) : null;

    const updateParams = (newParams: URLSearchParams) => {
        // Reset page on filter change
        newParams.set('page', '1');
        router.push(`${pathname}?${newParams.toString()}`);
    };

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm font-medium text-muted-foreground animate-in fade-in duration-500">
                    {totalRecords !== undefined && (
                        <>
                            <span key={totalRecords} className="text-lg font-bold text-primary inline-block animate-in fade-in slide-in-from-bottom-2 duration-300">{totalRecords}</span>
                            {' '}roman bulundu
                        </>
                    )}
                    {searchString && (
                        <span className="inline-block ml-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            "{searchString}"
                        </span>
                    )}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Category Modal Filter */}
                    <CategoryModal
                        selectedTags={tagFilters}
                        onChange={(newTags) => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete('tag'); // Clear existing
                            newTags.forEach(t => params.append('tag', t)); // Add all current
                            updateParams(params);
                        }}
                    />

                    {/* Advanced Filters Modal */}
                    <AdvancedFiltersModal
                        minChapters={minChapters}
                        maxChapters={maxChapters}
                        minRating={minRating}
                        maxRating={maxRating}
                        onApply={(filters) => {
                            const params = new URLSearchParams(searchParams.toString());

                            // Remove existing filter params
                            params.delete('minChapters');
                            params.delete('maxChapters');
                            params.delete('minRating');
                            params.delete('maxRating');

                            // Add new filter values
                            if (filters.minChapters !== null) params.set('minChapters', filters.minChapters.toString());
                            if (filters.maxChapters !== null) params.set('maxChapters', filters.maxChapters.toString());
                            if (filters.minRating !== null) params.set('minRating', filters.minRating.toString());
                            if (filters.maxRating !== null) params.set('maxRating', filters.maxRating.toString());

                            updateParams(params);
                        }}
                    />

                    {/* Sort Dropdown */}
                    <SortSelect
                        value={sortOrder}
                        onChange={(value) => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('sort', value);
                            updateParams(params);
                        }}
                    />
                </div>
            </div>


        </>
    );
}
