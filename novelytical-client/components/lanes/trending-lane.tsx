import { ScrollableSection } from '@/components/layout/scrollable-section';
import { NovelCard } from '@/components/features/novel/novel-card';
import { fetchNovels } from '@/lib/data/novels';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { LaneSkeleton } from './lane-skeleton';
import type { NovelListDto } from '@/types/novel';

interface TrendingLaneProps {
    title: string;
    icon?: React.ReactNode;
    className?: string;
}

export async function TrendingLane({ title, icon, className }: TrendingLaneProps) {
    let novels: NovelListDto[] = [];
    try {
        const res = await fetchNovels({ pageSize: 10, sortOrder: 'rank_desc', revalidate: 3600 });
        novels = res.data || [];
    } catch (error) {
        console.error(`Failed to fetch Trending Lane:`, error);
        return <LaneSkeleton title={title} icon={icon} variant="trending" hideBorder={true} />;
    }

    if (novels.length === 0) {
        return <LaneSkeleton title={title} icon={icon} variant="trending" hideBorder={true} />;
    }

    return (
        <ScrollableSection
            title={title}
            icon={icon}
            hideBorder={true}
            sectionClassName={className}
            scrollStep="full"
            hideGradients={true}
            headerAction={
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1 hover:text-primary" asChild>
                    <Link href="/romanlar?sort=rank_desc">
                        Tümünü Gör <ChevronRight className="h-4 w-4" />
                    </Link>
                </Button>
            }
        >
            {novels.map((novel, index) => (
                <div key={novel.id} className="relative w-full md:w-40 lg:w-[calc((102.5%-5rem)/5)] flex-shrink-0 snap-center md:snap-start flex flex-col group/rank">
                    {/* Glass Outline Number - Behind Card */}
                    <div
                        className="absolute -left-2 bottom-4 z-0 font-black text-[9rem] leading-none select-none pointer-events-none 
                        transition-all duration-500 ease-out
                        group-hover/rank:-translate-x-2 group-hover/rank:-translate-y-2
                        [--stroke-width:2px] [--stroke-opacity:0.15]
                        group-hover/rank:[--stroke-width:4px] group-hover/rank:[--stroke-opacity:0.25]"
                        style={{
                            fontFamily: 'Impact, sans-serif',
                            color: 'transparent',
                            WebkitTextStroke: 'var(--stroke-width) rgba(255, 255, 255, var(--stroke-opacity))',
                            textShadow: `
                                0 0 10px rgba(255, 255, 255, 0.1),
                                0 0 20px rgba(255, 255, 255, 0.05)
                            `,
                        }}>
                        {index + 1}
                    </div>

                    {/* Novel Card - In Front */}
                    <div className="relative z-10 h-full flex flex-col pl-8 pr-4 transform transition-transform duration-500 ease-out 
                        md:group-hover/rank:translate-x-4 md:group-hover/rank:-translate-y-2">
                        <NovelCard novel={novel} aspect="portrait" className="flex-grow h-full" showLastUpdated={false} />
                    </div>
                </div>
            ))}
        </ScrollableSection>
    );
}
