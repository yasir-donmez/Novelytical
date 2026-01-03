'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { NovelCard } from '@/components/novel-card';
import { EmptyState } from '@/components/empty-state';
import { FilterControls } from '@/components/filter-controls';
import { PaginationClient } from '@/components/pagination-client';
import { NovelCardSkeleton } from '@/components/novel-card-skeleton';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function NovelGridClient() {
    const searchParams = useSearchParams();

    const searchString = searchParams.get('q') || undefined;
    const tags = searchParams.getAll('tag');
    const sortOrder = searchParams.get('sort') || undefined;
    const pageNumber = parseInt(searchParams.get('page') || '1');
    const minChapters = searchParams.get('minChapters') ? parseInt(searchParams.get('minChapters')!) : null;
    const maxChapters = searchParams.get('maxChapters') ? parseInt(searchParams.get('maxChapters')!) : null;
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null;
    const maxRating = searchParams.get('maxRating') ? parseFloat(searchParams.get('maxRating')!) : null;

    const { data, isLoading, error } = useQuery({
        queryKey: ['novels', searchString, tags, sortOrder, pageNumber, minChapters, maxChapters, minRating, maxRating],
        queryFn: async () => {
            const queryParams = new URLSearchParams();

            if (searchString) queryParams.append('searchString', searchString);
            if (tags) tags.forEach(tag => queryParams.append('tag', tag));
            if (sortOrder) queryParams.append('sortOrder', sortOrder);
            if (pageNumber) queryParams.append('pageNumber', pageNumber.toString());
            queryParams.append('pageSize', '20');

            if (minChapters !== null) queryParams.append('minChapters', minChapters.toString());
            if (maxChapters !== null) queryParams.append('maxChapters', maxChapters.toString());
            if (minRating !== null) queryParams.append('minRating', minRating.toString());
            if (maxRating !== null) queryParams.append('maxRating', maxRating.toString());

            const response = await api.get(`http://localhost:5050/api/novels?${queryParams.toString()}`);
            return response.data;
        },
        retry: 1,
        staleTime: 60000, // 1 minute
    });

    // Show toast on error
    useEffect(() => {
        if (error) {
            const err = error as any;
            if (!err.response) {
                toast.error('Bağlantı hatası', {
                    description: 'Backend sunucusuna bağlanılamıyor. Lütfen backend\'in çalıştığından emin olun.',
                    duration: 5000,
                });
            } else if (err.response?.status >= 500) {
                toast.error('Sunucu hatası', {
                    description: 'Lütfen daha sonra tekrar deneyin.',
                    duration: 5000,
                });
            }
        }
    }, [error]);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <NovelCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-12">
                    <p className="text-destructive text-lg">
                        Romanlar yüklenirken bir hata oluştu. Backend çalışıyor mu?
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        {(error as Error).message}
                    </p>
                </div>
            </div>
        );
    }

    const novels = data?.data || [];
    const totalRecords = data?.totalRecords || 0;
    const totalPages = data?.totalPages || 0;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <FilterControls totalRecords={totalRecords} searchString={searchString} />

            {novels.length === 0 ? (
                <EmptyState
                    title="Roman Bulunamadı"
                    description={searchString ? `"${searchString}" araması için sonuç bulunamadı.` : "Seçilen filtrelere uygun roman bulunamadı."}
                    icon="search"
                />
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6">
                        {novels.map((novel: any) => (
                            <NovelCard key={novel.id} novel={novel} />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-8">
                            <PaginationClient
                                currentPage={pageNumber}
                                totalPages={totalPages}
                                pageSize={20}
                                totalRecords={totalRecords}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
