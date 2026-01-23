"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getNovelsByAuthor, getSimilarNovels } from "@/lib/data/novels";
import { getNovelStats, calculateRank } from "@/services/novel-stats-service";
import { FollowService } from "@/services/follow-service";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { NovelListDto } from "@/types/novel";
import { NovelCard } from "@/components/novel-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Star, TrendingUp, Users, TrendingDown, BookMarked, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/rating-stars";
import { RatingCriteriaTooltip } from "@/components/rating-criteria-tooltip";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollableSection } from "@/components/scrollable-section";
import { ProductionImageLoader } from "@/components/production-image-loader";

interface AuthorStats {
    totalNovels: number;
    totalChapters: number;
    avgRating: number;
    totalViews: number;
}

export default function AuthorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const rawAuthor = params.author as string;
    const authorName = decodeURIComponent(rawAuthor);

    const [novels, setNovels] = useState<NovelListDto[]>([]);
    const [recommended, setRecommended] = useState<NovelListDto[]>([]);
    const [topNovels, setTopNovels] = useState<{ coverUrl: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AuthorStats>({
        totalNovels: 0,
        totalChapters: 0,
        avgRating: 0,
        totalViews: 0
    });
    const [criteria, setCriteria] = useState<{
        story: number;
        characters: number;
        world: number;
        flow: number;
        grammar: number;
    } | null>(null);
    const [totalRankScore, setTotalRankScore] = useState(0);

    // Follow Logic
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        const checkFollowStatus = async () => {
            if (user && authorName) {
                const following = await FollowService.isFollowingAuthor(user.uid, authorName);
                setIsFollowing(following);
            }
        };
        checkFollowStatus();
    }, [user, authorName]);

    const handleFollow = async () => {
        if (!user) {
            toast.error("Takip etmek için giriş yapmalısınız.");
            router.push("/login");
            return;
        }

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await FollowService.unfollowAuthor(user.uid, authorName);
                setIsFollowing(false);
                toast.success(`"${authorName}" takipten çıkarıldı.`);
            } else {
                await FollowService.followAuthor(user.uid, authorName);
                setIsFollowing(true);
                toast.success(`"${authorName}" takip ediliyor.`);
            }
        } catch (error) {
            console.error("Follow error:", error);
            toast.error("İşlem başarısız oldu.");
        } finally {
            setFollowLoading(false);
        }
    };

    const renderAvatar = (novels: { coverUrl: string }[]) => {
        if (!novels || novels.length === 0) {
            return (
                <span className="text-5xl font-bold text-primary">{authorName.charAt(0).toUpperCase()}</span>
            );
        }

        if (novels.length === 1) {
            return <ProductionImageLoader src={novels[0].coverUrl} alt="Cover" className="w-full h-full object-cover" />;
        }

        if (novels.length === 2) {
            return (
                <div className="w-full h-full flex relative">
                    <div className="w-1/2 h-full overflow-hidden border-r border-white/10 relative">
                        <ProductionImageLoader src={novels[0].coverUrl} alt="Cover 1" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden relative">
                        <ProductionImageLoader src={novels[1].coverUrl} alt="Cover 2" className="w-full h-full object-cover" />
                    </div>
                </div>
            );
        }

        // 3+ Novels (T-split)
        return (
            <div className="w-full h-full flex flex-col relative">
                <div className="h-1/2 w-full overflow-hidden border-b border-white/10 relative">
                    <ProductionImageLoader src={novels[0].coverUrl} alt="Cover 1" className="w-full h-full object-cover" />
                </div>
                <div className="h-1/2 w-full flex relative">
                    <div className="w-1/2 h-full overflow-hidden border-r border-white/10 relative">
                        <ProductionImageLoader src={novels[1].coverUrl} alt="Cover 2" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden relative">
                        <ProductionImageLoader src={novels[2].coverUrl} alt="Cover 3" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        );
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Author's Novels (Max 100)
                const authorNovels = await getNovelsByAuthor(authorName, 0, 100);

                if (!authorNovels || authorNovels.length === 0) {
                    setLoading(false);
                    return;
                }

                setNovels(authorNovels);

                // Extract top novels for avatar (sort by views, take top 3 with covers)
                const novelsWithCovers = authorNovels
                    .filter((n: NovelListDto) => n.coverUrl)
                    .sort((a: NovelListDto, b: NovelListDto) => (b.viewCount || 0) - (a.viewCount || 0))
                    .slice(0, 3)
                    .map((n: NovelListDto) => ({ coverUrl: n.coverUrl || '' }));
                setTopNovels(novelsWithCovers);

                // 2. Fetch Live Stats for accurate aggregation (Views, etc.)
                const liveStats = await Promise.all(
                    authorNovels.map((n: NovelListDto) => getNovelStats(n.id))
                );

                // 3. Calculate Stats
                const totalChapters = authorNovels.reduce((sum: number, n: NovelListDto) => sum + (n.chapterCount || 0), 0);

                // Use scrapedRating if available, otherwise rating
                const getRating = (n: NovelListDto) => n.scrapedRating ?? n.rating ?? 0;

                const totalRating = authorNovels.reduce((sum: number, n: NovelListDto) => sum + getRating(n), 0);
                const validRatings = authorNovels.filter((n: NovelListDto) => getRating(n) > 0).length;

                // Total Views = Scraped Views + Site Views
                const totalViews = authorNovels.reduce((sum: number, n: NovelListDto, i: number) => {
                    const scraped = n.viewCount || 0;
                    const site = liveStats[i]?.viewCount || 0;
                    return sum + scraped + site;
                }, 0);

                // Calculate estimated Total Rank Score
                // Sum of individual novel ranks using the standard formula
                const calcRank = authorNovels.reduce((sum: number, n: NovelListDto, i: number) => {
                    const rank = calculateRank(n.viewCount || 0, liveStats[i]);
                    return sum + rank;
                }, 0);
                setTotalRankScore(Math.floor(calcRank));

                const avgRating = validRatings > 0 ? totalRating / validRatings : 0;

                setStats({
                    totalNovels: authorNovels.length,
                    totalChapters,
                    avgRating,
                    totalViews
                });

                // Set Criteria for Tooltip (Approximation using Avg Rating)
                setCriteria({
                    story: avgRating,
                    characters: avgRating,
                    world: avgRating,
                    flow: avgRating,
                    grammar: avgRating
                });

                // 3. Get Recommendations based on the most popular novel
                // Find novel with max views
                const mostPopular = [...authorNovels].sort((a: NovelListDto, b: NovelListDto) => (b.viewCount || 0) - (a.viewCount || 0))[0];

                if (mostPopular) {
                    const sims = await getSimilarNovels(mostPopular.id, 12);
                    // Filter out books by SAME author to show "Users also read OTHER authors"
                    const filtered = sims.filter((n: NovelListDto) => n.author !== authorName);
                    setRecommended(filtered);
                }

            } catch (error) {
                console.error("Failed to load author data", error);
            } finally {
                setLoading(false);
            }
        };

        if (authorName) {
            loadData();
        }
    }, [authorName]);

    if (loading) {
        return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 space-y-8 min-h-screen">
            <div className="flex gap-4 mb-8 items-center">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <Skeleton className="h-96 w-full rounded-xl" />
        </div>;
    }

    if (!novels || novels.length === 0) {
        return (
            <div className="container px-4 py-12 flex flex-col items-center justify-center min-h-[50vh] text-center">
                <User className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Yazar Bulunamadı</h2>
                <p className="text-muted-foreground mb-6">Aradığınız yazar profili bulunamadı veya henüz hiç içeriği yok.</p>
                <Button onClick={() => router.back()}>Geri Dön</Button>
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-8">
            {/* Header Navigation */}
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="gap-2 hover:bg-accent/50 hover:text-primary transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Geri Dön
            </Button>

            {/* Top Grid: Sidebar & Works */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">
                {/* Left Sidebar: Profile & Actions & Stats */}
                <div className="space-y-6">
                    {/* User Profile Card */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="h-32 w-32 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border-4 border-background shadow-xl shrink-0">
                            {renderAvatar(topNovels)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold break-words">{authorName}</h1>
                            <p className="text-muted-foreground text-sm">Yazar Profili</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full">
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleFollow}
                            variant={isFollowing ? "secondary" : "default"}
                            disabled={followLoading}
                        >
                            <User className="mr-2 h-4 w-4" />
                            {isFollowing ? "Takip Ediliyor" : "Takip Et"}
                        </Button>
                    </div>

                    {/* Stats Card */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <h3 className="font-semibold text-sm text-foreground/80 border-b pb-2 mb-2">İstatistikler</h3>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <BookMarked className="h-4 w-4 text-blue-500" /> Toplam Kitap
                                </span>
                                <span className="font-semibold">{stats.totalNovels}</span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" /> Bölüm Sayısı
                                </span>
                                <span className="font-semibold">{stats.totalChapters.toLocaleString('tr-TR')}</span>
                            </div>

                            {/* Rating with Tooltip */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Ort. Puan
                                </span>
                                <div className="flex items-center gap-2">
                                    <RatingStars
                                        rating={stats.avgRating}
                                        size="md"
                                        showCount={false}
                                    />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={14} className="text-muted-foreground/70 hover:text-purple-400 cursor-help transition-colors" />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-950 border-white/10 text-zinc-100">
                                                <RatingCriteriaTooltip criteria={criteria} loading={false} />
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>

                            {/* Total Rank Score */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-pink-500" /> Yazar Puanı
                                </span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="font-semibold cursor-help bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                                {totalRankScore.toLocaleString()}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-950 border-white/10 text-zinc-100">
                                            <div className="text-xs">Toplam Yazar Puanı (Kitapların toplam etkisi)</div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Users className="h-4 w-4 text-purple-500" /> Toplam Okunma
                                </span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="font-semibold cursor-help">
                                                {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(stats.totalViews)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-950 border-white/10 text-zinc-100">
                                            <div className="text-xs">
                                                Tüm kitapların toplam okunma sayısı: {new Intl.NumberFormat('tr-TR').format(stats.totalViews)}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                        <p className="text-xs text-muted-foreground leading-relaxed text-center">
                            Bu sayfa, yazarın {stats.totalNovels} farklı eseri üzerinden derlenen verilerle oluşturulmuştur.
                        </p>
                    </div>
                </div>

                {/* Right Column: Author's Works */}
                <div className="min-w-0">
                    <ScrollableSection
                        title={
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                <span className="text-xl font-bold">Yazarın Eserleri</span>
                                <Badge variant="secondary" className="ml-2">{novels.length} Kitap</Badge>
                            </div>
                        }
                        sectionClassName="mt-0 pt-0 border-none"
                    >
                        {novels.map((novel) => (
                            <div key={novel.id} className="w-36 sm:w-40 flex-shrink-0">
                                <NovelCard novel={novel} showLastUpdated={false} />
                            </div>
                        ))}
                    </ScrollableSection>
                </div>
            </div>

            {/* Bottom Section: Recommendations (Full Width) */}
            {recommended.length > 0 && (
                <div className="border-t pt-8">
                    <div className="mb-6">
                        <h3 className="font-semibold text-2xl text-foreground flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-purple-500" />
                            Okur Analizi
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            <span className="text-primary font-medium">{authorName}</span> okurlarının kütüphanelerinde en sık bulunan diğer kitaplar.
                        </p>
                    </div>

                    <ScrollableSection
                        title={<span></span>}
                        hideBorder={true}
                        sectionClassName="mt-0 pt-0"
                    >
                        {recommended.map((novel) => (
                            <div key={novel.id} className="w-36 sm:w-40 flex-shrink-0">
                                <NovelCard novel={novel} showLastUpdated={false} />
                            </div>
                        ))}
                    </ScrollableSection>
                </div>
            )}
        </main>
    );
}
