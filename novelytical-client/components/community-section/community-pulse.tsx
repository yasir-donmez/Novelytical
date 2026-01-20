'use client';

import { useEffect, useState, useRef } from 'react';
import { getLatestReviews, Review } from '@/services/review-service';
import { novelService } from '@/services/novelService';
import { getLatestPosts, createPost, votePoll, Post, toggleSavePost, getUserSavedPostIds, deletePost, getUserPollVotes, getPostsPaginated, subscribeToLatestPosts } from '@/services/feed-service';
import { createNotification } from '@/services/notification-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/ui/user-avatar';
import { UserHoverCard } from '@/components/ui/user-hover-card';
import { LevelService, UserLevelData } from '@/services/level-service';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
// ... other imports

// ... existing code ...


import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Star, ArrowRight, Flame, Send, BarChart2, BookOpen, Bookmark, Trash2, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { NovelSearchModal } from './novel-search-modal';
import { MentionInput, MentionUser } from './mention-input';
import { PollVotersModal } from './poll-voters-modal';

interface PollOptionData {
    text: string;
    novelId?: string;
    novelTitle?: string;
    novelCover?: string;
}

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

// Helper to render content with highlighted mentions
function renderContentWithMentions(content: string) {
    if (!content) return null;

    // Split by mention regex: @username (alphanumeric + underscore)
    // Using capturing group to keep the separator
    const parts = content.split(/(@\w+)/g);

    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            return (
                <span key={index} className="text-primary font-semibold hover:underline cursor-pointer">
                    {part}
                </span>
            );
        }
        return part;
    });
}

export function CommunityPulse() {
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

    // New Post State
    const [postContent, setPostContent] = useState('');
    const [isPoll, setIsPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState<PollOptionData[]>([{ text: '' }, { text: '' }]);
    const [optionCount, setOptionCount] = useState<2 | 3 | 4>(2);
    const [novelSearchOpen, setNovelSearchOpen] = useState(false);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [knownUsers, setKnownUsers] = useState<MentionUser[]>([]);
    const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
    const [viewingPollId, setViewingPollId] = useState<string | null>(null);
    const [activeUsers, setActiveUsers] = useState(142); // Initial fake base
    const scrollRef = useRef<HTMLDivElement>(null);
    const pollsScrollRef = useRef<HTMLDivElement>(null);
    const reviewsScrollRef = useRef<HTMLDivElement>(null);
    const [userVotes, setUserVotes] = useState<Record<string, number>>({}); // Optimistic UI için
    const [isVoting, setIsVoting] = useState(false);

    // Simulate active users fluctuation
    useEffect(() => {
        // Set initial random between 120-180
        setActiveUsers(Math.floor(Math.random() * (180 - 120 + 1)) + 120);

        const interval = setInterval(() => {
            setActiveUsers(prev => {
                const change = Math.floor(Math.random() * 7) - 3; // -3 to +3
                const newValue = prev + change;
                // Keep within realistic bounds
                if (newValue < 100) return 100 + Math.floor(Math.random() * 10);
                if (newValue > 250) return 250 - Math.floor(Math.random() * 10);
                return newValue;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // Fetch reviews
            const latestReviewsRaw = await getLatestReviews(5);

            // Enrich reviews with novel data
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
                // If initial load or clean slate
                if (prev.length === 0) {
                    setHasMore(realtimePosts.length === 20);
                    setLastDoc(lastVisible); // Set cursor for infinite scroll
                    return realtimePosts;
                }

                // MERGE LOGIC (Similar to Chat)
                const msgMap = new Map(prev.map(p => [p.id, p]));

                // Update/Add new posts
                realtimePosts.forEach(p => msgMap.set(p.id, p));

                // Convert back and sort DESC (Newest First)
                const merged = Array.from(msgMap.values()).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

                return merged;
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

        return () => {
            unsubscribe();
        };
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

            // Process known users for mentions
            const usersMap = new Map();
            newPosts.forEach(post => {
                if (post.userId && post.userName) {
                    usersMap.set(post.userName, { id: post.userId, username: post.userName, image: post.userImage });
                }
            });
            setKnownUsers(prev => {
                const newUsers = Array.from(usersMap.values());
                // Simple merge, could be optimized
                return [...prev, ...newUsers.filter(u => !prev.some(p => p.username === u.username))];
            });
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


    // Auto-scroll removed for infinite feed experience
    useEffect(() => {
        // Optional: restore scroll position if navigating back
    }, []);

    const handleCreatePost = async () => {
        if (!user) {
            toast.error("Tartışma başlatmak için giriş yapmalısınız.");
            return;
        }
        if (!postContent.trim() && !isPoll) return;
        if (isPoll && pollOptions.some(opt => !opt.text.trim() && !opt.novelId)) {
            toast.error("Lütfen anket seçeneklerini doldurun veya kitap seçin.");
            return;
        }

        try {
            await createPost(
                user.uid,
                user.displayName || 'Anonim',
                user.photoURL || undefined,
                levelData?.selectedFrame || undefined,
                postContent,
                isPoll ? 'poll' : 'text',
                isPoll ? pollOptions.map((opt, idx) => ({
                    id: idx,
                    text: opt.text || opt.novelTitle || '',
                    ...(opt.novelId && { novelId: opt.novelId }),
                    ...(opt.novelTitle && { novelTitle: opt.novelTitle }),
                    ...(opt.novelCover && { novelCover: opt.novelCover })
                })) : []
            );

            // Send notifications for mentions
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
            setOptionCount(2); // Reset option count
            setPollOptions([{ text: '' }, { text: '' }]);
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

        // Check if poll is expired
        const post = posts.find(p => p.id === postId);
        if (post?.expiresAt && post.expiresAt.toDate() < new Date()) {
            toast.error("Bu anket kapanmıştır. Oy kullanılamaz.");
            return;
        }

        setIsVoting(true);

        // --- Optimistic Update Start ---
        const previousPosts = [...posts];
        const previousUserVotes = { ...userVotes };
        const currentVote = userVotes[postId];

        let newUserVotes = { ...userVotes };

        // Calculate new posts state
        const newPosts = posts.map(post => {
            if (post.id !== postId) return post;
            if (!post.pollOptions) return post;

            let newOptions = [...post.pollOptions];

            if (currentVote === undefined || currentVote === null) {
                // New Vote
                newOptions = newOptions.map(opt =>
                    opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
                );
                newUserVotes[postId] = optionId;
            } else if (currentVote !== optionId) {
                // Change Vote
                newOptions = newOptions.map(opt => {
                    if (opt.id === currentVote) return { ...opt, votes: Math.max(0, opt.votes - 1) };
                    if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
                    return opt;
                });
                newUserVotes[postId] = optionId;
            } else {
                // Remove Vote (toggle off)
                newOptions = newOptions.map(opt =>
                    opt.id === optionId ? { ...opt, votes: Math.max(0, opt.votes - 1) } : opt
                );
                delete newUserVotes[postId];
            }

            return { ...post, pollOptions: newOptions };
        });

        // Apply updates
        setPosts(newPosts);
        setUserVotes(newUserVotes);

        // --- Optimistic Update End ---


        // Resolve user name - prefer display name, then email, then fetch from firestore
        let currentUserName = user.displayName;
        if (!currentUserName && user.email) {
            currentUserName = user.email.split('@')[0];
        }

        if (!currentUserName) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const d = userDoc.data();
                    currentUserName = d.username || d.displayName || d.name;
                }
            } catch (e) {
                console.error("Error fetching user profile for vote:", e);
            }
        }

        try {
            const result = await votePoll(
                postId,
                optionId,
                user.uid,
                currentUserName || 'Anonim',
                user.photoURL || undefined,
                levelData?.selectedFrame || undefined
            );

            // Success feedback (optional, since UI already updated)
            if (result.action === 'voted') {
                // toast.success("Oyunuz kaydedildi!"); 
            } else if (result.action === 'changed') {
                // toast.info("Oyunuz değiştirildi!");
            } else if (result.action === 'removed') {
                // toast.info("Oyunuz geri alındı.");
            }

            // No need to fetch data immediately, we are already up to date locally
            // But we can silently refresh in background if needed
        } catch (error) {
            console.error("Vote error:", error);
            toast.error("Oy verilemedi. Geri alınıyor...");
            // Revert changes on error
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

        // Optimistic update
        const isSaved = savedPostIds.includes(postId);
        setSavedPostIds(prev => isSaved ? prev.filter(id => id !== postId) : [...prev, postId]);

        try {
            const res = await toggleSavePost(user.uid, postId);
            if (res.action === 'saved') toast.success("Anket kaydedildi!");
            else toast.info("Anket kaydedilenlerden çıkarıldı.");
        } catch (error) {
            // Revert on error
            setSavedPostIds(prev => isSaved ? [...prev, postId] : prev.filter(id => id !== postId));
            toast.error("İşlem başarısız.");
        }
    };

    if (loading) {
        return (
            <section className="w-full mt-32 py-20 relative bg-gradient-to-b from-purple-500/10 via-background to-transparent border-t border-purple-500/20 min-h-[800px]">
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
            </section>
        );
    }

    return (
        <section className="w-full mt-32 py-20 relative bg-gradient-to-b from-purple-500/10 via-background to-transparent border-t border-purple-500/20">
            {/* Glowing Divider Line - The "Arrival" Signal */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_2px_rgba(168,85,247,0.6)]" />

            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-purple-500/20 blur-[120px] pointer-events-none rounded-[100%]" />

            {/* Ambient Bottom Glow */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_20px_2px_rgba(236,72,153,0.6)]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-pink-500/20 blur-[120px] pointer-events-none rounded-[100%]" />

            {/* Bottom Corner Hanging Spotlights (Ceiling Mounted) */}
            {/* Left Lamp Fixture */}
            <div className="absolute top-0 left-[-2rem] sm:left-0 z-10 pointer-events-none origin-top scale-50 sm:scale-75 flex flex-col items-center">
                {/* Hanging Cord - extends to top */}
                <div className="w-[2px] h-[700px] bg-neutral-800/60 shrink-0" />

                {/* Lamp Head Assembly (Rotated to point right/inward) */}
                <div className="origin-top rotate-0 relative z-10">
                    {/* Cone Body */}
                    <div className="w-20 h-24 bg-neutral-900 mx-auto" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)' }}>
                        <div className="w-full h-full bg-gradient-to-t from-neutral-800 to-black border-l border-r border-white/5" />
                    </div>

                    {/* Lens */}
                    <div className="relative z-10 w-20 h-10 bg-neutral-800 mx-auto rounded-b-full flex items-start justify-center overflow-hidden border border-white/10 ring-1 ring-purple-500/30 -mt-[1px]">
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-400/20 to-transparent" />
                        <div className="w-16 h-8 bg-purple-500 blur-md rounded-b-full opacity-60 mt-[-2px]" />
                    </div>

                    {/* Ambient Glow - stays in corner */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-4 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                </div>
            </div>

            {/* Right Lamp Fixture */}
            <div className="absolute top-0 right-[-2rem] sm:right-0 z-10 pointer-events-none origin-top scale-50 sm:scale-75 flex flex-col items-center">
                {/* Hanging Cord - extends to top */}
                <div className="w-[2px] h-[300px] bg-neutral-800/60 shrink-0" />

                {/* Lamp Head Assembly (Rotated to point left/inward) */}
                <div className="origin-top rotate-0 relative z-10">
                    {/* Cone Body */}
                    <div className="w-20 h-24 bg-neutral-900 mx-auto" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)' }}>
                        <div className="w-full h-full bg-gradient-to-t from-neutral-800 to-black border-l border-r border-white/5" />
                    </div>

                    {/* Lens */}
                    <div className="relative z-10 w-20 h-10 bg-neutral-800 mx-auto rounded-b-full flex items-start justify-center overflow-hidden border border-white/10 ring-1 ring-pink-500/30 -mt-[1px]">
                        <div className="absolute inset-0 bg-gradient-to-t from-pink-400/20 to-transparent" />
                        <div className="w-16 h-8 bg-pink-500 blur-md rounded-b-full opacity-60 mt-[-2px]" />
                    </div>

                    {/* Ambient Glow - stays in corner */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-4 w-24 h-24 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

                </div>
            </div>


            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">


                <div className="w-full">
                    {/* 2. Main Feed Area (Fixed Screen Layout) */}
                    <div className="flex flex-col h-full w-full max-w-5xl mx-auto space-y-0">
                        {/* New Header */}

                        <Tabs defaultValue="feed" className="flex-1 flex flex-col min-h-0 w-full" onValueChange={setActiveTab}>
                            <div className="flex items-center justify-between gap-4 mb-4 select-none">
                                <TabsList className="bg-transparent p-0 gap-2 h-auto inline-flex border-0 rounded-none">
                                    <TabsTrigger
                                        value="feed"
                                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5"
                                    >
                                        <MessageSquare size={14} />
                                        <span className="hidden sm:inline">Canlı Akış</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="polls"
                                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5"
                                    >
                                        <BarChart2 size={14} />
                                        <span className="hidden sm:inline">Anketler</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="reviews"
                                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5"
                                    >
                                        <Star size={14} />
                                        <span className="hidden sm:inline">Değerlendirmeler</span>
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

                            <Card className="border-border/50 bg-background/50 backdrop-blur-sm h-[calc(100vh-180px)] min-h-[500px] flex flex-col relative overflow-visible ring-1 ring-border/50 shadow-xl rounded-xl py-0 z-20">

                                {/* FEED TAB */}
                                <TabsContent value="feed" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    {/* Posts List (Scrollable Area) */}
                                    <div className="relative flex-1 min-h-0">




                                        <div ref={scrollRef} className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                            {posts.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                    <MessageSquare size={48} />
                                                    <p>Henüz gönderi yok. İlk sen ol!</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {posts.map((post) => {
                                                        const isOwner = user?.uid === post.userId;
                                                        return (
                                                            <div key={post.id} className={`w-full flex mb-2 sm:mb-3 ${isOwner ? 'justify-end' : 'justify-start'} scale-y-[-1]`}>
                                                                <div className={`flex gap-2 sm:gap-4 max-w-[95%] sm:max-w-[85%] min-w-0 ${isOwner ? 'flex-row-reverse' : 'flex-row'}`}>
                                                                    <UserHoverCard
                                                                        userId={post.userId}
                                                                        username={post.userName}
                                                                        image={post.userImage}
                                                                        frame={post.userFrame}
                                                                        className="shrink-0 self-start"
                                                                    >
                                                                        <UserAvatar
                                                                            src={post.userImage}
                                                                            alt={post.userName}
                                                                            frameId={post.userFrame}
                                                                            className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-105"
                                                                            fallbackClass="text-[10px] bg-primary/10 text-primary"
                                                                        />
                                                                    </UserHoverCard>
                                                                    <div className={`relative min-w-0 flex-1 p-2 sm:p-3 shadow-sm transition-all overflow-hidden
                                                            ${isOwner
                                                                            ? 'bg-primary/10 rounded-xl sm:rounded-2xl rounded-tr-none border border-primary/20'
                                                                            : 'bg-muted/30 rounded-xl sm:rounded-2xl rounded-tl-none border border-border/40'
                                                                        }
                                                        `}>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <UserHoverCard
                                                                                    userId={post.userId}
                                                                                    username={post.userName}
                                                                                    image={post.userImage}
                                                                                    frame={post.userFrame}
                                                                                >
                                                                                    <span className="font-semibold text-[11px] sm:text-xs text-foreground/90 hover:underline decoration-primary transition-all cursor-pointer">
                                                                                        {post.userName}
                                                                                    </span>
                                                                                </UserHoverCard>
                                                                                <span className="text-[10px] text-muted-foreground/60">{timeAgo(post.createdAt)}</span>
                                                                            </div>
                                                                            {/* Delete button for text posts only - top right */}
                                                                            {isOwner && post.type === 'text' && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-5 w-5 -mt-1 -mr-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                                    onClick={() => handleDeletePost(post.id)}
                                                                                    title="Sil"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </Button>
                                                                            )}
                                                                        </div>

                                                                        <p
                                                                            className="text-[11px] sm:text-xs text-foreground/80 leading-snug whitespace-pre-wrap break-all w-full"
                                                                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}
                                                                        >
                                                                            {renderContentWithMentions(post.content)}
                                                                        </p>

                                                                        {/* Poll Display */}
                                                                        {post.type === 'poll' && post.pollOptions && (
                                                                            <div className="mt-2 space-y-1.5 w-full sm:w-80">

                                                                                {post.pollOptions.map((opt, idx) => {
                                                                                    const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
                                                                                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);

                                                                                    // Vibrant Colors (Like original Feed)
                                                                                    const colors = [
                                                                                        { bg: 'from-purple-500/20 to-purple-600/20', glow: 'shadow-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
                                                                                        { bg: 'from-blue-500/20 to-blue-600/20', glow: 'shadow-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
                                                                                        { bg: 'from-pink-500/20 to-pink-600/20', glow: 'shadow-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400' },
                                                                                        { bg: 'from-green-500/20 to-green-600/20', glow: 'shadow-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
                                                                                    ];
                                                                                    const color = colors[idx % colors.length];

                                                                                    return (
                                                                                        <button
                                                                                            key={opt.id}
                                                                                            onClick={() => handleVote(post.id, opt.id)}
                                                                                            disabled={post.expiresAt && post.expiresAt.toDate() < new Date()}
                                                                                            className={`w-full relative h-10 sm:h-12 rounded-lg bg-black/5 dark:bg-zinc-700/50 transition-all duration-200 overflow-hidden border border-black/5 dark:border-white/10 ${post.expiresAt && post.expiresAt.toDate() < new Date()
                                                                                                ? 'cursor-default opacity-60'
                                                                                                : 'hover:bg-black/10 dark:hover:bg-zinc-700/70 hover:border-primary/20'
                                                                                                }`}
                                                                                        >
                                                                                            {/* Progress Bar */}
                                                                                            <div
                                                                                                className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color.bg} transition-all duration-700 ease-out`}
                                                                                                style={{ width: `${percentage}%` }}
                                                                                            />

                                                                                            <div className="absolute inset-0 flex items-center justify-between px-3.5 z-10">
                                                                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                                                                    {/* Novel Cover */}
                                                                                                    {opt.novelCover && (
                                                                                                        <div className="w-7 h-9 bg-muted/50 rounded-md overflow-hidden flex-shrink-0 relative shadow-sm border border-white/10">
                                                                                                            <Image
                                                                                                                src={opt.novelCover}
                                                                                                                alt={opt.novelTitle || 'Novel cover'}
                                                                                                                fill
                                                                                                                className="object-cover"
                                                                                                            />
                                                                                                        </div>
                                                                                                    )}
                                                                                                    <span className="font-medium truncate text-foreground text-xs sm:text-sm max-w-[60%] sm:max-w-[50%]">
                                                                                                        {opt.novelTitle || opt.text}
                                                                                                    </span>
                                                                                                </div>
                                                                                                {opt.votes > 0 && (
                                                                                                    <span className={`font-mono font-semibold ${color.text} ml-2 shrink-0 text-sm`}>
                                                                                                        {opt.votes}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </button>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}

                                                                        {/* Action Buttons and Vote Count - Bottom Row (Polls only) */}
                                                                        {post.type === 'poll' && (
                                                                            <div className="flex items-center justify-between mt-2">
                                                                                {/* Left: Action Buttons */}
                                                                                <div className="flex items-center gap-1">

                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className={`h-6 w-6 ${savedPostIds.includes(post.id) ? 'text-primary fill-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                                                                                        onClick={() => handleBookmark(post.id)}
                                                                                        title="Kaydet"
                                                                                    >
                                                                                        <Bookmark size={14} fill={savedPostIds.includes(post.id) ? "currentColor" : "none"} />
                                                                                    </Button>
                                                                                    {isOwner && (
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                                            onClick={() => handleDeletePost(post.id)}
                                                                                            title="Sil"
                                                                                        >
                                                                                            <Trash2 size={14} />
                                                                                        </Button>
                                                                                    )}

                                                                                    {/* Lock Icon for Expired Polls */}
                                                                                    {post.expiresAt && post.expiresAt.toDate() < new Date() && (
                                                                                        <span title="Anket kapandı - oy kullanılamaz" className="inline-flex cursor-default">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-6 w-6 text-muted-foreground pointer-events-none opacity-100"
                                                                                                disabled
                                                                                            >
                                                                                                <Lock size={14} />
                                                                                            </Button>
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Right: Vote Count and Details */}
                                                                                {post.pollOptions && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-6 text-[11px] text-muted-foreground hover:text-primary px-2 gap-1.5"
                                                                                        onClick={() => setViewingPollId(post.id)}
                                                                                    >
                                                                                        <span className="font-semibold">{post.pollOptions.reduce((acc, curr) => acc + curr.votes, 0)} oy</span>
                                                                                        <span className="opacity-60">• Detaylar</span>
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {/* Sentinel for Infinite Scroll */}
                                                    <div id="seed-sentinel" className="h-8 w-full flex justify-center py-4 scale-y-[-1]">
                                                        {loadingMore && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Input Area (Fixed Bottom) */}
                                    <div className="px-2 pb-2 pt-0 relative z-20">
                                        <div className="flex flex-col gap-2 relative">
                                            {isPoll && (
                                                <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-950/95 p-3 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2 backdrop-blur-3xl">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                                            <BarChart2 size={12} className="text-primary" /> Anket Oluştur
                                                        </span>
                                                        <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10" onClick={() => {
                                                            setIsPoll(false);
                                                            setOptionCount(2);
                                                            setPollOptions([{ text: '' }, { text: '' }]);
                                                        }}>×</Button>
                                                    </div>

                                                    {/* Option Count Selector */}
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
                                                            <div key={idx} className="space-y-1.5">
                                                                {!opt.novelId ? (
                                                                    /* Text Input Mode */
                                                                    <div className="flex gap-1.5">
                                                                        <Input
                                                                            placeholder={`${idx + 1}. Seçenek ${idx === 0 ? '(metin veya kitap)' : ''}`}
                                                                            value={opt.text}
                                                                            onChange={(e) => {
                                                                                const newOpts = [...pollOptions];
                                                                                newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                                                                                setPollOptions(newOpts);
                                                                            }}
                                                                            className="flex-1 h-8 text-[11px] bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                setSelectedOptionIndex(idx);
                                                                                setNovelSearchOpen(true);
                                                                            }}
                                                                            className="shrink-0 text-[10px] h-8 px-2"
                                                                        >
                                                                            <BookOpen size={12} className="mr-1" />
                                                                            Kitap
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    /* Novel Preview Mode */
                                                                    <div className="flex items-center gap-2 p-1.5 bg-primary/5 rounded-md border border-primary/20 group">
                                                                        {opt.novelCover && (
                                                                            <div className="w-6 h-8 bg-muted rounded overflow-hidden flex-shrink-0">
                                                                                <img src={opt.novelCover} alt={opt.novelTitle} className="w-full h-full object-cover" />
                                                                            </div>
                                                                        )}
                                                                        <span className="text-[10px] font-medium flex-1 truncate text-foreground/90">{opt.novelTitle}</span>

                                                                        <div className="flex items-center gap-1">
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                onClick={() => {
                                                                                    setSelectedOptionIndex(idx);
                                                                                    setNovelSearchOpen(true);
                                                                                }}
                                                                                className="h-6 px-2 text-[9px] text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                            >
                                                                                Değiştir
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                onClick={() => {
                                                                                    const newOpts = [...pollOptions];
                                                                                    newOpts[idx] = { text: '' }; // Reset to empty text
                                                                                    setPollOptions(newOpts);
                                                                                }}
                                                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                                            >
                                                                                ×
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2 items-end bg-muted/30 p-1.5 rounded-xl border border-transparent focus-within:border-primary/20 transition-all min-w-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setIsPoll(!isPoll)}
                                                    className={`h-8 w-8 rounded-full shrink-0 ${isPoll ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                                    title="Anket Ekle"
                                                >
                                                    <BarChart2 size={16} />
                                                </Button>

                                                <div className="flex-1 min-w-0">
                                                    <MentionInput
                                                        value={postContent}
                                                        onChange={setPostContent}
                                                        onSubmit={handleCreatePost}
                                                        users={knownUsers}
                                                        placeholder={user ? "Düşüncelerini paylaş... (@etkileşim)" : "Giriş yap"}
                                                        className="min-h-[32px] max-h-[100px] bg-transparent border-0 focus-visible:ring-0 px-2 py-1.5 text-xs placeholder:text-muted-foreground/50 shadow-none"
                                                        minHeight="32px"
                                                    />
                                                </div>

                                                <Button
                                                    size="icon"
                                                    onClick={handleCreatePost}
                                                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-all shrink-0"
                                                    disabled={(!postContent.trim() && !isPoll) || !user}
                                                >
                                                    <Send size={14} className={postContent.trim() ? "translate-x-0.5" : ""} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* POLLS TAB */}
                                <TabsContent value="polls" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    <div ref={pollsScrollRef} className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                        {posts.filter(p => p.type === 'poll').length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 pt-12 scale-y-[-1]">
                                                <BarChart2 size={40} className="text-primary/50" />
                                                <p className="text-sm">Henüz anket yok</p>
                                            </div>
                                        ) : posts.filter(p => p.type === 'poll').map((post) => (
                                            <div key={post.id} className="flex gap-4 w-full max-w-2xl mx-auto scale-y-[-1]">
                                                <UserHoverCard
                                                    userId={post.userId}
                                                    username={post.userName}
                                                    image={post.userImage}
                                                    frame={post.userFrame}
                                                    className="shrink-0 self-start"
                                                >
                                                    <UserAvatar
                                                        src={post.userImage}
                                                        alt={post.userName}
                                                        frameId={post.userFrame}
                                                        className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-105"
                                                        fallbackClass="text-[10px] bg-primary/10 text-primary"
                                                    />
                                                </UserHoverCard>

                                                <div className="flex flex-col min-w-0 items-start w-full">
                                                    <div className="flex items-center gap-2 mb-1 px-1">
                                                        <UserHoverCard
                                                            userId={post.userId}
                                                            username={post.userName}
                                                            image={post.userImage}
                                                            frame={post.userFrame}
                                                        >
                                                            <span className="text-sm font-bold text-foreground/90 hover:underline decoration-primary cursor-pointer">
                                                                {post.userName}
                                                            </span>
                                                        </UserHoverCard>
                                                        <span className="text-[10px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
                                                    </div>

                                                    <div className={`relative px-2 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm w-full bg-zinc-900 border border-zinc-800`}>

                                                        {post.content && (
                                                            <div className="text-[11px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words mb-2 sm:mb-3">
                                                                {renderContentWithMentions(post.content)}
                                                            </div>
                                                        )}

                                                        {post.pollOptions && post.pollOptions.length > 0 && (
                                                            <div className="space-y-1.5 mt-2 w-full sm:w-80">
                                                                {post.pollOptions.map((opt, idx) => {
                                                                    const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
                                                                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);

                                                                    const colors = [
                                                                        { bg: 'from-purple-500/20 to-purple-600/20', glow: 'shadow-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
                                                                        { bg: 'from-blue-500/20 to-blue-600/20', glow: 'shadow-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
                                                                        { bg: 'from-pink-500/20 to-pink-600/20', glow: 'shadow-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400' },
                                                                        { bg: 'from-green-500/20 to-green-600/20', glow: 'shadow-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
                                                                    ];
                                                                    const color = colors[idx % colors.length];

                                                                    return (
                                                                        <button
                                                                            key={opt.id}
                                                                            onClick={() => handleVote(post.id, opt.id)}
                                                                            disabled={post.expiresAt && post.expiresAt.toDate() < new Date()}
                                                                            className={`w-full relative h-9 sm:h-12 rounded-lg bg-black/5 dark:bg-zinc-700/50 transition-all duration-200 overflow-hidden border border-black/5 dark:border-white/10 ${post.expiresAt && post.expiresAt.toDate() < new Date()
                                                                                ? 'cursor-not-allowed opacity-60'
                                                                                : 'hover:bg-black/10 dark:hover:bg-zinc-700/70 hover:border-primary/20'
                                                                                }`}
                                                                        >
                                                                            <div
                                                                                className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color.bg} transition-all duration-700 ease-out`}
                                                                                style={{ width: `${percentage}%` }}
                                                                            />

                                                                            <div className="absolute inset-0 flex items-center justify-between px-3.5 z-10">
                                                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                                                    {opt.novelCover && (
                                                                                        <div className="w-7 h-9 bg-muted/50 rounded-md overflow-hidden flex-shrink-0 relative shadow-sm border border-white/10">
                                                                                            <img
                                                                                                src={opt.novelCover}
                                                                                                alt={opt.novelTitle || 'Novel cover'}
                                                                                                className="w-full h-full object-cover"
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                    <span className="font-medium truncate text-foreground text-xs sm:text-sm max-w-[60%] sm:max-w-[50%]">
                                                                                        {opt.novelTitle || opt.text}
                                                                                    </span>
                                                                                </div>
                                                                                {opt.votes > 0 && (
                                                                                    <span className={`font-mono font-semibold ${color.text} ml-2 shrink-0 text-sm`}>
                                                                                        {opt.votes}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* Footer */}
                                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                                                            <div className="flex gap-3">
                                                                {post.expiresAt && post.expiresAt.toDate() < new Date() && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-muted-foreground"
                                                                        title="Anket kapandı - oy kullanılamaz"
                                                                        disabled
                                                                    >
                                                                        <Lock size={14} />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className={`h-6 w-6 ${savedPostIds.includes(post.id) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                                                    onClick={() => handleBookmark(post.id)}
                                                                >
                                                                    <Bookmark size={14} className={savedPostIds.includes(post.id) ? 'fill-current' : ''} />
                                                                </Button>
                                                                {(user?.uid === post.userId || user?.email === 'admin@novelytical.com') && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                        onClick={() => handleDeletePost(post.id)}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                                    {post.pollOptions?.reduce((acc, curr) => acc + curr.votes, 0) || 0} oy
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">•</span>
                                                                <div
                                                                    onClick={() => setViewingPollId(post.id)}
                                                                    className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                                                >
                                                                    Detaylar
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* REVIEWS TAB */}
                                <TabsContent value="reviews" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    <div ref={reviewsScrollRef} className="absolute inset-x-0 top-3 bottom-3 px-3 overflow-y-auto space-y-4 custom-scrollbar overscroll-y-contain scale-y-[-1]">
                                        {reviews.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 scale-y-[-1]">
                                                <p className="text-center text-muted-foreground py-8 text-sm">Henüz inceleme yok.</p>
                                            </div>
                                        ) : (
                                            reviews.map((review) => (
                                                <div key={review.id} className="flex gap-4 w-full max-w-2xl mx-auto scale-y-[-1]">
                                                    <UserHoverCard
                                                        userId={review.userId}
                                                        username={review.userName}
                                                        image={review.userImage}
                                                        frame={review.userFrame}
                                                        className="shrink-0 self-start"
                                                    >
                                                        <UserAvatar
                                                            src={review.userImage}
                                                            alt={review.userName}
                                                            frameId={review.userFrame}
                                                            className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-105"
                                                            fallbackClass="text-[10px] bg-primary/10 text-primary"
                                                        />
                                                    </UserHoverCard>

                                                    <div className="flex flex-col min-w-0 items-start w-full">
                                                        <div className="flex items-center gap-2 mb-1 px-1">
                                                            <UserHoverCard
                                                                userId={review.userId}
                                                                username={review.userName}
                                                                image={review.userImage}
                                                                frame={review.userFrame}
                                                            >
                                                                <span className="text-sm font-bold text-foreground/90 hover:underline decoration-primary cursor-pointer">
                                                                    {review.userName}
                                                                </span>
                                                            </UserHoverCard>
                                                            <span className="text-[10px] text-muted-foreground">{timeAgo(review.createdAt)}</span>
                                                        </div>

                                                        <div className="relative px-2 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm w-full bg-zinc-900 border border-zinc-800">
                                                            {/* Rating */}
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <TooltipProvider>
                                                                    <Tooltip delayDuration={0}>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full text-xs font-medium border border-yellow-500/20 cursor-help hover:bg-yellow-500/20 transition-colors">
                                                                                <Star size={10} className="fill-current" />
                                                                                <span>{review.averageRating}</span>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-zinc-950 border-zinc-800 text-zinc-100 p-3 shadow-xl z-50" side="right" sideOffset={5}>
                                                                            <div className="space-y-1.5 text-xs min-w-[140px]">
                                                                                <div className="flex justify-between border-b border-white/10 pb-1.5 mb-1.5">
                                                                                    <span className="text-zinc-400 font-medium">Değerlendirme</span>
                                                                                    <span className="font-bold text-yellow-500">{review.averageRating}</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center"><span className="text-zinc-300">Kurgu:</span> <b className="text-purple-400 ml-2">{review.ratings?.story || '-'}</b></div>
                                                                                <div className="flex justify-between items-center"><span className="text-zinc-300">Karakterler:</span> <b className="text-purple-400 ml-2">{review.ratings?.characters || '-'}</b></div>
                                                                                <div className="flex justify-between items-center"><span className="text-zinc-300">Dünya:</span> <b className="text-purple-400 ml-2">{review.ratings?.world || '-'}</b></div>
                                                                                <div className="flex justify-between items-center"><span className="text-zinc-300">Akıcılık:</span> <b className="text-purple-400 ml-2">{review.ratings?.flow || '-'}</b></div>
                                                                                <div className="flex justify-between items-center"><span className="text-zinc-300">Dilbilgisi:</span> <b className="text-purple-400 ml-2">{review.ratings?.grammar || '-'}</b></div>
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>

                                                            {/* Content */}
                                                            <div className="text-[11px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words mb-2 sm:mb-3 font-serif italic text-foreground/80 pl-2 border-l-2 border-primary/20">
                                                                "{review.content}"
                                                            </div>

                                                            {/* Novel Card */}
                                                            <Link href={`/novel/${review.novelId}`} className="block group/card">
                                                                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5 hover:bg-black/60 hover:border-primary/20 transition-all">
                                                                    <div className="w-10 h-14 bg-muted/20 rounded overflow-hidden shrink-0 shadow-sm border border-white/5 relative">
                                                                        {review.novelCover ? (
                                                                            <img src={review.novelCover} alt={review.novelTitle} className="w-full h-full object-cover" />
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
                                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 group-hover/card:text-primary/80 transition-colors">
                                                                            <span>İncelemeye Git</span>
                                                                            <ArrowRight size={10} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground group-hover/card:bg-primary/10 group-hover/card:text-primary transition-all">
                                                                        <ArrowRight size={14} />
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>
                            </Card>
                        </Tabs >
                    </div >
                </div >
            </div >

            {/* Novel Search Modal */}
            < NovelSearchModal
                open={novelSearchOpen}
                onClose={() => {
                    setNovelSearchOpen(false);
                    setSelectedOptionIndex(null);
                }
                }
                onSelect={(novel) => {
                    if (selectedOptionIndex !== null) {
                        const newOpts = [...pollOptions];
                        newOpts[selectedOptionIndex] = {
                            ...newOpts[selectedOptionIndex], // Preserve existing props
                            text: newOpts[selectedOptionIndex].text || novel.title,
                            novelId: novel.id,
                            novelTitle: novel.title,
                            novelCover: novel.coverImage || novel.coverUrl
                        };
                        setPollOptions(newOpts);
                    }
                }}
            />

            {/* Poll Voters Modal */}
            <PollVotersModal
                isOpen={!!viewingPollId}
                onClose={() => setViewingPollId(null)}
                postId={viewingPollId || ''}
                pollOptions={posts.find(p => p.id === viewingPollId)?.pollOptions || []}
            />
        </section >
    );
}
