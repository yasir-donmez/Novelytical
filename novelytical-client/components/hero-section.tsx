'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Info } from 'lucide-react';
import Link from 'next/link';

interface HeroSectionProps {
    novel: any; // Using any for now, should be NovelDto
}

export function HeroSection({ novel }: HeroSectionProps) {
    if (!novel) return null;

    return (
        <div className="relative h-[70vh] w-full overflow-hidden">
            {/* Background Image with Gradient */}
            <div className="absolute inset-0">
                <img
                    src={novel.coverImage}
                    alt={novel.title}
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="relative h-full container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
                <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 backdrop-blur-sm">
                            Haftanın Öne Çıkanı
                        </Badge>
                        {novel.categories && novel.categories[0] && (
                            <Badge variant="outline" className="border-white/20">
                                {novel.categories[0]}
                            </Badge>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-lg">
                        {novel.title}
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground line-clamp-3 md:line-clamp-2 max-w-xl">
                        {novel.description}
                    </p>

                    <div className="flex flex-wrap gap-4 pt-4">
                        <Button size="lg" className="gap-2 rounded-full font-semibold text-md h-12 px-8" asChild>
                            <Link href={`/novel/${novel.id}`}>
                                <Play className="h-5 w-5 fill-current" />
                                Hemen Oku
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="gap-2 rounded-full font-semibold text-md h-12 px-8 bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-sm" asChild>
                            <Link href={`/novel/${novel.id}/detay`}>
                                <Info className="h-5 w-5" />
                                Detaylar
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
