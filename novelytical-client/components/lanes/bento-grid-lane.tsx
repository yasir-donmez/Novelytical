import { fetchNovels } from '@/lib/data/novels';
import { NovelCard } from '@/components/novel-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming utils exists

interface BentoGridLaneProps {
    title: string;
    icon?: React.ReactNode;
}

export async function BentoGridLane({ title, icon }: BentoGridLaneProps) {
    const res = await fetchNovels({ pageSize: 7, sortOrder: 'created_desc' });
    const novels = res.data || [];

    if (novels.length === 0) return null;

    return (
        <section className="space-y-4 py-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                        {icon}
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1 hover:text-primary" asChild>
                    <Link href="/kesfet?sort=newest">
                        Tümünü Gör <ChevronRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 h-[650px]">
                {novels.map((novel: any, i: number) => (
                    <div
                        key={novel.id}
                        className={cn(
                            "relative group rounded-xl overflow-hidden",
                            i === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1"
                        )}
                    >
                        <NovelCard
                            novel={novel}
                            aspect="auto"
                            className="h-full w-full"
                        />
                    </div>
                ))}
            </div>
        </section>
    )
}
