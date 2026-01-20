import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export default function HeroSkeleton() {
    return (
        <div className="relative h-[85vh] w-full overflow-hidden bg-muted">
            {/* Background Mimic */}
            <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 opacity-20">
                {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="bg-background/20" />
                ))}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-background via-background/60 to-transparent" />

            {/* Content Skeleton */}
            <div className="relative h-full container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">

                {/* High-Fidelity Brand Area - Matches HeroSection Exactly */}
                <div className="flex items-center gap-2 mb-6 opacity-80">
                    <div className="relative w-20 h-20 md:w-28 md:h-28">
                        <Image
                            src="/logo.png"
                            alt="Loading..."
                            fill
                            className="object-contain grayscale"
                            priority
                        />
                    </div>
                    <span className="text-5xl md:text-7xl lg:text-8xl font-bold text-white/50">
                        ovelytical
                    </span>
                </div>

                {/* Slogan Placeholder */}
                <div className="space-y-4 max-w-2xl w-full flex flex-col items-center mb-10">
                    <Skeleton className="h-6 w-3/4 bg-white/10" />
                    <Skeleton className="h-6 w-1/2 bg-white/10" />
                </div>

                {/* Search Bar Placeholder - Matches visual style of input */}
                <div className="h-14 w-full max-w-2xl rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm" />
            </div>
        </div>
    );
}

