'use client';

import { SearchBar } from '@/components/search-bar';
import { ProductionImageLoader } from './production-image-loader';
import type { NovelListDto } from '@/types/novel';

interface HeroSectionProps {
    novels: NovelListDto[];
}

export function HeroSection({ novels }: HeroSectionProps) {
    // We only need enough novels to fill the grid, usually 24 is plenty
    const displayNovels = novels?.slice(0, 24) || [];
    const hasNovels = novels && novels.length > 0;

    return (
        <div className="relative h-[85vh] w-full overflow-hidden">
            {/* 1. Background Collage */}
            <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-0 opacity-60">
                {hasNovels ? (
                    displayNovels.map((novel, i) => (
                        <div key={i} className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800/50 rounded-sm">
                            {(novel.coverUrl) ? (
                                <ProductionImageLoader
                                    src={novel.coverUrl}
                                    alt=""
                                    fill
                                    className="object-cover hover:scale-105 transition-transform duration-700"
                                    sizes="(max-width: 768px) 33vw, 16vw"
                                    fallbackSrc="/images/default-placeholder.svg"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted/50" />
                            )}
                        </div>
                    ))
                ) : (
                    // Loading skeleton for background
                    Array.from({ length: 24 }).map((_, i) => (
                        <div key={`skeleton-${i}`} className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800/30 rounded-sm animate-pulse" />
                    ))
                )}
            </div>

            {/* 2. Glassmorphism Overlay (The "Frosted" Effect) */}
            {/* Layer 1: Darken */}
            <div className="absolute inset-0 bg-background/40" />

            {/* Layer 2: Blur & Gradient Vignette */}
            <div className="absolute inset-0 backdrop-blur-[8px] bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40" />

            {/* 3. Centered Content */}
            <div className="relative h-full flex flex-col items-center justify-center text-center px-4 pb-24 pt-6">

                {/* Brand / Logo Area - Navbar Style */}
                <div className="flex items-center gap-2 mb-6 pointer-events-none select-none">
                    <div className="relative w-20 h-20 md:w-28 md:h-28 drop-shadow-2xl">
                        <ProductionImageLoader
                            src="/logo.png"
                            alt="Novelytical Logo"
                            fill
                            className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            priority
                            fallbackSrc="/images/default-placeholder.svg"
                        />
                    </div>
                </div>

                <div className="w-full max-w-2xl mx-auto mt-8 transform transition-all hover:scale-[1.02]">
                    <SearchBar />
                </div>
            </div>


        </div>
    );
}
