'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { novelService } from '@/services/novelService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, Star, Calendar, CheckCircle2 } from 'lucide-react';
import type { NovelDetailDto } from '@/types/novel';

interface NovelDetailClientProps {
    initialNovelId: number;
}

export default function NovelDetailClient({ initialNovelId }: NovelDetailClientProps) {
    const router = useRouter();

    const { data: novel, isLoading, error } = useQuery({
        queryKey: ['novel', initialNovelId],
        queryFn: () => novelService.getNovelById(initialNovelId),
    });

    if (isLoading) {
        return (
            <div className="container max-w-5xl py-8 px-4 md:px-6 space-y-8">
                <Button variant="ghost" disabled className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Geri Dön
                </Button>
                <div className="grid md:grid-cols-[300px_1fr] gap-8">
                    <Skeleton className="w-[300px] h-[400px] rounded-xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
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

    return (
        <main className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 xl:px-24 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Navigation */}
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="gap-2 hover:bg-transparent hover:text-primary -ml-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Listeye Dön
            </Button>

            <div className="grid md:grid-cols-[300px_1fr] gap-8 lg:gap-12">
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
                                    <Star className="h-4 w-4 text-yellow-500" /> Puan
                                </span>
                                <span className="font-semibold">{novel.rating}/5.0</span>
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

                        <h1 className="text-4xl font-bold tracking-tight mb-2 text-foreground">
                            {novel.title}
                        </h1>
                        <div className="text-lg text-muted-foreground mb-6">
                            Yazar: <span className="text-foreground font-medium">{novel.author}</span>
                        </div>
                    </div>

                    <div className="prose prose-lg dark:prose-invert max-w-none">
                        <h3 className="text-xl font-semibold mb-3">Özet</h3>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                            {novel.description || 'Bu roman için henüz bir özet bulunmuyor.'}
                        </p>
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

                    {/* Tags */}
                    {novel.tags && novel.tags.length > 0 && (
                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Etiketler</h4>
                            <div className="flex flex-wrap gap-2">
                                {novel.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="hover:bg-accent cursor-default">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
