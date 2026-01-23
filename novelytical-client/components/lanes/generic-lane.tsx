import { ScrollableSection } from '@/components/scrollable-section';
import { NovelCard } from '@/components/novel-card';
import { fetchNovels, type FetchNovelsParams } from '@/lib/data/novels';
import { LaneSkeleton } from './lane-skeleton';
import type { NovelListDto } from '@/types/novel';

interface GenericLaneProps {
    title: string;
    icon?: React.ReactNode;
    params: FetchNovelsParams;
}

export async function GenericLane({ title, icon, params }: GenericLaneProps) {
    let novels: NovelListDto[] = [];
    try {
        const res = await fetchNovels(params);
        novels = res.data || [];
    } catch (error) {
        console.error(`Failed to fetch lane ${title}:`, error);
        // Show skeleton instead of error message - better UX
        return <LaneSkeleton title={title} icon={icon} />;
    }

    if (novels.length === 0) {
        // Show skeleton instead of empty state - user thinks data is loading
        return <LaneSkeleton title={title} icon={icon} />;
    }

    return (
        <ScrollableSection title={title} icon={icon}>
            {novels.map((novel) => (
                <div key={novel.id} className="w-full md:w-40 lg:w-[calc((100%-5rem)/6)] flex-shrink-0 snap-center md:snap-start flex flex-col">
                    <NovelCard novel={novel} aspect="portrait" showLastUpdated={false} className="flex-grow h-full" />
                </div>
            ))}
        </ScrollableSection>
    );
}
