"use client";

import { useEffect, useState } from "react";
import { getUserLibrary, LibraryItem, ReadingStatus } from "@/services/library-service";
import { novelService } from "@/services/novelService";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, BookOpen, Check, Calendar, Bookmark, Search } from "lucide-react";
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

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-purple-500" /></div>;
    }

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
        if (items.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border border-dashed border-border/40 rounded-lg">
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

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                    <Link href={`/novel/${item.novelId}`} key={item.novelId} className="group">
                        <div className="flex h-32 bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10 rounded-xl transition-all p-3 gap-3">
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
            </div >
        );
    };

    if (allItems.length === 0) {
        return (
            <div className="text-center py-16 bg-black/5 dark:bg-zinc-800/40 rounded-xl border border-black/5 dark:border-white/10">
                <Bookmark className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Kütüphaneniz boş</h3>
                <p className="text-muted-foreground mt-2 mb-6">İlginizi çeken romanları kütüphanenize ekleyerek takip edebilirsiniz.</p>
                <Link href="/" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium transition-colors">
                    Romanları Keşfet
                </Link>
            </div>
        );
    }

    return (
        <Tabs defaultValue="all" className="w-full">
            <div className="w-full overflow-x-auto pb-2 mb-4 scrollbar-hide">
                <TabsList className="inline-flex w-max justify-start h-auto p-1 flex-nowrap bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                    <TabsTrigger value="all" className="flex-none px-4">Hepsi {allItems.length}</TabsTrigger>
                    <TabsTrigger value="reading" className="gap-2 flex-none px-4"><BookOpen className="w-4 h-4" /> Okuyorum {filterItems('reading').length}</TabsTrigger>
                    <TabsTrigger value="completed" className="gap-2 flex-none px-4"><Check className="w-4 h-4" /> Okudum {filterItems('completed').length}</TabsTrigger>
                    <TabsTrigger value="plan_to_read" className="gap-2 flex-none px-4"><Calendar className="w-4 h-4" /> Okuyacağım {filterItems('plan_to_read').length}</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="all" className="mt-0 animate-in fade-in-50 slide-in-from-left-1">
                <LibraryGrid items={filterItems('all')} />
            </TabsContent>
            <TabsContent value="reading" className="mt-0 animate-in fade-in-50 slide-in-from-left-1">
                <LibraryGrid items={filterItems('reading')} />
            </TabsContent>
            <TabsContent value="completed" className="mt-0 animate-in fade-in-50 slide-in-from-left-1">
                <LibraryGrid items={filterItems('completed')} />
            </TabsContent>
            <TabsContent value="plan_to_read" className="mt-0 animate-in fade-in-50 slide-in-from-left-1">
                <LibraryGrid items={filterItems('plan_to_read')} />
            </TabsContent>
        </Tabs>
    );
}
