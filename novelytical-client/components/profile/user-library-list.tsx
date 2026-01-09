"use client";

import { useEffect, useState, useRef } from "react";
import { getUserLibrary, LibraryItem, ReadingStatus } from "@/services/library-service";
import { novelService } from "@/services/novelService";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, BookOpen, Check, Calendar, Bookmark, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { NovelListDto } from "@/types/novel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface LibrarySummary extends LibraryItem {
    novel?: NovelListDto;
}

export default function UserLibraryList() {
    const { user } = useAuth();
    const [allItems, setAllItems] = useState<LibrarySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const libraryItems = await getUserLibrary(user.uid);

                const itemsWithNovels = await Promise.all(libraryItems.map(async (item) => {
                    try {
                        const novelData = await novelService.getNovelById(item.novelId);
                        return { ...item, novel: novelData as unknown as NovelListDto };
                    } catch (e) {
                        return item;
                    }
                }));

                setAllItems(itemsWithNovels);
            } catch (error) {
                console.error("Error fetching library", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const filterItems = (status: ReadingStatus | 'all') => {
        if (status === 'all') return allItems;
        return allItems.filter(item => item.status === status);
    };

    const StatusBadge = ({ status }: { status: ReadingStatus }) => {
        switch (status) {
            case 'reading': return <Badge className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"><BookOpen className="w-3 h-3 mr-1" /> Okuyorum</Badge>;
            case 'completed': return <Badge className="bg-green-500/10 text-green-400 hover:bg-green-500/20"><Check className="w-3 h-3 mr-1" /> Okudum</Badge>;
            case 'plan_to_read': return <Badge className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"><Calendar className="w-3 h-3 mr-1" /> Okuyacağım</Badge>;
            default: return null;
        }
    };

    const LibraryGrid = ({ items }: { items: LibrarySummary[] }) => {
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
                const firstItem = container.querySelector('.group') as HTMLElement;
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
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border border-dashed border-border/40 rounded-lg bg-black/5 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                        <Bookmark className="w-5 h-5 opacity-50" />
                        <p className="text-sm">Bu liste boş.</p>
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
                <Button
                    variant="outline"
                    size="icon"
                    className={`absolute right-12 -top-[4.5rem] h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-30 hidden md:flex transition-opacity ${(!showLeftArrow || isExpanded) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    onClick={() => scroll('left')}
                    aria-label="Sola kaydır"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

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
                            className={`group shrink-0 py-1 ${isExpanded
                                ? 'w-full sm:w-[calc((100%_-_2rem)_/_3)]'
                                : 'min-w-[85%] sm:w-[calc((100%_-_2rem)_/_3)] sm:min-w-0 snap-start'
                                }`}
                        >
                            <div className="flex h-32 bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10 rounded-xl transition-all p-3 gap-3 hover:bg-black/10 dark:hover:bg-zinc-800/60">
                                <div className="w-20 shrink-0 bg-muted rounded-lg overflow-hidden relative shadow-sm">
                                    {item.novel?.coverUrl && (
                                        <img src={item.novel.coverUrl} className="w-full h-full object-cover" alt="" />
                                    )}
                                </div>
                                <div className="flex flex-col justify-between flex-1 py-1">
                                    <div>
                                        <h4 className="font-medium line-clamp-1 group-hover:text-purple-400 transition-colors">{item.novel?.title || `Novel #${item.novelId}`}</h4>
                                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{item.novel?.author}</p>
                                        <StatusBadge status={item.status} />
                                    </div>
                                    <div className="flex justify-between items-end mt-auto">
                                        {item.status === 'reading' && (item.currentChapter || 0) > 0 && (
                                            <div className="flex items-center gap-0.5 text-[10px] font-medium text-blue-400 bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">
                                                {item.currentChapter}
                                                {item.novel?.chapterCount ? <span className="text-muted-foreground/50"> / {item.novel.chapterCount}</span> : ''}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-muted-foreground ml-auto">
                                            {item.updatedAt?.toDate().toLocaleDateString('tr-TR')}
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

    return (
        <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center gap-4 mb-4">
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <TabsList className="inline-flex w-max justify-start h-auto p-1 flex-nowrap bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10">
                        <TabsTrigger value="all" className="flex-none px-4">Hepsi {loading ? '' : allItems.length}</TabsTrigger>
                        <TabsTrigger value="reading" className="gap-2 flex-none px-4"><BookOpen className="w-4 h-4" /> Okuyorum {loading ? '' : filterItems('reading').length}</TabsTrigger>
                        <TabsTrigger value="completed" className="gap-2 flex-none px-4"><Check className="w-4 h-4" /> Okudum {loading ? '' : filterItems('completed').length}</TabsTrigger>
                        <TabsTrigger value="plan_to_read" className="gap-2 flex-none px-4"><Calendar className="w-4 h-4" /> Okuyacağım {loading ? '' : filterItems('plan_to_read').length}</TabsTrigger>
                    </TabsList>
                </div>
                {!loading && allItems.length > 3 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-muted-foreground hover:text-foreground hidden md:flex shrink-0 -mt-2"
                    >
                        {isExpanded ? "Daralt" : "Tümünü Gör"}
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-12 min-h-[160px] items-center"><Loader2 className="animate-spin text-purple-500" /></div>
            ) : allItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border border-dashed border-border/40 rounded-lg bg-black/5 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                        <Bookmark className="w-5 h-5 opacity-50" />
                        <p className="text-sm">Kütüphaneniz boş.</p>
                        <Link href="/">
                            <Button variant="link" className="text-purple-400 h-auto p-0 ml-1">Keşfet</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <TabsContent value="all" className="mt-0 animate-in fade-in-50 slide-in-from-left-1 min-h-[160px]">
                        <LibraryGrid items={filterItems('all')} />
                    </TabsContent>
                    <TabsContent value="reading" className="mt-0 animate-in fade-in-50 slide-in-from-left-1 min-h-[160px]">
                        <LibraryGrid items={filterItems('reading')} />
                    </TabsContent>
                    <TabsContent value="completed" className="mt-0 animate-in fade-in-50 slide-in-from-left-1 min-h-[160px]">
                        <LibraryGrid items={filterItems('completed')} />
                    </TabsContent>
                    <TabsContent value="plan_to_read" className="mt-0 animate-in fade-in-50 slide-in-from-left-1 min-h-[160px]">
                        <LibraryGrid items={filterItems('plan_to_read')} />
                    </TabsContent>
                </>
            )}
        </Tabs>
    );
}