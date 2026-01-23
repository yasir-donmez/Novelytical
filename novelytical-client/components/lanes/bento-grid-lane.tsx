import { fetchNovels } from '@/lib/data/novels';
import { NovelCard } from '@/components/novel-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming utils exists
import { BentoLaneSkeleton } from './bento-lane-skeleton';
import type { NovelListDto } from '@/types/novel';

interface BentoGridLaneProps {
    title: string;
    icon?: React.ReactNode;
}

export async function BentoGridLane({ title, icon }: BentoGridLaneProps) {
    let novels: NovelListDto[] = [];
    try {
        const res = await fetchNovels({ pageSize: 7, sortOrder: 'date_desc', revalidate: 3600 });
        novels = res.data?.slice(0, 7) || [];
    } catch (error) {
        console.error(`Failed to fetch Bento Grid Lane:`, error);
        // Show skeleton instead of error message - better UX
        return <BentoLaneSkeleton title={title} icon={icon} />;
    }

    if (novels.length === 0) {
        // Show skeleton instead of empty state - user thinks data is loading
        return <BentoLaneSkeleton title={title} icon={icon} />;
    }

    return (
        <section className="space-y-4 mt-12 pt-8 border-t border-white/5 min-h-[750px]">
            <div className="flex items-center justify-between px-1 mb-6">
                <div className="flex items-center gap-4 select-none">
                    {icon && (
                        <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                            {icon}
                        </div>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">{title}</h2>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1 hover:text-primary" asChild>
                    <Link href="/romanlar?sort=date_desc">
                        Tümünü Gör <ChevronRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 h-auto lg:h-[650px]">
                {novels.map((novel, i) => (
                    <div
                        key={novel.id}
                        className={cn(
                            "relative group rounded-xl overflow-hidden",
                            // Mobile: First item 2-col wide (full width)
                            // Tablet (sm): First item 1-col (regular) OR keep as featured? Let's keep it featured but adapt
                            // Desktop (lg): First item 2x2 featured

                            i === 0
                                ? "col-span-2 row-span-2 aspect-[16/9] sm:aspect-auto sm:col-span-1 lg:col-span-2 lg:row-span-2 lg:aspect-auto"
                                : "col-span-1 row-span-1 aspect-[2/3] sm:aspect-auto"
                        )}
                    >
                        <NovelCard
                            novel={novel}
                            aspect="auto"
                            className="h-full w-full"
                            showLastUpdated={true}
                        />
                    </div>
                ))}
            </div>
        </section>
    )
}
