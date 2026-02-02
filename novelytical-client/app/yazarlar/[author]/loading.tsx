import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, BookMarked, TrendingUp, Star, Users, BookOpen, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { NovelCardSkeleton } from "@/components/novel-card-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
            {/* Header Navigation Mimic */}
            <div className="h-10 flex items-center px-4 gap-2 text-muted-foreground/50">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Geri Dön</span>
            </div>

            {/* Top Grid: Sidebar & Works */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">

                {/* Left Sidebar Skeleton */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        {/* Profile Image Wrapper - Exact match to page.tsx margins/borders */}
                        <div className="h-32 w-32 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border-4 border-background shadow-xl shrink-0">
                            <Skeleton className="h-full w-full opacity-50" />
                        </div>
                        <div className="w-full flex flex-col items-center gap-2">
                            {/* Name: h-16 (4rem) to match 2-line height in page.tsx */}
                            <Skeleton className="h-16 w-3/4" />
                            {/* Label: h-5 for text-sm */}
                            <p className="text-muted-foreground text-sm">Yazar Profili</p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="w-full">
                        <Button className="w-full" size="lg" disabled variant="default">
                            <User className="mr-2 h-4 w-4" />
                            Takip Et
                        </Button>
                    </div>

                    {/* Stats Card - Use real Card component */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <h3 className="font-semibold text-sm text-foreground/80 border-b pb-2 mb-2">İstatistikler</h3>

                            <div className="space-y-3">
                                {/* Total Novels */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <BookMarked className="h-4 w-4 text-blue-500" /> Toplam Kitap
                                    </span>
                                    <Skeleton className="h-5 w-8" />
                                </div>
                                {/* Total Chapters */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-green-500" /> Bölüm Sayısı
                                    </span>
                                    <Skeleton className="h-5 w-12" />
                                </div>
                                {/* Avg Rating */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Ort. Puan
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-16" />
                                        <Info size={14} className="text-muted-foreground/70" />
                                    </div>
                                </div>
                                {/* Rank Score */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-pink-500" /> Yazar Puanı
                                    </span>
                                    <Skeleton className="h-5 w-16" />
                                </div>
                                {/* Total Views */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Users className="h-4 w-4 text-purple-500" /> Toplam Okunma
                                    </span>
                                    <Skeleton className="h-5 w-16" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Box - Exact class match */}
                    <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-full bg-primary/10" />
                            <Skeleton className="h-3 w-3/4 mx-auto bg-primary/10" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Author's Works Skeleton */}
                <div className="min-w-0 space-y-6">
                    {/* Section Header - EXACT MATCH ScrollableSection Structure */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 select-none">
                            <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                                <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">Yazarın Eserleri</h2>
                        </div>

                        {/* Header Navigation Buttons Mimic */}
                        <div className="flex items-center gap-2">
                            <div className="hidden md:flex gap-2">
                                <Button variant="outline" size="icon" disabled className="h-8 w-8 rounded-full bg-background/80 border-primary/20 opacity-50">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" disabled className="h-8 w-8 rounded-full bg-background/80 border-primary/20 opacity-50">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Carousel Items Skeleton */}
                    <div className="flex w-full gap-4 overflow-visible py-12 md:py-8 px-4 min-h-[400px]">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-full md:w-40 lg:w-[calc((100%-3rem)/4)] flex-shrink-0 flex flex-col">
                                <NovelCardSkeleton />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recommendations (Okur Analizi) Skeleton */}
            <div className="border-t pt-8">
                <div className="mb-6">
                    {/* Header - EXACT MATCH ScrollableSection Structure */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 select-none">
                            <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                                <TrendingUp className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">Okur Analizi</h2>
                                {/* Description as subtext since ScrollableSection doesn't natively support valid subtitle safely in title prop without structure mismatch, but here we mimic logic */}
                                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1 font-normal">
                                    <Skeleton className="h-4 w-24 inline-block" />
                                    <span>okurlarının kütüphanelerinde...</span>
                                </div>
                            </div>
                        </div>

                        {/* Header Navigation Buttons Mimic */}
                        <div className="flex items-center gap-2">
                            <div className="hidden md:flex gap-2">
                                <Button variant="outline" size="icon" disabled className="h-8 w-8 rounded-full bg-background/80 border-primary/20 opacity-50">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" disabled className="h-8 w-8 rounded-full bg-background/80 border-primary/20 opacity-50">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommendation Carousel */}
                <div className="flex w-full gap-4 overflow-visible py-12 md:py-8 px-4 min-h-[400px]">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="w-full md:w-40 lg:w-[calc((100%-5rem)/6)] flex-shrink-0 flex flex-col">
                            <NovelCardSkeleton />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
