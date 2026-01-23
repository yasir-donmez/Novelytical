'use client';

import { SearchBar } from '@/components/search-bar';
import { ProductionImageLoader } from './production-image-loader';
import type { NovelListDto } from '@/types/novel';

interface HeroSectionProps {
    novels?: NovelListDto[];
}

export function HeroSection({ novels = [] }: HeroSectionProps) {
    return (
        <div className="relative h-[60vh] w-full overflow-hidden">
            {/* 1. Dynamic Background - Subtle grid of covers */}
            <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10" />
                <div className="flex flex-wrap gap-4 p-4 justify-center">
                    {novels.slice(0, 15).map((novel) => (
                        <div key={novel.id} className="relative w-32 h-48 rounded-lg overflow-hidden grayscale blur-sm hover:grayscale-0 hover:blur-none transition-all duration-700 opacity-40">
                            <ProductionImageLoader
                                src={novel.coverUrl || ''}
                                alt={novel.title}
                                fill
                                className="object-cover"
                                fallbackSrc="/images/default-placeholder.svg"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Static Overlay for readability */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />

            {/* 3. Optional subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px]" />
            </div>

            {/* 4. Centered Content */}
            <div className="relative h-full flex flex-col items-center justify-center text-center px-4 pb-24 pt-6">
                {/* Brand / Logo Area */}
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

                {/* Search Bar */}
                <div className="w-full max-w-2xl mx-auto mt-8 transform transition-all hover:scale-[1.02]">
                    <SearchBar />
                </div>
            </div>
        </div>
    );
}
