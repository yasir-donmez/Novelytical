'use client';

import { SearchBar } from '@/components/search-bar';
import { ProductionImageLoader } from './production-image-loader';

export function HeroSection() {
    // Hero is completely static - no props needed, no dynamic content

    return (
        <div className="relative h-[60vh] w-full overflow-hidden">
            {/* 1. Static Background - Subtle gradient only */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
            
            {/* 2. Optional subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px]" />
            </div>

            {/* 3. Centered Content - Always present */}
            <div className="relative h-full flex flex-col items-center justify-center text-center px-4 pb-24 pt-6">

                {/* Brand / Logo Area - Always show */}
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

                {/* Search Bar - Always show */}
                <div className="w-full max-w-2xl mx-auto mt-8 transform transition-all hover:scale-[1.02]">
                    <SearchBar />
                </div>
            </div>
        </div>
    );
}
