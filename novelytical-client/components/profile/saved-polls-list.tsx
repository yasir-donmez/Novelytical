import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getSavedPostsData, Post, toggleSavePost, getUserCreatedPolls } from "@/services/feed-service";
import { BarChart2, Bookmark, ExternalLink, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserHoverCard } from "@/components/ui/user-hover-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";
import { PollVotersModal } from "@/components/community-section/poll-voters-modal";

function timeAgo(date: any) {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - date.toDate().getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " yıl önce";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " ay önce";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " gün önce";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " saat önce";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " dakika önce";
    return "Az önce";
}

export default function SavedPollsList() {
    const { user } = useAuth();
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [createdPosts, setCreatedPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [savedLoaded, setSavedLoaded] = useState(false);
    const [createdLoaded, setCreatedLoaded] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState("saved");
    const [viewingPollId, setViewingPollId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        loadPosts();
    }, [user]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            if (user) {
                const [savedData, createdData] = await Promise.all([
                    getSavedPostsData(user.uid),
                    getUserCreatedPolls(user.uid)
                ]);

                setSavedPosts(savedData.filter(p => p.type === 'poll'));
                setSavedLoaded(true);

                setCreatedPosts(createdData);
                setCreatedLoaded(true);
            }
        } catch (error) {
            console.error("Failed to load polls", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsave = async (postId: string) => {
        if (!user) return;
        try {
            await toggleSavePost(user.uid, postId);
            setSavedPosts(prev => prev.filter(p => p.id !== postId));
            toast.success("Anket kaydedilenlerden kaldırıldı.");
        } catch (error) {
            toast.error("İşlem başarısız.");
        }
    };

    const currentPosts = activeTab === "saved" ? savedPosts : createdPosts;

    const PollGrid = ({ items }: { items: Post[] }) => {
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

        // Mask style
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
                    className={`absolute right-12 -top-[3.5rem] h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-30 hidden md:flex transition-opacity ${(!showLeftArrow || isExpanded) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    onClick={() => scroll('left')}
                    aria-label="Sola kaydır"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Right Arrow */}
                <Button
                    variant="outline"
                    size="icon"
                    className={`absolute right-0 -top-[3.5rem] h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-30 hidden md:flex transition-opacity ${(!showRightArrow || isExpanded) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    onClick={() => scroll('right')}
                    aria-label="Sağa kaydır"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                <div
                    ref={scrollContainerRef}
                    onScroll={!isExpanded ? checkScroll : undefined}
                    className={`relative z-10 flex pt-2 pb-4 gap-4 scrollbar-hide items-stretch ${isExpanded ? 'flex-wrap' : 'overflow-x-auto snap-x snap-mandatory'}`}
                    style={maskStyle}
                >
                    {items.map((post) => (
                        <div
                            key={post.id}
                            className={`group-item shrink-0 relative flex flex-col p-4 rounded-xl bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5 border border-primary/10 hover:border-primary/20 transition-all shadow-sm h-full ${isExpanded
                                ? 'w-full md:w-[calc(50%_-_0.5rem)]'
                                : 'min-w-[85%] md:min-w-0 md:w-[calc(50%_-_8px)] snap-start'
                                }`}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-3">
                                <UserHoverCard
                                    userId={post.userId}
                                    username={post.userName}
                                    image={post.userImage}
                                    frame={post.userFrame}
                                    className="shrink-0"
                                >
                                    <UserAvatar
                                        src={post.userImage}
                                        alt={post.userName}
                                        frameId={post.userFrame}
                                        className="h-9 w-9 border border-border"
                                        fallbackClass="bg-primary/10 text-primary"
                                    />
                                </UserHoverCard>
                                <div className="flex-1 min-w-0">
                                    <UserHoverCard
                                        userId={post.userId}
                                        username={post.userName}
                                        image={post.userImage}
                                        frame={post.userFrame}
                                    >
                                        <p className="font-semibold text-sm truncate hover:underline decoration-primary cursor-pointer">{post.userName}</p>
                                    </UserHoverCard>
                                    <p className="text-[10px] text-muted-foreground">{timeAgo(post.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-0.5 -mr-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={() => setViewingPollId(post.id)}
                                        title="Detaylar"
                                    >
                                        <BarChart2 size={14} />
                                    </Button>

                                    {activeTab === "saved" && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-primary hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleUnsave(post.id)}
                                            title="Kaydetmeyi Kaldır"
                                        >
                                            <Bookmark size={14} fill="currentColor" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            {post.content && (
                                <p className="text-xs text-foreground/90 mb-3 line-clamp-2 min-h-[2.5rem]">{post.content}</p>
                            )}

                            {/* Poll Options Preview */}
                            {post.pollOptions && (
                                <div className="space-y-1.5 mt-auto">
                                    {post.pollOptions.slice(0, 4).map((opt, idx) => {
                                        const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
                                        const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);

                                        // Vibrant Colors
                                        const colors = [
                                            { bg: 'from-purple-500/20 to-purple-600/20', text: 'text-purple-400' },
                                            { bg: 'from-blue-500/20 to-blue-600/20', text: 'text-blue-400' },
                                            { bg: 'from-pink-500/20 to-pink-600/20', text: 'text-pink-400' },
                                            { bg: 'from-green-500/20 to-green-600/20', text: 'text-green-400' },
                                        ];
                                        const color = colors[idx % colors.length];

                                        return (
                                            <div key={opt.id} className={`relative h-8 rounded-md bg-black/5 dark:bg-zinc-700/50 overflow-hidden border border-black/5 dark:border-white/10`}>
                                                <div
                                                    className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color.bg}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-between px-2">
                                                    <span className="text-[10px] font-medium truncate flex-1">{opt.novelTitle || opt.text}</span>
                                                    {opt.votes > 0 && <span className={`text-[10px] font-bold ${color.text} ml-1`}>{opt.votes}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {post.pollOptions.length > 4 && (
                                        <p className="text-[10px] text-center text-muted-foreground">+{post.pollOptions.length - 4} seçenek daha</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <Tabs defaultValue="saved" className="w-full" onValueChange={setActiveTab} value={activeTab}>
                <div className="flex items-center gap-4 mb-4">
                    {/* Header always visible */}
                    <div className="overflow-x-auto pb-2 scrollbar-hide">
                        <TabsList className="inline-flex w-max justify-start h-auto p-1 flex-nowrap bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10">
                            <TabsTrigger value="saved" className="flex-none px-4">
                                Anketler {savedLoaded && <span className="ml-1 font-bold">{savedPosts.length}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="created" className="flex-none px-4">
                                Geçmiş Anketler {createdLoaded && <span className="ml-1 font-bold">{createdPosts.length}</span>}
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    {!loading && currentPosts.length > 2 && (
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
                    <div className="p-12 text-center text-muted-foreground animate-pulse min-h-[290px] flex items-center justify-center">
                        Yükleniyor...
                    </div>
                ) : currentPosts.length === 0 ? (
                    <div className="text-center py-12 bg-black/5 dark:bg-zinc-800/40 rounded-xl border border-black/5 dark:border-white/10 min-h-[290px] flex flex-col items-center justify-center">
                        <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">Anket yok</h3>
                        <p className="text-muted-foreground mt-2">
                            {activeTab === "saved" ? "Kaydedilen anketler burada görünür." : "Henüz bir anket oluşturmadınız."}
                        </p>
                    </div>
                ) : (
                    <div className="mt-0 animate-in fade-in-50 slide-in-from-left-1 min-h-[290px]">
                        <PollGrid items={currentPosts} />
                    </div>
                )}
            </Tabs>
            {viewingPollId && (
                <PollVotersModal
                    isOpen={!!viewingPollId}
                    onClose={() => setViewingPollId(null)}
                    postId={viewingPollId}
                    pollOptions={currentPosts.find(p => p.id === viewingPollId)?.pollOptions || []}
                />
            )}
        </>
    );
}
