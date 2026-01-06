"use client";

import { useRef, useEffect, useState } from "react";
import { getReviewsByUserId, Review } from "@/services/review-service";
import { getCommentsByUserId, Comment } from "@/services/comment-service";
import { novelService } from "@/services/novelService";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Star, MessageCircle, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { NovelListDto } from "@/types/novel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InteractionSummary {
    novelId: number;
    novel?: NovelListDto; // Will serve as detail container
    userReview?: Review;
    commentCount: number;
    lastInteraction: Date;
}

export default function UserInteractionList() {
    const { user } = useAuth();
    const [interactions, setInteractions] = useState<InteractionSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Parallel fetch
                const [reviews, comments] = await Promise.all([
                    getReviewsByUserId(user.uid),
                    getCommentsByUserId(user.uid)
                ]);

                // Map to group by Novel ID
                const interactionMap = new Map<number, InteractionSummary>();

                // Process Reviews
                reviews.forEach(review => {
                    if (!interactionMap.has(review.novelId)) {
                        interactionMap.set(review.novelId, {
                            novelId: review.novelId,
                            commentCount: 0,
                            lastInteraction: review.createdAt?.toDate() || new Date()
                        });
                    }
                    const summary = interactionMap.get(review.novelId)!;
                    summary.userReview = review;
                    if (review.createdAt?.toDate() > summary.lastInteraction) {
                        summary.lastInteraction = review.createdAt.toDate();
                    }
                });

                // Process Comments
                comments.forEach(comment => {
                    if (!interactionMap.has(comment.novelId)) {
                        interactionMap.set(comment.novelId, {
                            novelId: comment.novelId,
                            commentCount: 0,
                            lastInteraction: comment.createdAt?.toDate() || new Date()
                        });
                    }
                    const summary = interactionMap.get(comment.novelId)!;
                    summary.commentCount++;
                    if (comment.createdAt?.toDate() > summary.lastInteraction) {
                        summary.lastInteraction = comment.createdAt.toDate();
                    }
                });

                const summaryList = Array.from(interactionMap.values());

                // Fetch Novel Details (Batched/Parallel if possible, or individually for now)
                // Since there is no batch endpoint, we will fetch individually but in parallel
                // Limit concurrency if needed, but for now Promise.all is okay for reasonable amounts
                const summariesWithNovels = await Promise.all(summaryList.map(async (item) => {
                    try {
                        // Assuming getNovelById returns detailed info, can be heavy.
                        // Ideally we'd have a lighter endpoint or ID list support.
                        const novelData = await novelService.getNovelById(item.novelId);
                        // Convert Detail to ListDto shape vaguely or just use relevant fields
                        return { ...item, novel: novelData as unknown as NovelListDto };
                    } catch (e) {
                        console.error(`Failed to load novel ${item.novelId}`, e);
                        return item;
                    }
                }));

                // Sort by last interaction
                summariesWithNovels.sort((a, b) => b.lastInteraction.getTime() - a.lastInteraction.getTime());

                setInteractions(summariesWithNovels);

            } catch (error) {
                console.error("Error fetching interactions", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const [isExpanded, setIsExpanded] = useState(false);

    const InteractionGrid = ({ items }: { items: InteractionSummary[] }) => {
        const scrollContainerRef = useRef<HTMLDivElement>(null);
        const [showLeftArrow, setShowLeftArrow] = useState(false);
        const [showRightArrow, setShowRightArrow] = useState(false);

        const checkScroll = () => {
            if (scrollContainerRef.current && !isExpanded) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
                setShowLeftArrow(scrollLeft > 24);
                setShowRightArrow(Math.abs(scrollWidth - clientWidth - scrollLeft) > 24);
            }
        };

        useEffect(() => {
            if (!isExpanded) {
                checkScroll();
                window.addEventListener('resize', checkScroll);
                return () => window.removeEventListener('resize', checkScroll);
            }
        }, [items, isExpanded]);

        const scroll = (direction: 'left' | 'right') => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const firstItem = container.querySelector('.group-item') as HTMLElement;
                if (firstItem) {
                    const itemWidth = firstItem.offsetWidth;
                    const gap = 16;
                    const scrollDistance = itemWidth * 3 + gap * 2;
                    const scrollAmount = direction === 'left' ? -scrollDistance : scrollDistance;
                    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                    setTimeout(checkScroll, 400);
                }
            }
        };

        if (items.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border border-dashed border-border/40 rounded-lg bg-black/5 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 opacity-50" />
                        <p className="text-sm">Henüz etkileşiminiz yok.</p>
                        <Link href="/">
                            <Button variant="link" className="text-purple-400 h-auto p-0 ml-1">Keşfet</Button>
                        </Link>
                    </div>
                </div>
            );
        }

        const maskStyle: React.CSSProperties = !isExpanded ? {
            WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 28px, black calc(100% - 28px), transparent 100%)',
            maskImage: 'linear-gradient(to right, transparent 0px, black 28px, black calc(100% - 28px), transparent 100%)'
        } : {};

        return (
            <div className="relative group/carousel mt-2">
                {/* Left Arrow */}
                <Button
                    variant="outline"
                    size="icon"
                    className={`absolute right-12 -top-[4.5rem] h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-30 hidden md:flex transition-opacity ${(!showLeftArrow || isExpanded) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    onClick={() => scroll('left')}
                    aria-label="Sola kaydır"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Right Arrow */}
                <Button
                    variant="outline"
                    size="icon"
                    className={`absolute right-0 -top-[4.5rem] h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-30 hidden md:flex transition-opacity ${(!showRightArrow || isExpanded) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    onClick={() => scroll('right')}
                    aria-label="Sağa kaydır"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                <div
                    ref={scrollContainerRef}
                    onScroll={!isExpanded ? checkScroll : undefined}
                    className={`relative z-10 flex pt-2 pb-4 gap-4 scrollbar-hide ${isExpanded ? 'flex-wrap' : 'overflow-x-auto snap-x snap-mandatory'}`}
                    style={maskStyle}
                >
                    {items.map((item) => (
                        <Link
                            href={`/novel/${item.novelId}`}
                            key={item.novelId}
                            className={`group shrink-0 py-1 group-item ${isExpanded
                                ? 'w-full sm:w-[calc((100%_-_2rem)_/_3)]'
                                : 'min-w-[85%] sm:w-[calc((100%_-_2rem)_/_3)] sm:min-w-0 snap-start'
                                }`}
                        >
                            <div className="flex h-32 bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10 rounded-xl transition-all p-3 gap-3 hover:bg-black/10 dark:hover:bg-zinc-800/60">
                                <div className="w-20 shrink-0 bg-muted rounded-lg overflow-hidden relative shadow-sm">
                                    {item.novel?.coverUrl ? (
                                        <img src={item.novel.coverUrl} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                            <BookOpen size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col justify-between flex-1 py-1">
                                    <div>
                                        <h4 className="font-medium line-clamp-1 group-hover:text-purple-400 transition-colors">{item.novel?.title || `Novel #${item.novelId}`}</h4>
                                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{item.novel?.author}</p>

                                        <div className="flex flex-wrap gap-1.5">
                                            {item.userReview && (
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1 px-1.5 py-0 text-[10px]">
                                                    <Star size={10} className="fill-amber-500" />
                                                    <span className="font-bold">{item.userReview.averageRating}</span>
                                                </Badge>
                                            )}
                                            {item.commentCount > 0 && (
                                                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1 px-1.5 py-0 text-[10px]">
                                                    <MessageCircle size={10} />
                                                    {item.commentCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mt-auto">
                                        <div className="text-[10px] text-muted-foreground ml-auto">
                                            {item.lastInteraction?.toLocaleDateString('tr-TR')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-purple-500" /></div>;
    }

    if (interactions.length === 0) {
        return (
            <div className="text-center py-16 bg-black/5 dark:bg-zinc-800/40 rounded-xl border border-black/5 dark:border-white/10">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Henüz etkileşiminiz yok</h3>
                <p className="text-muted-foreground mt-2 mb-6">Romanlara yorum yaparak veya değerlendirerek burada görebilirsiniz.</p>
                <Link href="/" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium transition-colors">
                    Kitapları Keşfet
                </Link>
            </div>
        );
    }

    const filterItems = (type: 'all' | 'reviews' | 'comments') => {
        if (type === 'all') return interactions;
        if (type === 'reviews') return interactions.filter(i => i.userReview);
        if (type === 'comments') return interactions.filter(i => i.commentCount > 0);
        return interactions;
    };

    return (
        <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center gap-4 mb-4">
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <TabsList className="inline-flex w-max justify-start h-auto p-1 flex-nowrap bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10">
                        <TabsTrigger value="all" className="flex-none px-4">Hepsi {interactions.length}</TabsTrigger>
                        <TabsTrigger value="reviews" className="flex-none px-4 gap-2"><Star className="w-4 h-4" /> Değerlendirmelerim {filterItems('reviews').length}</TabsTrigger>
                        <TabsTrigger value="comments" className="flex-none px-4 gap-2"><MessageCircle className="w-4 h-4" /> Yorumlarım {filterItems('comments').length}</TabsTrigger>
                    </TabsList>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-muted-foreground hover:text-foreground hidden md:flex shrink-0 -mt-2"
                >
                    {isExpanded ? "Daralt" : "Tümünü Gör"}
                </Button>
            </div>

            <TabsContent value="all" className="mt-0 animate-in fade-in-50 slide-in-from-left-1">
                <InteractionGrid items={filterItems('all')} />
            </TabsContent>
            <TabsContent value="reviews" className="mt-0 animate-in fade-in-50 slide-in-from-left-1">
                <InteractionGrid items={filterItems('reviews')} />
            </TabsContent>
            <TabsContent value="comments" className="mt-0 animate-in fade-in-50 slide-in-from-left-1">
                <InteractionGrid items={filterItems('comments')} />
            </TabsContent>
        </Tabs>
    );
}
