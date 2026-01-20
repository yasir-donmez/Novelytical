'use client';

import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/search-bar';
import { Play, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface HeroSectionProps {
    novels: any[];
}

export function HeroSection({ novels }: HeroSectionProps) {
    if (!novels || novels.length === 0) return null;

    // We only need enough novels to fill the grid, usually 24 is plenty
    const displayNovels = novels.slice(0, 24);

    return (
        <div className="relative h-[85vh] w-full overflow-hidden">
            {/* 1. Background Collage */}
            {/* 1. Background Collage */}
            <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 opacity-60">
                {displayNovels.map((novel, i) => (
                    <div key={i} className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800/50 rounded-sm">
                        {(novel.coverUrl || novel.coverImage) ? (
                            <img
                                src={novel.coverUrl || novel.coverImage}
                                alt=""
                                className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                            />
                        ) : (
                            <div className="w-full h-full bg-muted/50" />
                        )}
                    </div>
                ))}
            </div>

            {/* 2. Glassmorphism Overlay (The "Frosted" Effect) */}
            {/* Layer 1: Darken */}
            <div className="absolute inset-0 bg-background/40" />

            {/* Layer 2: Blur & Gradient Vignette */}
            <div className="absolute inset-0 backdrop-blur-[8px] bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40" />

            {/* 3. Centered Content */}
            <div className="relative h-full flex flex-col items-center justify-center text-center px-4 pb-24">

                {/* Brand / Logo Area - Navbar Style */}
                <div className="flex items-center gap-2 mb-6 pointer-events-none select-none">
                    <div className="relative w-20 h-20 md:w-28 md:h-28 drop-shadow-2xl">
                        <Image
                            src="/logo.png"
                            alt="Novelytical Logo"
                            fill
                            className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            priority
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
