import { ScrollableSection } from '@/components/scrollable-section';
import { NovelCard } from '@/components/novel-card';
import { fetchNovels } from '@/lib/data/novels';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface TrendingLaneProps {
    title: string;
    icon?: React.ReactNode;
}

export async function TrendingLane({ title, icon }: TrendingLaneProps) {
    let novels = [];
    try {
        const res = await fetchNovels({ pageSize: 10, sortOrder: 'rank_desc' });
        novels = res.data || [];
    } catch (error) {
        console.error(`Failed to fetch Trending Lane:`, error);
        return null;
    }

    if (novels.length === 0) return null;

    return (
        <ScrollableSection
            title={title}
            icon={icon}
            hideBorder={true}
            headerAction={
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1 hover:text-primary" asChild>
                    <Link href="/romanlar?sort=rank_desc">
                        Tümünü Gör <ChevronRight className="h-4 w-4" />
                    </Link>
                </Button>
            }
        >
            {novels.map((novel: any, index: number) => (
                <div key={novel.id} className="relative w-[210px] sm:w-[250px] flex-none group/rank">
                    {/* Big Ranking Number */}
                    <div className="absolute -left-2 bottom-4 z-10 font-bold text-[9rem] leading-none select-none pointer-events-none drop-shadow-md transition-all duration-300
                        text-transparent bg-clip-text
                        bg-gradient-to-b from-neutral-800 to-neutral-800/10 dark:from-neutral-200 dark:to-neutral-200/10
                        [-webkit-text-stroke:2px_rgba(0,0,0,0.5)] dark:[-webkit-text-stroke:2px_rgba(255,255,255,0.5)]"
                        style={{
                            fontFamily: 'Impact, sans-serif'
                        }}>
                        {index + 1}
                    </div>

                    {/* Novel Card */}
                    <div className="relative z-20 h-full flex flex-col pl-8 pr-4 transform transition-transform duration-500 ease-out md:group-hover/rank:translate-x-4 md:group-hover/rank:-translate-y-2">
                        <NovelCard novel={novel} aspect="portrait" className="h-full" />
                    </div>
                </div>
            ))}
        </ScrollableSection>

    );
}
