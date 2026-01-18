'use client';

import { NovelCard } from '@/components/novel-card';
import type { NovelListDto } from '@/types/novel';

interface RankedNovelGridProps {
    novels: NovelListDto[];
    sortOrder?: string;
}

export function RankedNovelGrid({ novels, sortOrder }: RankedNovelGridProps) {
    // console.log('RankedNovelGrid sortOrder:', sortOrder, 'showLastUpdated:', sortOrder === 'date_desc');

    // Backend now handles all rank calculation (syncing data from Firestore to PostgreSQL)
    // Just render the novels in the order received from backend
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6">
            {novels.map((novel) => (
                <NovelCard
                    key={novel.id}
                    novel={novel}
                    showLastUpdated={sortOrder === 'date_desc'}
                />
            ))}
        </div>
    );
}
