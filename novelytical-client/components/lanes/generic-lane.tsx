import { ScrollableSection } from '@/components/scrollable-section';
import { NovelCard } from '@/components/novel-card';
import { fetchNovels } from '@/lib/data/novels';

interface GenericLaneProps {
    title: string;
    icon?: React.ReactNode;
    params: any; // fetchNovels params
}

export async function GenericLane({ title, icon, params }: GenericLaneProps) {
    let novels = [];
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
            {novels.map((novel: any) => (
                <div key={novel.id} className="w-[160px] sm:w-[200px] flex-none">
                    <NovelCard novel={novel} aspect="portrait" showLastUpdated={false} />
                </div>
            ))}
        </ScrollableSection>
    );
}
