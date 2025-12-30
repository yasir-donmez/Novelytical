'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { novelService } from '@/services/novelService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/rating-stars';
import { NovelDetailSkeleton } from '@/components/novel-detail-skeleton';
import { SocialShare } from '@/components/social-share';
import { ScrollableSection } from '@/components/scrollable-section';
import { ArrowLeft, BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { NovelDetailDto } from '@/types/novel';

interface NovelDetailClientProps {
    initialNovelId: number;
}

export default function NovelDetailClient({ initialNovelId }: NovelDetailClientProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const descriptionRef = useRef<HTMLDivElement>(null);

    const { data: novel, isLoading, error } = useQuery({
        queryKey: ['novel', initialNovelId],
        queryFn: () => novelService.getNovelById(initialNovelId),
    });

    const toggleExpanded = () => {
        if (isExpanded) {
            // Collapsing: Scroll back to title/top of description
            descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setIsExpanded(!isExpanded);
    };

    // Fetch author's other novels
    const { data: authorNovels } = useQuery({
        queryKey: ['author-novels', novel?.author, initialNovelId],
        queryFn: () => novelService.getNovelsByAuthor(novel!.author, initialNovelId, 12),
        enabled: !!novel?.author,
    });

    // Fetch AI-powered similar novels
    const { data: similarNovels } = useQuery({
        queryKey: ['similar-novels', initialNovelId],
        queryFn: () => novelService.getSimilarNovels(initialNovelId, 12),
        enabled: !!novel,
    });

    if (isLoading) {
        return (
            <div className="container max-w-7xl mx-auto px-4 sm:px-12 lg:px-16 xl:px-24 py-8">
                <Button variant="ghost" disabled className="gap-2 mb-8 -ml-2">
                    <ArrowLeft className="h-4 w-4" />
                    Listeye Dön
                </Button>
                <NovelDetailSkeleton />
            </div>
        );
    }

    if (error || !novel) {
        return (
            <div className="container flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h2 className="text-2xl font-bold text-destructive">Bir hata oluştu</h2>
                <p className="text-muted-foreground">Roman detayları yüklenemedi.</p>
                <Button onClick={() => router.back()} variant="outline">
                    Geri Dön
                </Button>
            </div>
        );
    }

    const description = novel.description || 'Bu roman için henüz bir özet bulunmuyor.';
    const shouldTruncate = description.length > 300;
    const displayedDescription = isExpanded || !shouldTruncate ? description : description.slice(0, 300) + '...';

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
            {/* Navigation */}
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="gap-2 hover:bg-accent/50 hover:text-primary transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Listeye Dön
            </Button>

            <div className="grid md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr] gap-8 lg:gap-12">
                {/* Left Column: Cover & Quick Actions */}
                <div className="space-y-6">
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-border/10">
                        {novel.coverUrl ? (
                            <img
                                src={novel.coverUrl}
                                alt={novel.title}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                                <BookOpen className="h-20 w-20 text-muted-foreground/30" />
                            </div>
                        )}
                    </div>

                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    Puan
                                </span>
                                <RatingStars
                                    rating={novel.averageRating || novel.rating}
                                    count={novel.ratingCount}
                                    size="sm"
                                />
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-blue-500" /> Yayın
                                </span>
                                <span className="font-semibold">{novel.year}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-green-500" /> Bölümler
                                </span>
                                <span className="font-semibold">{novel.chapterCount || '?'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Details */}
                <div className="space-y-8">
                    <div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {novel.category && (
                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                    {novel.category}
                                </Badge>
                            )}
                            {novel.isCompleted && (
                                <Badge variant="outline" className="text-sm px-3 py-1 border-green-500 text-green-500 gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Tamamlandı
                                </Badge>
                            )}
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 text-foreground break-words">
                            {novel.title}
                        </h1>
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <div className="text-lg text-muted-foreground">
                                Yazar: <span className="text-foreground font-medium">{novel.author}</span>
                            </div>
                            <SocialShare
                                title={`${novel.title} - Novelytical'da keşfet!`}
                                url={typeof window !== 'undefined' ? window.location.href : ''}
                            />
                        </div>
                    </div>

                    <div className="prose prose-slate dark:prose-invert md:prose-lg max-w-none">
                        <h3 ref={descriptionRef} className="text-xl font-semibold mb-3">Özet</h3>
                        <div className="relative">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                                {displayedDescription}
                            </p>
                            {shouldTruncate && (
                                <Button
                                    variant="link"
                                    onClick={toggleExpanded}
                                    className="px-0 h-auto font-semibold text-primary mt-1"
                                >
                                    {isExpanded ? (
                                        <span className="flex items-center gap-1">Daha Az Göster <ChevronUp className="h-3 w-3" /></span>
                                    ) : (
                                        <span className="flex items-center gap-1">Devamını Oku <ChevronDown className="h-3 w-3" /></span>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>

                    {novel.aiSummary && (
                        <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <span className="text-xl">🤖</span> AI Analizi
                            </h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                                {novel.aiSummary}
                            </p>
                        </div>
                    )}

                    {/* Tags - Clickable */}
                    {novel.tags && novel.tags.length > 0 && (
                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Etiketler</h4>
                            <div className="flex flex-wrap gap-2">
                                {novel.tags.map((tag) => (
                                    <Link
                                        key={tag}
                                        href={`/?tag=${encodeURIComponent(tag)}`}
                                        className="hover:scale-105 transition-transform inline-block"
                                    >
                                        <Badge
                                            variant="outline"
                                            className="cursor-pointer hover:bg-primary/10 hover:border-primary"
                                        >
                                            {tag}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Author's Other Novels */}
            {authorNovels && authorNovels.length > 0 && (
                <ScrollableSection title={`${novel.author}'ın Diğer Romanları`}>
                    {authorNovels.map((authorNovel) => (
                        <Link
                            key={authorNovel.id}
                            href={`/novel/${authorNovel.id}`}
                            className="group flex-shrink-0 w-[40vw] md:w-40 lg:w-[calc((100%-6.25rem)/6)] snap-center lg:snap-start transition-all duration-300 data-[centered=true]:scale-105 data-[centered=true]:-translate-y-1 lg:data-[centered=true]:scale-100 lg:data-[centered=true]:translate-y-0"
                        >
                            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-100/50 dark:bg-card border border-border/50 shadow-sm transition-all duration-300 lg:group-hover:shadow-xl lg:group-hover:scale-105 lg:group-hover:-translate-y-1 data-[centered=true]:shadow-xl lg:data-[centered=true]:shadow-sm">
                                {authorNovel.coverUrl ? (
                                    <img
                                        src={authorNovel.coverUrl}
                                        alt={authorNovel.title}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted">
                                        <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>
                            <h3 className="mt-3 text-sm font-medium line-clamp-2 h-10 leading-tight lg:group-hover:text-primary transition-colors">
                                {authorNovel.title}
                            </h3>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <RatingStars rating={authorNovel.rating} size="sm" showCount={false} />
                            </div>
                        </Link>
                    ))}
                </ScrollableSection>
            )}

            {/* AI-Powered Similar Novels */}
            {similarNovels && similarNovels.length > 0 && (
                <ScrollableSection
                    title={
                        <span className="flex items-center gap-3">
                            Benzer Romanlar
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                                🤖 AI Powered
                            </span>
                        </span>
                    }
                >
                    {similarNovels.map((similarNovel) => (
                        <Link
                            key={similarNovel.id}
                            href={`/novel/${similarNovel.id}`}
                            className="group flex-shrink-0 w-[40vw] md:w-40 lg:w-[calc((100%-6.25rem)/6)] snap-center lg:snap-start transition-all duration-300 data-[centered=true]:scale-105 data-[centered=true]:-translate-y-1 lg:data-[centered=true]:scale-100 lg:data-[centered=true]:translate-y-0"
                        >
                            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-slate-100/50 dark:bg-card border border-border/50 shadow-sm transition-all duration-300 lg:group-hover:shadow-xl lg:group-hover:scale-105 lg:group-hover:-translate-y-1 data-[centered=true]:shadow-xl lg:data-[centered=true]:shadow-sm">
                                {similarNovel.coverUrl ? (
                                    <img
                                        src={similarNovel.coverUrl}
                                        alt={similarNovel.title}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted">
                                        <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>
                            <h3 className="mt-3 text-sm font-medium line-clamp-2 h-10 leading-tight lg:group-hover:text-primary transition-colors">
                                {similarNovel.title}
                            </h3>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <RatingStars rating={similarNovel.rating} size="sm" showCount={false} />
                            </div>
                        </Link>
                    ))}
                </ScrollableSection>
            )}
        </main >
    );
}
