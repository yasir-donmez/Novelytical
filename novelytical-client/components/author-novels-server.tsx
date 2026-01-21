import { Suspense } from 'react';
import { getNovelsByAuthor } from '@/lib/data/novels';
import { NovelCard } from '@/components/novel-card';
import { ScrollableSection } from '@/components/scrollable-section';
import { NovelCardSkeleton } from '@/components/novel-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import type { NovelListDto } from '@/types/novel';

export async function AuthorNovelsServer({ author, currentNovelId }: { author: string, currentNovelId: number | string }) {
    // We can fetch data here
    // Fetch up to 50 novels by the same author to show "all" of them
    const novels = await getNovelsByAuthor(author, currentNovelId, 50);

    if (!novels || novels.length === 0) return null;

    return (
        <ScrollableSection title={`${author}'ın Diğer Romanları`}>
            {novels.map((novel: NovelListDto) => (
                <div
                    key={novel.id}
                    className="w-full md:w-40 lg:w-[calc((100%-6.25rem)/6)] flex-shrink-0 snap-center md:snap-start flex flex-col"
                >
                    <NovelCard
                        novel={novel}
                        className="flex-grow h-full"
                        showLastUpdated={false}
                    />
                </div>
            ))}
        </ScrollableSection>
    );
}
