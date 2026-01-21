import { ScrollableSection } from '@/components/scrollable-section';
import { NovelCard } from '@/components/novel-card';
import { fetchNovels, type FetchNovelsParams } from '@/lib/data/novels';
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
        return null;
    }

    if (novels.length === 0) return null;

    return (
        <ScrollableSection title={title} icon={icon}>
            {novels.map((novel) => (
                <div key={novel.id} className="w-[160px] sm:w-[200px] flex-none">
                    <NovelCard novel={novel} aspect="portrait" showLastUpdated={false} />
                </div>
            ))}
        </ScrollableSection>
    );
}
