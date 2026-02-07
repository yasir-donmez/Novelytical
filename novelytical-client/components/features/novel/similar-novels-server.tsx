import { getSimilarNovels } from '@/lib/data/novels';
import { NovelCard } from '@/components/features/novel/novel-card';
import { ScrollableSection } from '@/components/layout/scrollable-section';
import { NovelListDto } from '@/types/novel';

export async function SimilarNovelsServer({ id }: { id: number | string }) {
    // Fetch 12 similar novels (double the previous limit)
    const novels = await getSimilarNovels(id, 12);

    if (!novels || novels.length === 0) return null;

    return (
        <div className="pb-8">
            <ScrollableSection
                title={
                    <span className="flex items-center gap-3">
                        Benzer Romanlar
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                            🤖 AI Powered
                        </span>
                    </span>
                }
            >
                {novels.map((novel: NovelListDto) => (
                    <div
                        key={novel.id}
                        className="w-full md:w-40 lg:w-[calc((100%-5rem)/6)] flex-shrink-0 snap-center md:snap-start flex flex-col"
                    >
                        {/* console.log(`Novel: ${novel.title}, ID: ${novel.id}, Rating: ${novel.rating}, Scraped: ${novel.scrapedRating}`) */}
                        <NovelCard
                            novel={novel}
                            className="flex-grow h-full"
                            showLastUpdated={false}
                        />
                    </div>
                ))}
            </ScrollableSection>
        </div>
    );
}
