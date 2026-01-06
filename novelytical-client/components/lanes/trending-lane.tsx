import { ScrollableSection } from '@/components/scrollable-section';
import { NovelCard } from '@/components/novel-card';
import { fetchNovels } from '@/lib/data/novels';

interface TrendingLaneProps {
    title: string;
    icon?: React.ReactNode;
}

export async function TrendingLane({ title, icon }: TrendingLaneProps) {
    let novels = [];
    try {
        const res = await fetchNovels({ pageSize: 10, sortOrder: 'views_desc' });
        novels = res.data || [];
    } catch (error) {
        console.error(`Failed to fetch Trending Lane:`, error);
        return null;
    }

    if (novels.length === 0) return null;

    return (
        <ScrollableSection title={title} icon={icon} scrollStep="full" className="gap-6 md:gap-8 pl-6 md:pl-10 pr-6 md:pr-0">
            {novels.map((novel: any, index: number) => (
                <div key={novel.id} className="relative w-[210px] sm:w-[250px] flex-none pl-8 pr-4 group/rank">

                    {/* Big Ranking Number */}
                    <div className="absolute -left-2 bottom-4 z-10 font-bold text-[9rem] leading-none text-transparent stroke-text select-none pointer-events-none drop-shadow-md transition-all duration-300 md:group-hover/rank:text-white/10"
                        style={{
                            WebkitTextStroke: '2px rgba(255,255,255,0.1)',
                            backgroundImage: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.05))',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            fontFamily: 'Impact, sans-serif'
                        }}>
                        {index + 1}
                    </div>

                    {/* Novel Card */}
                    <div className="relative z-20 h-full flex flex-col transform transition-transform duration-500 ease-out md:group-hover/rank:translate-x-6 md:group-hover/rank:-translate-y-2">
                        <NovelCard novel={novel} aspect="portrait" className="h-full" />
                    </div>
                </div>
            ))}
        </ScrollableSection>
    );
}
