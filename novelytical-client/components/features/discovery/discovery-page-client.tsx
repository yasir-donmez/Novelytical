'use client';

import { Suspense } from 'react';
import { Flame, Sparkles, Trophy, BookOpen } from 'lucide-react';
import { useUnifiedDiscovery } from '@/hooks/useUnifiedDiscovery';
import { ScrollableSection } from '@/components/layout/scrollable-section';
import { NovelCard } from '@/components/features/novel/novel-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { LaneSkeleton } from '@/components/lanes/lane-skeleton';
import { BentoLaneSkeleton } from '@/components/lanes/bento-lane-skeleton';
import { cn } from '@/lib/utils';
import type { NovelListDto } from '@/types/novel';
import type { NovelSummary } from '@/lib/data/discovery';

/**
 * NovelSummary'yi NovelListDto'ya dönüştürür
 */
function transformNovelSummaryToDto(novel: NovelSummary): NovelListDto {
    return {
        id: parseInt(novel.id),
        slug: novel.id,
        title: novel.title,
        author: novel.author,
        coverUrl: novel.coverUrl,
        rating: novel.rating,
        viewCount: novel.viewCount,
        chapterCount: novel.chapterCount,
        lastUpdated: novel.lastUpdated.toISOString(),
        rankPosition: novel.rank,
        tags: novel.tags || novel.categories || []
    };
}

/**
 * Optimized Discovery Page Client Component
 * 
 * Uses unified discovery endpoint to reduce Firebase reads from 4 to 1
 * Implements multi-layered caching for improved performance
 */
export function DiscoveryPageClient() {
    const { data, loading, error, performance } = useUnifiedDiscovery({
        variant: 'default',
        limits: {
            trending: 10,
            newArrivals: 7,
            editorsPick: 12,
            categorySpecific: 12
        },
        timeRanges: {
            trending: 'weekly',
            newArrivals: 30
        },
        cacheOptions: {
            maxAge: 3600, // 60 minutes cache
            staleWhileRevalidate: true
        },
        preferences: {
            favoriteCategories: ['Fantastik']
        }
    });

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-20 pt-20">
                <LaneSkeleton title="Haftanın Trendleri" icon={<Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />} variant="trending" hideBorder={true} />
                <BentoLaneSkeleton title="Son Güncellenenler" icon={<Sparkles className="h-6 w-6 text-yellow-400 fill-yellow-400/20" />} />
                <LaneSkeleton title="Editörün Seçimi" icon={<Trophy className="h-6 w-6 text-purple-500 fill-purple-500/20" />} />
                <LaneSkeleton title="Fantastik Dünyalar" icon={<BookOpen className="h-6 w-6 text-blue-500" />} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Keşif Verisi Yüklenemedi</h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()}>Tekrar Dene</Button>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-muted-foreground">Veri Bulunamadı</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-20 pt-20">
            {/* Performance Debug Info (Development Only) */}
            {process.env.NODE_ENV === 'development' && performance && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">🚀 Firebase Optimizasyon Metrikleri</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-green-600 dark:text-green-400 font-medium">Yanıt Süresi:</span>
                            <div className="font-mono">{performance.responseTime}ms</div>
                        </div>
                        <div>
                            <span className="text-green-600 dark:text-green-400 font-medium">Cache Hit:</span>
                            <div className="font-mono">{performance.cacheHit ? '✅ Evet' : '❌ Hayır'}</div>
                        </div>
                        <div>
                            <span className="text-green-600 dark:text-green-400 font-medium">Optimizasyon:</span>
                            <div className="font-mono">{performance.optimizationRatio.toFixed(1)}%</div>
                        </div>
                        <div>
                            <span className="text-green-600 dark:text-green-400 font-medium">Firebase Reads:</span>
                            <div className="font-mono">{performance.totalReads}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Trending Lane (With Numbers) */}
            {data.data.trending && data.data.trending.novels.length > 0 && (
                <TrendingLaneOptimized
                    title="Haftanın Trendleri"
                    icon={<Flame className="h-6 w-6 text-orange-500 fill-orange-500/20" />}
                    novels={data.data.trending.novels}
                />
            )}

            {/* 2. New Arrivals Lane */}
            {data.data.newArrivals && data.data.newArrivals.novels.length > 0 && (
                <BentoGridLaneOptimized
                    title="Son Güncellenenler"
                    icon={<Sparkles className="h-6 w-6 text-yellow-400 fill-yellow-400/20" />}
                    novels={data.data.newArrivals.novels}
                />
            )}

            {/* 3. Editor's Choice Lane */}
            {data.data.editorsPick && data.data.editorsPick.novels.length > 0 && (
                <GenericLaneOptimized
                    title="Editörün Seçimi"
                    icon={<Trophy className="h-6 w-6 text-purple-500 fill-purple-500/20" />}
                    novels={data.data.editorsPick.novels}
                />
            )}

            {/* 4. Fantasy Lane */}
            {data.data.fantasyNovels && data.data.fantasyNovels.novels.length > 0 && (
                <GenericLaneOptimized
                    title="Fantastik Dünyalar"
                    icon={<BookOpen className="h-6 w-6 text-blue-500" />}
                    novels={data.data.fantasyNovels.novels}
                />
            )}
        </div>
    );
}

/**
 * Optimized Trending Lane Component
 * Uses pre-fetched data instead of making separate API calls
 */
interface TrendingLaneOptimizedProps {
    title: string;
    icon?: React.ReactNode;
    novels: NovelSummary[];
}

function TrendingLaneOptimized({ title, icon, novels }: TrendingLaneOptimizedProps) {
    const novelDtos = novels.map(transformNovelSummaryToDto);
    return (
        <ScrollableSection
            title={title}
            icon={icon}
            hideBorder={true}
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
            {novelDtos.map((novel, index) => (
                <div key={novel.id} className="relative w-[210px] sm:w-[230px] flex-none group/rank">
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
                        <NovelCard novel={novel} aspect="portrait" className="h-full" showLastUpdated={false} />
                    </div>
                </div>
            ))}
        </ScrollableSection>
    );
}

/**
 * Optimized Generic Lane Component
 * Uses pre-fetched data instead of making separate API calls
 */
interface GenericLaneOptimizedProps {
    title: string;
    icon?: React.ReactNode;
    novels: NovelSummary[];
}

function GenericLaneOptimized({ title, icon, novels }: GenericLaneOptimizedProps) {
    const novelDtos = novels.map(transformNovelSummaryToDto);
    return (
        <ScrollableSection title={title} icon={icon}>
            {novelDtos.map((novel) => (
                <div key={novel.id} className="w-[160px] sm:w-[200px] flex-none">
                    <NovelCard novel={novel} aspect="portrait" showLastUpdated={false} />
                </div>
            ))}
        </ScrollableSection>
    );
}

/**
 * Optimized Bento Grid Lane Component
 * Uses pre-fetched data instead of making separate API calls
 */
interface BentoGridLaneOptimizedProps {
    title: string;
    icon?: React.ReactNode;
    novels: NovelSummary[];
}

function BentoGridLaneOptimized({ title, icon, novels }: BentoGridLaneOptimizedProps) {
    const novelDtos = novels.map(transformNovelSummaryToDto);
    const displayNovels = novelDtos.slice(0, 7);

    return (
        <section className="space-y-4 mt-12 pt-8 border-t border-white/5">
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
                {displayNovels.map((novel, i) => (
                    <div
                        key={novel.id}
                        className={cn(
                            "relative group rounded-xl overflow-hidden",
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
    );
}