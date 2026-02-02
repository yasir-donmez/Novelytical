'use client';

import { useEffect, useState, useRef } from 'react';
import { getLatestReviews, Review } from '@/services/review-service';
import { novelService } from '@/services/novelService';
import {
    getLatestPosts,
    createPost,
    votePoll,
    Post,
    deletePost,
    initializeSignalR,
    PostComment,
    addComment,
    getPostComments,
    deleteComment,
    getUserSavedPostIds,
    getUserPollVotes,
    getPostsPaginated
} from '@/services/feed-service';
import { createNotification } from '@/services/notification-service';
import { LevelService, UserLevelData } from '@/services/level-service';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { PostCard } from './post-card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BarChart2 as PollIcon, X, MessageSquare, Star, BarChart2, Book, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { NovelSearchModal } from './novel-search-modal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PollVotersModal } from './poll-voters-modal';
import { RoomChat } from './room-chat';

interface MentionUser {
    id: string;
    username: string;
    image?: string;
}

function timeAgo(dateStr: string | undefined) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
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

function ReviewCard({ review }: { review: Review }) {
    return (
        <div className="bg-muted/30 p-3 sm:p-4 rounded-xl border border-white/5 mb-3 w-full scale-y-[-1]">
            <div className="flex items-center gap-3 mb-2">
                <UserAvatar src={review.userImage} alt={review.userName} className="w-8 h-8" />
                <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold truncate">{review.userName}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        inceledi: <span className="text-primary font-medium">{review.novelTitle || 'Unknown Novel'}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded text-yellow-500 text-xs font-bold shrink-0">
                    <Star size={12} fill="currentColor" /> {review.averageRating?.toFixed(1) || '0.0'}
                </div>
            </div>
            <p className="text-xs sm:text-sm text-foreground/80 line-clamp-3 leading-snug">{review.content}</p>
        </div>
    )
}

export function CommunityPulseOptimized() {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('feed');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [levelData, setLevelData] = useState<UserLevelData | null>(null);

    // New Post State
    const [postContent, setPostContent] = useState('');
    const [isPoll, setIsPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState<{ text: string, novelId?: number, novelTitle?: string, novelCover?: string }[]>([{ text: '' }, { text: '' }]);
    const [optionCount, setOptionCount] = useState<2 | 3 | 4>(2);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);

    // Infinite Scroll State
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Data State
    const [knownUsers, setKnownUsers] = useState<MentionUser[]>([]);
    const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
    const [viewingPollId, setViewingPollId] = useState<string | null>(null);
    const [activeUsers, setActiveUsers] = useState(142);

    // Optimistic UI State
    const [userVotes, setUserVotes] = useState<Record<number, number>>({});
    const [isVoting, setIsVoting] = useState(false);

    // Navigation State for Scrolling to Polls
    const [targetPollId, setTargetPollId] = useState<number | null>(null);
    const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
    const [activeRoomTitle, setActiveRoomTitle] = useState<string>('Canlı Akış');

    // Form State (Additional)
    const [isRoom, setIsRoom] = useState(false);
    const [roomTitle, setRoomTitle] = useState('');

    // Scroll to poll when tab changes
    useEffect(() => {
        if (activeTab === 'polls' && targetPollId) {
            // Slight delay to ensure render
            const timer = setTimeout(() => {
                const element = document.getElementById(`post-${targetPollId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight effect
                    element.classList.add('ring-2', 'ring-primary', 'rounded-xl');
                    setTimeout(() => {
                        if (element) {
                            element.classList.remove('ring-2', 'ring-primary', 'rounded-xl');
                        }
                        setTargetPollId(null); // Reset
                    }, 2000);
                } else {
                    console.log("Poll not found in view");
                }
            }, 300);
            return () => clearTimeout(timer);
        } else if (activeTab === 'rooms' && targetPollId) {
            // Handle navigating to room from feed
            setActiveRoomId(targetPollId);
            setTargetPollId(null);
        }
    }, [activeTab, targetPollId, posts]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Active Users Simulation
    useEffect(() => {
        setActiveUsers(Math.floor(Math.random() * (180 - 120 + 1)) + 120);
        const interval = setInterval(() => {
            setActiveUsers(prev => {
                const change = Math.floor(Math.random() * 7) - 3; // -3 to +3
                const newValue = prev + change;
                if (newValue < 100) return 100 + Math.floor(Math.random() * 10);
                if (newValue > 250) return 250 - Math.floor(Math.random() * 10);
                return newValue;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const latestReviewsRaw = await getLatestReviews(5);
            const enrichedReviews = await Promise.all(latestReviewsRaw.map(async (review) => {
                try {
                    const novel = await novelService.getNovelById(review.novelId);
                    return { ...review, novelTitle: novel.title, novelCover: novel.coverUrl };
                } catch (e) {
                    return review;
                }
            }));
            setReviews(enrichedReviews);

            if (user) {
                getUserSavedPostIds(user.uid).then((ids: any) => setSavedPostIds(ids as number[]));
                getUserPollVotes(user.uid).then(setUserVotes);
                LevelService.getUserLevelData(user.uid).then(setLevelData);
            }
        } catch (error) {
            console.error("Error fetching initial data", error);
        }
    };

    // Real-time Posts Subscription
    useEffect(() => {
        if (authLoading) return; // Wait for auth to settle

        const loadInitialData = async () => {
            setLoading(true);
            await fetchData(); // Reviews and user data

            try {
                // Fetch initial posts
                const { posts: initialPosts, lastVisible } = await getPostsPaginated(10, null);
                setPosts(initialPosts);
                setLastDoc(lastVisible);
                setHasMore(initialPosts.length === 10);
            } catch (err) {
                console.error("Failed to load posts", err);
                toast.error("Gönderiler yüklenemedi.");
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        // Initialize SignalR directly
        const connectionPromise = initializeSignalR(
            (newPost) => {
                setPosts(prev => {
                    // Check if exists
                    if (prev.some(p => p.id === newPost.id)) return prev;
                    return [newPost, ...prev];
                });
            },
            (postId, options) => {
                setPosts(prev => prev.map(p =>
                    p.id === postId ? { ...p, options: options } : p
                ));
            },
            (postId) => {
                setPosts(prev => prev.filter(p => p.id !== postId));
            },
            (newComment) => { },
            (postId, commentId) => { }
        );

        return () => {
            connectionPromise.then(conn => conn?.stop());
        };
    }, [user, authLoading]);

    // Load More Function
    const loadMore = async () => {
        if (loadingMore || !hasMore || !lastDoc) return;
        setLoadingMore(true);
        const { posts: newPosts, lastVisible } = await getPostsPaginated(10, lastDoc);

        if (newPosts.length > 0) {
            setPosts(prev => [...prev, ...newPosts]);
            setLastDoc(lastVisible);
            setHasMore(newPosts.length === 10);
        } else {
            setHasMore(false);
        }
        setLoadingMore(false);
    };

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
                    loadMore();
                }
            },
            { threshold: 1.0 }
        );
        const sentinel = document.getElementById("seed-sentinel");
        if (sentinel) observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loading, loadingMore, hasMore, lastDoc]);


    // Handlers
    const handleCreatePost = async () => {
        if (!user) {
            toast.error("Tartışma başlatmak için giriş yapmalısınız.");
            return;
        }
        if (!postContent.trim() && !isPoll && !isRoom) return;

        if (isPoll && pollOptions.some(opt => !opt.text.trim() && !opt.novelTitle)) {
            toast.error("Lütfen anket seçeneklerini doldurun.");
            return;
        }

        if (isRoom && !roomTitle.trim()) {
            toast.error("Lütfen oda başlığı girin.");
            return;
        }

        try {
            await createPost({
                content: postContent, // For rooms, content can be description or initial message
                type: isRoom ? 'room' : (isPoll ? 'poll' : 'text'),
                options: isPoll ? pollOptions.map((opt) => ({
                    text: opt.text || opt.novelTitle || '',
                    relatedNovelId: opt.novelId
                })) : undefined,
                durationHours: 24,
                roomTitle: isRoom ? roomTitle : undefined
            });

            // Notify Mentions
            const mentionRegex = /@(\w+)/g;
            const mentions = postContent.match(mentionRegex);
            if (mentions) {
                const uniqueMentions = [...new Set(mentions.map(m => m.slice(1)))];
                uniqueMentions.forEach(mentionedUsername => {
                    const mentionedUser = knownUsers.find(u => u.username === mentionedUsername);
                    if (mentionedUser && mentionedUser.id !== user.uid) {
                        createNotification(
                            mentionedUser.id,
                            'reply',
                            `${user.displayName || 'Birisi'} sizi toplulukta etiketledi`,
                            user.uid,
                            '/community',
                            user.uid,
                            user.displayName || 'Anonim',
                            user.photoURL || undefined
                        ).catch(err => console.error('Notification error:', err));
                    }
                });
            }

            toast.success("Gönderi paylaşıldı!");
            setPostContent('');
            setIsPoll(false);
            setIsRoom(false);
            setRoomTitle('');
            setOptionCount(2);
            setPollOptions([{ text: '' }, { text: '' }]);
        } catch (error) {
            console.error("Post creation error:", error);
            toast.error("Gönderi paylaşılamadı. Lütfen tekrar deneyin.");
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!confirm("Bu gönderiyi silmek istediğinize emin misiniz?")) return;
        try {
            await deletePost(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast.success("Gönderi silindi.");
        } catch (error) {
            toast.error("Silme işlemi başarısız.");
        }
    };

    const handleVote = async (postId: number, optionId: number) => {
        if (!user) {
            toast.error("Oy kullanmak için giriş yapın.");
            return;
        }
        if (isVoting) return;

        const post = posts.find(p => p.id === postId);
        if (post?.expiresAt && new Date(post.expiresAt) < new Date()) {
            toast.error("Bu anket kapanmıştır. Oy kullanılamaz.");
            return;
        }

        setIsVoting(true);
        const previousPosts = [...posts];
        const previousUserVotes = { ...userVotes };
        const currentVote = userVotes[postId];
        const newUserVotes = { ...userVotes };

        // Optimistic Update Logic
        const newPosts = posts.map(post => {
            if (post.id !== postId) return post;
            if (!post.options) return post;
            let newOptions = [...post.options];
            let newUserVotedOptionId = undefined;

            if (currentVote === undefined || currentVote === null) {
                newOptions = newOptions.map(opt => opt.id === optionId ? { ...opt, voteCount: opt.voteCount + 1 } : opt);
                newUserVotes[postId] = optionId;
                newUserVotedOptionId = optionId;
            } else if (currentVote !== optionId) {
                newOptions = newOptions.map(opt => {
                    if (opt.id === currentVote) return { ...opt, voteCount: Math.max(0, opt.voteCount - 1) };
                    if (opt.id === optionId) return { ...opt, voteCount: opt.voteCount + 1 };
                    return opt;
                });
                newUserVotes[postId] = optionId;
                newUserVotedOptionId = optionId;
            } else {
                newOptions = newOptions.map(opt => opt.id === optionId ? { ...opt, voteCount: Math.max(0, opt.voteCount - 1) } : opt);
                delete newUserVotes[postId];
                newUserVotedOptionId = undefined;
            }
            return { ...post, options: newOptions, userVotedOptionId: newUserVotedOptionId };
        });

        setPosts(newPosts);
        setUserVotes(newUserVotes);

        try {
            await votePoll(postId, optionId);
        } catch (error) {
            console.error("Vote error:", error);
            toast.error("Oy verilemedi. Geri alınıyor...");
            setPosts(previousPosts);
            setUserVotes(previousUserVotes);
        } finally {
            setIsVoting(false);
        }
    };

    const handleBookmark = async (postId: number) => {
        toast.info("Kaydetme özelliği bakımda.");
    };

    return (
        <section className="w-full mt-4 py-6 relative bg-gradient-to-b from-purple-500/10 via-background to-transparent border-t border-purple-500/20 rounded-xl overflow-hidden pb-6">
            {/* AMBIENT EFFECTS & DIVIDERS */}
            {/* Glowing Divider Line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_2px_rgba(168,85,247,0.6)]" />
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-purple-500/20 blur-[120px] pointer-events-none rounded-[100%]" />
            {/* Ambient Bottom Glow */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_20px_2px_rgba(236,72,153,0.6)] z-[-10]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-pink-500/20 blur-[120px] pointer-events-none rounded-[100%] z-[-10]" />

            {/* LAMPS */}
            <div className="absolute top-0 left-[-2rem] sm:left-0 z-[-10] pointer-events-none origin-top scale-50 sm:scale-75 flex flex-col items-center">
                <div className="w-[2px] h-[700px] bg-neutral-800/60 shrink-0" />
                <div className="origin-top rotate-0 relative z-10">
                    <div className="w-20 h-24 bg-neutral-900 mx-auto" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)' }}>
                        <div className="w-full h-full bg-gradient-to-t from-neutral-800 to-black border-l border-r border-white/5" />
                    </div>
                    <div className="relative z-10 w-20 h-10 bg-neutral-800 mx-auto rounded-b-full flex items-start justify-center overflow-hidden border border-white/10 ring-1 ring-purple-500/30 -mt-[1px]"><div className="absolute inset-0 bg-gradient-to-t from-purple-400/20 to-transparent" /><div className="w-16 h-8 bg-purple-500 blur-md rounded-b-full opacity-60 mt-[-2px]" /></div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-4 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                </div>
            </div>
            <div className="absolute top-0 right-[-2rem] sm:right-0 z-[-10] pointer-events-none origin-top scale-50 sm:scale-75 flex flex-col items-center">
                <div className="w-[2px] h-[300px] bg-neutral-800/60 shrink-0" />
                <div className="origin-top rotate-0 relative z-10">
                    <div className="w-20 h-24 bg-neutral-900 mx-auto" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)' }}>
                        <div className="w-full h-full bg-gradient-to-t from-neutral-800 to-black border-l border-r border-white/5" />
                    </div>
                    <div className="relative z-10 w-20 h-10 bg-neutral-800 mx-auto rounded-b-full flex items-start justify-center overflow-hidden border border-white/10 ring-1 ring-pink-500/30 -mt-[1px]"><div className="absolute inset-0 bg-gradient-to-t from-pink-400/20 to-transparent" /><div className="w-16 h-8 bg-pink-500 blur-md rounded-b-full opacity-60 mt-[-2px]" /></div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-4 w-24 h-24 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
                </div>
            </div>

            <div className="w-full relative z-10">
                <div className="w-full">
                    <div className="flex flex-col h-full w-full space-y-0">
                        {/* Header Tabs */}
                        <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0 w-full" onValueChange={setActiveTab}>
                            <div className="flex items-center justify-between gap-4 mb-4 select-none px-6 sm:px-16 max-w-7xl mx-auto w-full">
                                <TabsList className="bg-transparent p-0 gap-2 h-auto inline-flex border-0 rounded-none">
                                    <TabsTrigger
                                        value="feed"
                                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground/80"
                                    >
                                        <MessageSquare size={14} />
                                        <span className="hidden sm:inline">{activeRoomTitle.length > 15 ? activeRoomTitle.slice(0, 12) + "..." : activeRoomTitle}</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="polls"
                                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground/80"
                                    >
                                        <BarChart2 size={14} />
                                        <span className="hidden sm:inline">Anketler</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="reviews"
                                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground/80"
                                    >
                                        <Star size={14} />
                                        <span className="hidden sm:inline">Değerlendirmeler</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="rooms"
                                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground/80"
                                    >
                                        <MessageSquare size={14} />
                                        <span className="hidden sm:inline">Odalar</span>
                                    </TabsTrigger>
                                </TabsList>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span className="hidden sm:inline tabular-nums">{activeUsers} Aktif Kullanıcı</span>
                                </div>
                            </div>

                            <Card className="border-border/50 bg-background/40 backdrop-blur-md h-[calc(100vh-180px)] min-h-[500px] flex flex-col relative overflow-visible ring-1 ring-border/50 shadow-xl rounded-xl py-0 z-20">

                                {/* FEED TAB */}
                                <TabsContent value="feed" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    {activeRoomId ? (
                                        <div className="flex-1 min-h-0 h-full p-0">
                                            <RoomChat roomId={activeRoomId} user={user} />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative flex-1 min-h-0">
                                                <div ref={scrollRef} className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                                    {(loading || authLoading) ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                                        </div>
                                                    ) : posts.length === 0 ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                            <MessageSquare size={48} />
                                                            <p>Henüz gönderi yok. İlk sen ol!</p>
                                                        </div>
                                                    ) : (
                                                        posts.map((post) => (
                                                            <PostCard
                                                                key={post.id}
                                                                post={post}
                                                                user={user}
                                                                savedPostIds={savedPostIds}
                                                                onDelete={handleDeletePost}
                                                                onVote={handleVote}
                                                                onBookmark={handleBookmark}
                                                                onViewDetails={(id) => setViewingPollId(id.toString())}
                                                                isChatLayout={true}
                                                                showPollSummaryOnly={true}
                                                                className="scale-y-[-1]"
                                                                onGoToPoll={(id) => {
                                                                    if (post.type === 'room') {
                                                                        setActiveRoomId(id);
                                                                        setActiveRoomTitle(post.roomTitle || 'Sohbet Odası');
                                                                    } else {
                                                                        setActiveTab('polls');
                                                                        setTargetPollId(id);
                                                                    }
                                                                }}
                                                            />
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                            <div className="px-2 pb-2 pt-0 relative z-20">
                                                {/* Input Area (Same as before) */}
                                                <div className="flex flex-col gap-2 relative">
                                                    {isPoll && (
                                                        <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-950/95 p-3 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2 backdrop-blur-3xl">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                                                    <PollIcon size={12} className="text-primary" /> Anket Oluştur
                                                                </span>
                                                                <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10" onClick={() => {
                                                                    setIsPoll(false);
                                                                    setOptionCount(2);
                                                                    setPollOptions([{ text: '' }, { text: '' }]);
                                                                }}>
                                                                    <X size={14} />
                                                                </Button>
                                                            </div>

                                                            <div className="flex gap-1 mb-2">
                                                                <span className="text-[10px] text-muted-foreground self-center mr-1">Seçenek:</span>
                                                                {([2, 3, 4] as const).map((count) => (
                                                                    <button
                                                                        key={count}
                                                                        onClick={() => {
                                                                            setOptionCount(count);
                                                                            const newOpts = Array(count).fill(null).map((_, i) => pollOptions[i] || { text: '' });
                                                                            setPollOptions(newOpts);
                                                                        }}
                                                                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${optionCount === count
                                                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                                                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                                                            }`}
                                                                    >
                                                                        {count}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            <div className="space-y-2">
                                                                {pollOptions.map((opt, idx) => (
                                                                    <div key={idx} className="flex gap-2">
                                                                        <Input
                                                                            placeholder={`${idx + 1}. Seçenek`}
                                                                            value={opt.text}
                                                                            onChange={(e) => {
                                                                                const newOpts = [...pollOptions];
                                                                                newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                                                                                setPollOptions(newOpts);
                                                                            }}
                                                                            className="h-8 text-xs bg-muted/50 border-white/5"
                                                                        />
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                setActiveOptionIndex(idx);
                                                                                setIsSearchModalOpen(true);
                                                                            }}
                                                                            className="h-8 w-8 shrink-0 bg-background/50 border-white/10 hover:bg-primary/10 hover:text-primary transition-colors"
                                                                            title="Kitap Seç"
                                                                        >
                                                                            <Book size={14} />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isRoom && (
                                                        <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-950/95 p-3 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2 backdrop-blur-3xl">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                                                    <MessageSquare size={12} className="text-primary" /> Oda Oluştur
                                                                </span>
                                                                <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10" onClick={() => {
                                                                    setIsRoom(false);
                                                                    setRoomTitle('');
                                                                }}>
                                                                    <X size={14} />
                                                                </Button>
                                                            </div>
                                                            <Input
                                                                placeholder="Oda Başlığı"
                                                                value={roomTitle}
                                                                onChange={(e) => setRoomTitle(e.target.value)}
                                                                className="h-8 text-xs bg-muted/50 border-white/5"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 items-center bg-muted/30 p-1.5 rounded-3xl border border-white/5 focus-within:border-primary/30 focus-within:bg-muted/50 transition-all shadow-lg">
                                                        <UserAvatar src={user?.photoURL} alt={user?.displayName || "User"} className="w-8 h-8 ml-1 border border-white/10" frameId={levelData?.selectedFrame} />
                                                        <div className="flex-1 min-w-0">
                                                            <Input
                                                                placeholder={isPoll ? "Anket sorusu..." : (isRoom ? "Oda açıklaması (opsiyonel)..." : "Düşüncelerini paylaş...")}
                                                                value={postContent}
                                                                onChange={(e) => setPostContent(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        handleCreatePost();
                                                                    }
                                                                }}
                                                                className="h-9 border-0 bg-transparent focus-visible:ring-0 px-2 text-sm placeholder:text-muted-foreground/50"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1 pr-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={`h-8 w-8 rounded-full transition-colors ${isPoll ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                                                                onClick={() => {
                                                                    if (isRoom) setIsRoom(false);
                                                                    setIsPoll(!isPoll);
                                                                }}
                                                                title="Anket ekle"
                                                            >
                                                                <PollIcon size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={`h-8 w-8 rounded-full transition-colors ${isRoom ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                                                                onClick={() => {
                                                                    if (isPoll) setIsPoll(false);
                                                                    setIsRoom(!isRoom);
                                                                }}
                                                                title="Oda oluştur"
                                                            >
                                                                <MessageSquare size={16} />
                                                            </Button>
                                                            <Button size="sm" onClick={handleCreatePost} disabled={!postContent.trim() && !isPoll && !isRoom} className="h-8 rounded-full px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                                                                <span className="text-xs font-semibold">{(isPoll || isRoom) ? "Oluştur" : "Paylaş"}</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </TabsContent>

                                {/* POLLS TAB */}
                                <TabsContent value="polls" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    <div className="relative flex-1 min-h-0">
                                        <div className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                            {posts.filter(p => p.type === 'poll').length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                    <BarChart2 size={48} />
                                                    <p>Henüz anket yok.</p>
                                                </div>
                                            ) : (
                                                posts.filter(p => p.type === 'poll').map((post) => (
                                                    <PostCard
                                                        key={post.id}
                                                        id={`post-${post.id}`}
                                                        post={post}
                                                        user={user}
                                                        savedPostIds={savedPostIds}
                                                        onDelete={handleDeletePost}
                                                        onVote={handleVote}
                                                        onBookmark={handleBookmark}
                                                        onViewDetails={(id) => setViewingPollId(id.toString())}
                                                        className="scale-y-[-1]"
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* REVIEWS TAB */}
                                <TabsContent value="reviews" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    <div className="relative flex-1 min-h-0">
                                        <div className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                            {reviews.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                    <Star size={48} />
                                                    <p>Henüz değerlendirme yok.</p>
                                                </div>
                                            ) : (
                                                reviews.map((review) => (
                                                    <ReviewCard key={review.id} review={review} />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* ROOMS TAB */}
                                <TabsContent value="rooms" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    <div className="relative flex-1 min-h-0">
                                        <div className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain">
                                            {/* Main Room (Canlı Akış) Item */}
                                            <div
                                                onClick={() => {
                                                    setActiveRoomId(null);
                                                    setActiveRoomTitle('Canlı Akış');
                                                    setActiveTab('feed');
                                                }}
                                                className="bg-muted/30 p-4 rounded-xl border border-white/5 cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-all group flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                                                        <MessageSquare size={18} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Canlı Akış</h4>
                                                        <p className="text-xs text-muted-foreground">Ana Sohbet Odası</p>
                                                    </div>
                                                </div>
                                                <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
                                                    Ana Oda
                                                </div>
                                            </div>

                                            {/* Other Rooms */}
                                            {posts.filter(p => p.type === 'room').map(post => (
                                                <div
                                                    key={post.id}
                                                    onClick={() => {
                                                        setActiveRoomId(post.id);
                                                        setActiveRoomTitle(post.roomTitle || 'Room');
                                                        setActiveTab('feed');
                                                    }}
                                                    className="bg-purple-500/5 p-4 rounded-xl border border-white/5 cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/10 transition-all group relative overflow-hidden"
                                                >
                                                    <div className="flex items-center justify-between relative z-10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                                <MessageSquare size={18} className="text-purple-400 group-hover:text-purple-300" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-sm text-foreground group-hover:text-purple-400 transition-colors">{post.roomTitle}</h4>
                                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> {post.participantCount || 1} Katılımcı
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ArrowRight size={16} className="text-muted-foreground group-hover:text-purple-400 -ml-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                            </Card>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <NovelSearchModal
                open={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelect={(novel) => {
                    if (activeOptionIndex !== null) {
                        const newOpts = [...pollOptions];
                        newOpts[activeOptionIndex] = {
                            text: novel.title,
                            novelId: parseInt(novel.id, 10),
                            novelTitle: novel.title,
                            novelCover: novel.coverUrl
                        };
                        setPollOptions(newOpts);
                        setActiveOptionIndex(null);
                    }
                }}
            />

            {
                (() => {
                    const activePost = posts.find(p => p.id === (viewingPollId ? parseInt(viewingPollId) : -1));
                    if (!activePost || activePost.type !== 'poll') return null;

                    return (
                        <PollVotersModal
                            isOpen={!!viewingPollId}
                            onClose={() => setViewingPollId(null)}
                            postId={activePost.id.toString()}
                            pollOptions={activePost.options || []}
                        />
                    );
                })()
            }
        </section >
    );
}
