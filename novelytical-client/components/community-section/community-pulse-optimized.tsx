'use client';

import { useEffect, useState, useRef } from 'react';
import { getLatestReviews, Review } from '@/services/review-service';
import { novelService } from '@/services/novelService';
import { createPost, votePoll, Post, toggleSavePost, getUserSavedPostIds, deletePost, getUserPollVotes, getPostsPaginated, subscribeToLatestPosts } from '@/services/feed-service';
import { createNotification } from '@/services/notification-service';
import { LevelService, UserLevelData } from '@/services/level-service';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Star, BarChart2, BookOpen, ArrowRight, Lock, Bookmark, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

import { MentionUser } from './mention-input';
import { PollVotersModal } from './poll-voters-modal'; // Assuming this is still needed or will be refactored later
import { PostCard } from './post-card';
import { CreatePostForm } from './create-post-form';
import { CommunitySkeleton } from './community-skeleton';

interface PollOptionData {
    text: string;
    novelId?: string;
    novelTitle?: string;
    novelCover?: string;
}

export function CommunityPulseOptimized() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('feed');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [levelData, setLevelData] = useState<UserLevelData | null>(null);

    // Infinite Scroll State
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Data State
    const [knownUsers, setKnownUsers] = useState<MentionUser[]>([]);
    const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
    const [viewingPollId, setViewingPollId] = useState<string | null>(null);
    const [activeUsers, setActiveUsers] = useState(142);

    // Optimistic UI State
    const [userVotes, setUserVotes] = useState<Record<string, number>>({});
    const [isVoting, setIsVoting] = useState(false);

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
                getUserSavedPostIds(user.uid).then(setSavedPostIds);
                getUserPollVotes(user.uid).then(setUserVotes);
                LevelService.getUserLevelData(user.uid).then(setLevelData);
            }
        } catch (error) {
            console.error("Error fetching initial data", error);
        }
    };

    // Real-time Posts Subscription
    useEffect(() => {
        fetchData();
        setLoading(true);

        const unsubscribe = subscribeToLatestPosts(20, (realtimePosts, lastVisible) => {
            setPosts(prev => {
                if (prev.length === 0) {
                    setHasMore(realtimePosts.length === 20);
                    setLastDoc(lastVisible);
                    return realtimePosts;
                }
                const msgMap = new Map(prev.map(p => [p.id, p]));
                realtimePosts.forEach(p => msgMap.set(p.id, p));
                return Array.from(msgMap.values()).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            });
            setLoading(false);

            // Process known users
            const usersMap = new Map();
            realtimePosts.forEach(post => {
                if (post.userId && post.userName) {
                    usersMap.set(post.userName, { id: post.userId, username: post.userName, image: post.userImage });
                }
            });
            setKnownUsers(prev => {
                const newUsers = Array.from(usersMap.values());
                return [...prev, ...newUsers.filter(u => !prev.some(p => p.username === u.username))];
            });
        });

        return () => unsubscribe();
    }, [user]);

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
    const handleCreatePost = async (content: string, isPoll: boolean, pollOptions: PollOptionData[]) => {
        if (!user) {
            toast.error("Tartışma başlatmak için giriş yapmalısınız.");
            return;
        }

        try {
            await createPost(
                user.uid,
                user.displayName || 'Anonim',
                user.photoURL || undefined,
                levelData?.selectedFrame || undefined,
                content,
                isPoll ? 'poll' : 'text',
                isPoll ? pollOptions.map((opt, idx) => ({
                    id: idx,
                    text: opt.text || opt.novelTitle || '',
                    ...(opt.novelId && { novelId: opt.novelId }),
                    ...(opt.novelTitle && { novelTitle: opt.novelTitle }),
                    ...(opt.novelCover && { novelCover: opt.novelCover })
                })) : []
            );

            // Notify Mentions
            const mentionRegex = /@(\w+)/g;
            const mentions = content.match(mentionRegex);
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
            fetchData();
        } catch (error) {
            console.error("Post creation error:", error);
            toast.error("Gönderi paylaşılamadı. Lütfen tekrar deneyin.");
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Bu gönderiyi silmek istediğinize emin misiniz?")) return;
        try {
            await deletePost(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast.success("Gönderi silindi.");
        } catch (error) {
            toast.error("Silme işlemi başarısız.");
        }
    };

    const handleVote = async (postId: string, optionId: number) => {
        if (!user) {
            toast.error("Oy kullanmak için giriş yapın.");
            return;
        }
        if (isVoting) return;

        const post = posts.find(p => p.id === postId);
        if (post?.expiresAt && post.expiresAt.toDate() < new Date()) {
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
            if (!post.pollOptions) return post;
            let newOptions = [...post.pollOptions];
            if (currentVote === undefined || currentVote === null) {
                newOptions = newOptions.map(opt => opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt);
                newUserVotes[postId] = optionId;
            } else if (currentVote !== optionId) {
                newOptions = newOptions.map(opt => {
                    if (opt.id === currentVote) return { ...opt, votes: Math.max(0, opt.votes - 1) };
                    if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
                    return opt;
                });
                newUserVotes[postId] = optionId;
            } else {
                newOptions = newOptions.map(opt => opt.id === optionId ? { ...opt, votes: Math.max(0, opt.votes - 1) } : opt);
                delete newUserVotes[postId];
            }
            return { ...post, pollOptions: newOptions };
        });

        setPosts(newPosts);
        setUserVotes(newUserVotes);

        try {
            let currentUserName = user.displayName || (user.email?.split('@')[0]);
            if (!currentUserName) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) currentUserName = userDoc.data().username;
            }

            await votePoll(
                postId,
                optionId,
                user.uid,
                currentUserName || 'Anonim',
                user.photoURL || undefined,
                levelData?.selectedFrame || undefined
            );
        } catch (error) {
            console.error("Vote error:", error);
            toast.error("Oy verilemedi. Geri alınıyor...");
            setPosts(previousPosts);
            setUserVotes(previousUserVotes);
        } finally {
            setIsVoting(false);
        }
    };

    const handleBookmark = async (postId: string) => {
        if (!user) {
            toast.error("Kaydetmek için giriş yapın.");
            return;
        }
        const isSaved = savedPostIds.includes(postId);
        setSavedPostIds(prev => isSaved ? prev.filter(id => id !== postId) : [...prev, postId]);
        try {
            const res = await toggleSavePost(user.uid, postId);
            if (res.action === 'saved') toast.success("Kaydedildi!");
            else toast.info("Kaydedilenlerden çıkarıldı.");
        } catch (error) {
            setSavedPostIds(prev => isSaved ? [...prev, postId] : prev.filter(id => id !== postId));
            toast.error("İşlem başarısız.");
        }
    };



    return (
        <section className="w-full mt-4 py-6 relative bg-gradient-to-b from-purple-500/10 via-background to-transparent border-t border-purple-500/20 rounded-xl overflow-hidden">
            {/* AMBIENT EFFECTS & DIVIDERS */}
            {/* Glowing Divider Line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_2px_rgba(168,85,247,0.6)]" />
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-purple-500/20 blur-[120px] pointer-events-none rounded-[100%]" />
            {/* Ambient Bottom Glow */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_20px_2px_rgba(236,72,153,0.6)]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-pink-500/20 blur-[120px] pointer-events-none rounded-[100%]" />

            {/* LAMPS */}
            <div className="absolute top-0 left-[-2rem] sm:left-0 z-10 pointer-events-none origin-top scale-50 sm:scale-75 flex flex-col items-center">
                <div className="w-[2px] h-[700px] bg-neutral-800/60 shrink-0" />
                <div className="origin-top rotate-0 relative z-10">
                    <div className="w-20 h-24 bg-neutral-900 mx-auto" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)' }}>
                        <div className="w-full h-full bg-gradient-to-t from-neutral-800 to-black border-l border-r border-white/5" />
                    </div>
                    <div className="relative z-10 w-20 h-10 bg-neutral-800 mx-auto rounded-b-full flex items-start justify-center overflow-hidden border border-white/10 ring-1 ring-purple-500/30 -mt-[1px]"><div className="absolute inset-0 bg-gradient-to-t from-purple-400/20 to-transparent" /><div className="w-16 h-8 bg-purple-500 blur-md rounded-b-full opacity-60 mt-[-2px]" /></div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-4 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                </div>
            </div>
            <div className="absolute top-0 right-[-2rem] sm:right-0 z-10 pointer-events-none origin-top scale-50 sm:scale-75 flex flex-col items-center">
                <div className="w-[2px] h-[300px] bg-neutral-800/60 shrink-0" />
                <div className="origin-top rotate-0 relative z-10">
                    <div className="w-20 h-24 bg-neutral-900 mx-auto" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)' }}>
                        <div className="w-full h-full bg-gradient-to-t from-neutral-800 to-black border-l border-r border-white/5" />
                    </div>
                    <div className="relative z-10 w-20 h-10 bg-neutral-800 mx-auto rounded-b-full flex items-start justify-center overflow-hidden border border-white/10 ring-1 ring-pink-500/30 -mt-[1px]"><div className="absolute inset-0 bg-gradient-to-t from-pink-400/20 to-transparent" /><div className="w-16 h-8 bg-pink-500 blur-md rounded-b-full opacity-60 mt-[-2px]" /></div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-4 w-24 h-24 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="w-full relative">
                <div className="flex flex-col h-full w-full space-y-0">

                    <Tabs defaultValue="feed" className="flex-1 flex flex-col min-h-0 w-full" onValueChange={setActiveTab}>
                        <div className="flex items-center justify-between gap-4 mb-4 select-none px-4 sm:px-12">
                            <TabsList className="bg-transparent p-0 gap-2 h-auto inline-flex border-0 rounded-none">
                                <TabsTrigger value="feed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5"><MessageSquare size={14} /><span className="hidden sm:inline">Canlı Akış</span></TabsTrigger>
                                <TabsTrigger value="polls" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5"><BarChart2 size={14} /><span className="hidden sm:inline">Anketler</span></TabsTrigger>
                                <TabsTrigger value="reviews" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5"><Star size={14} /><span className="hidden sm:inline">Değerlendirmeler</span></TabsTrigger>
                            </TabsList>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                                <span className="hidden sm:inline tabular-nums">{activeUsers} Aktif Kullanıcı</span>
                            </div>
                        </div>

                        <Card className="mx-4 sm:mx-12 border-border/50 bg-background/50 backdrop-blur-sm h-[calc(100vh-180px)] min-h-[500px] flex flex-col relative overflow-visible ring-1 ring-border/50 shadow-xl rounded-xl py-0 z-20">

                            <TabsContent value="feed" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                <div className="relative flex-1 min-h-0">
                                    <div ref={scrollRef} className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                        {loading ? (
                                            <div className="h-full flex flex-col items-center justify-center scale-y-[-1]">
                                                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                            </div>
                                        ) : posts.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                <MessageSquare size={48} />
                                                <p>Henüz gönderi yok. İlk sen ol!</p>
                                            </div>
                                        ) : (
                                            <>
                                                {posts.map((post) => (
                                                    <PostCard
                                                        key={post.id}
                                                        post={post}
                                                        user={user}
                                                        savedPostIds={savedPostIds}
                                                        onDelete={handleDeletePost}
                                                        onVote={handleVote}
                                                        onBookmark={handleBookmark}
                                                        onViewDetails={setViewingPollId}
                                                    />
                                                ))}
                                                <div id="seed-sentinel" className="h-8 w-full flex justify-center py-4 scale-y-[-1]">
                                                    {loadingMore && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <CreatePostForm user={user} onPostCreate={handleCreatePost} knownUsers={knownUsers} />
                            </TabsContent>

                            <TabsContent value="polls" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                <div className="relative flex-1 min-h-0">
                                    <div className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                        {loading ? (
                                            <div className="h-full flex flex-col items-center justify-center scale-y-[-1]">
                                                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                            </div>
                                        ) : posts.filter(p => p.type === 'poll').length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                <BarChart2 size={40} className="text-primary/50" />
                                                <p className="text-sm">Henüz anket yok</p>
                                            </div>
                                        ) : (
                                            posts.filter(p => p.type === 'poll').map((post) => (
                                                <PostCard
                                                    key={post.id}
                                                    post={post}
                                                    user={user}
                                                    savedPostIds={savedPostIds}
                                                    onDelete={handleDeletePost}
                                                    onVote={handleVote}
                                                    onBookmark={handleBookmark}
                                                    onViewDetails={setViewingPollId}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="reviews" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                <div className="relative flex-1 min-h-0">
                                    <div className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                        {loading ? (
                                            <div className="h-full flex flex-col items-center justify-center scale-y-[-1]">
                                                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                            </div>
                                        ) : reviews.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                <p className="text-center text-muted-foreground py-8 text-sm">Henüz inceleme yok.</p>
                                            </div>
                                        ) : (
                                            reviews.map((review) => (
                                                <div key={review.id} className="flex gap-4 w-full mx-auto scale-y-[-1]">
                                                    <div className="w-full bg-zinc-900/40 border border-white/5 rounded-xl p-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-8 w-8 rounded-full bg-muted overflow-hidden relative">
                                                                    {review.userImage ? <Image src={review.userImage} alt={review.userName} fill className="object-cover" /> : null}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-semibold text-foreground/90">{review.userName}</div>
                                                                    <div className="text-[10px] text-muted-foreground">İnceleme yaptı</div>
                                                                </div>
                                                            </div>
                                                            <TooltipProvider>
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full text-xs font-medium border border-yellow-500/20 cursor-help">
                                                                            <Star size={10} className="fill-current" />
                                                                            <span>{review.averageRating}</span>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="bg-zinc-950 border-zinc-800 text-zinc-100 p-3 shadow-xl z-50" side="left">
                                                                        <div className="space-y-1.5 text-xs min-w-[140px]">
                                                                            <div className="flex justify-between border-b border-white/10 pb-1.5 mb-1.5">
                                                                                <span className="text-zinc-400 font-medium">Ortalama</span>
                                                                                <span className="font-bold text-yellow-500">{review.averageRating}</span>
                                                                            </div>
                                                                            {review.ratings && Object.entries(review.ratings).map(([key, val]) => (
                                                                                <div key={key} className="flex justify-between items-center">
                                                                                    <span className="text-zinc-300 capitalize">{key}:</span>
                                                                                    <b className="text-purple-400 ml-2">{val}</b>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>

                                                        <div className="text-sm italic text-foreground/80 mb-3 pl-3 border-l-2 border-primary/20">
                                                            &quot;{review.content}&quot;
                                                        </div>

                                                        <Link href={`/novel/${review.novelId}`} className="block group/card">
                                                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5 hover:bg-black/60 hover:border-primary/20 transition-all">
                                                                <div className="relative w-10 h-14 bg-muted/20 rounded overflow-hidden shrink-0 shadow-sm border border-white/5">
                                                                    {review.novelCover ? (
                                                                        <Image src={review.novelCover} alt={review.novelTitle || ""} className="object-cover" fill sizes="40px" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <BookOpen size={16} className="text-muted-foreground/50" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-semibold truncate text-foreground/90 group-hover/card:text-primary transition-colors">
                                                                        {review.novelTitle || `Roman #${review.novelId}`}
                                                                    </h4>
                                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                                                        <span>İncelemeye Git</span>
                                                                        <ArrowRight size={10} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                        </Card>
                    </Tabs>
                </div>
            </div>

            {viewingPollId && (
                <PollVotersModal
                    isOpen={!!viewingPollId}
                    onClose={() => setViewingPollId(null)}
                    postId={viewingPollId}
                    pollOptions={posts.find(p => p.id === viewingPollId)?.pollOptions || []}
                />
            )}
        </section>
    );
}
