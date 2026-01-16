'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/rating-stars';
import { SocialShare } from '@/components/social-share';
import { ArrowLeft, BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronUp, Eye, Star, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LibraryAction from '@/components/novel/library-action';
import { RatingCriteriaTooltip } from '@/components/rating-criteria-tooltip';
import { getReviewsByNovelId } from '@/services/review-service';
import type { NovelDetailDto } from '@/types/novel';
import { cn } from '@/lib/utils';
import { getRelativeTimeString } from '@/lib/utils/date';

interface NovelDetailClientProps {
    novel: NovelDetailDto;
}

export default function NovelDetailClient({ novel }: NovelDetailClientProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const descriptionRef = useRef<HTMLDivElement>(null);

    const toggleExpanded = () => {
        if (isExpanded) {
            // Collapsing: Scroll back to title/top of description
            descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setIsExpanded(!isExpanded);
    };

    const description = novel.description || 'Bu roman için henüz bir özet bulunmuyor.';
    const shouldTruncate = description.length > 300;
    const displayedDescription = isExpanded || !shouldTruncate ? description : description.slice(0, 300) + '...';

    const [locationHref, setLocationHref] = useState('');
    const [criteria, setCriteria] = useState<{
        story: number;
        characters: number;
        world: number;
        flow: number;
        grammar: number;
    } | null>(null);
    const [ratingsLoading, setRatingsLoading] = useState(true);

    useEffect(() => {
        setLocationHref(window.location.href);

        // Fetch ratings for tooltip
        getReviewsByNovelId(novel.id)
            .then(reviews => {
                if (reviews && reviews.length > 0) {
                    const averages = {
                        story: reviews.reduce((sum, r) => sum + r.ratings.story, 0) / reviews.length,
                        characters: reviews.reduce((sum, r) => sum + r.ratings.characters, 0) / reviews.length,
                        world: reviews.reduce((sum, r) => sum + r.ratings.world, 0) / reviews.length,
                        flow: reviews.reduce((sum, r) => sum + r.ratings.flow, 0) / reviews.length,
                        grammar: reviews.reduce((sum, r) => sum + r.ratings.grammar, 0) / reviews.length,
                    };
                    setCriteria(averages);
                }
            })
            .catch(err => console.error('Error details ratings:', err))
            .finally(() => setRatingsLoading(false));
    }, [novel.id]);

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 space-y-8 overflow-x-hidden">
            {/* Navigation */}
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="gap-2 hover:bg-accent/50 hover:text-primary transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Listeye Dön
            </Button>

            <div className="grid grid-cols-1 min-[550px]:grid-cols-[200px_1fr] md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr] gap-6 sm:gap-8 lg:gap-12">
                {/* Left Column: Cover & Quick Actions */}
                <div className="space-y-6">
                    {/* Wrapper for Cover */}
                    <div className="relative w-full group">
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-border/10 z-10">
                            {novel.coverUrl ? (
                                <img
                                    src={novel.coverUrl}
                                    alt={novel.title}
                                    className="object-cover w-full h-full block"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted">
                                    <BookOpen className="h-20 w-20 text-muted-foreground/30" />
                                </div>
                            )}
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Puan
                                </span>
                                <div className="flex items-center gap-2">
                                    <RatingStars
                                        rating={novel.scrapedRating ?? novel.rating}
                                        size="md"
                                    />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={14} className="text-muted-foreground/70 hover:text-purple-400 cursor-help transition-colors" />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-950 border-white/10 text-zinc-100">
                                                <RatingCriteriaTooltip criteria={criteria} loading={ratingsLoading} />
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-purple-500" /> Okunma
                                </span>
                                <span className="font-semibold">
                                    {novel.viewCount ? new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(novel.viewCount) : '0'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-blue-500" /> Son Güncelleme
                                </span>
                                <span className="font-semibold">
                                    {novel.lastUpdated ? getRelativeTimeString(novel.lastUpdated) : '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-orange-500" /> Durum
                                </span>
                                <span className="font-semibold">
                                    {novel.status === 'Ongoing' ? 'Devam Ediyor' : (novel.status === 'Completed' ? 'Tamamlandı' : novel.status)}
                                </span>
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
                        {(novel.category || novel.isCompleted) && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {novel.category && (
                                    <Badge variant="secondary" className="text-sm px-3 py-1">
                                        {novel.category}
                                    </Badge>
                                )}
                                {novel.status && (
                                    <Badge variant="outline" className={cn("text-sm px-3 py-1 gap-1.5",
                                        novel.status === 'Completed' ? "border-green-500 text-green-500" : "border-blue-500 text-blue-500")}>
                                        {novel.status === 'Completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                                        {novel.status}
                                    </Badge>
                                )}
                            </div>
                        )}

                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 text-foreground break-words">
                            {novel.title}
                        </h1>
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <div className="text-lg text-muted-foreground">
                                Yazar: <span className="text-foreground font-medium">{novel.author}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <LibraryAction novelId={novel.id} chapterCount={novel.chapterCount} />
                                <SocialShare
                                    title={`${novel.title} - Novelytical'da keşfet!`}
                                    url={locationHref}
                                />
                            </div>
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

                    {/* Reading Journey moved to tabs below */}

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
                                        href={`/romanlar?tag=${encodeURIComponent(tag)}`}
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
        </main >
    );
}
