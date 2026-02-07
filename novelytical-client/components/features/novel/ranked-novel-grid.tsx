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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
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
