'use client';

import { useEffect, useState, useRef } from 'react';
import { getLatestReviews, Review } from '@/services/review-service';
import { getLatestPosts, createPost, votePoll, Post, toggleSavePost, getUserSavedPostIds, deletePost } from '@/services/feed-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// ... other imports

// ... existing code ...


import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Star, ArrowRight, Flame, Send, BarChart2, BookOpen, Bookmark, Trash2 } from 'lucide-react';
import Link from 'next/link';
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

    const fetchData = async () => {
        try {
            const [latestReviews, latestPosts] = await Promise.all([
                getLatestReviews(5),
                getLatestPosts(20)
            ]);
            setReviews(latestReviews);
            setPosts(latestPosts);

            if (user) {
                getUserSavedPostIds(user.uid).then(setSavedPostIds);
            }

            // Extract unique users for mentions
            const usersMap = new Map<string, MentionUser>();
            [...latestReviews, ...latestPosts].forEach((item: any) => {
                if (item.userId && item.userName) {
                    usersMap.set(item.userId, {
                        id: item.userId,
                        username: item.userName,
                        image: item.userImage
                    });
                }
            });
            setKnownUsers(Array.from(usersMap.values()));
        } catch (error) {
            console.error("Failed to fetch community data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
                postContent,
                isPoll ? 'poll' : 'text',
                isPoll ? pollOptions.map(opt => opt.novelId ? opt.novelTitle || opt.text : opt.text) : []
            );
            toast.success("Gönderi paylaşıldı!");
            setPostContent('');
            setIsPoll(false);
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
            toast.success("Gönderi silindi.");
            fetchData();
        } catch (error) {
            toast.error("Silme işlemi başarısız.");
        }
    };

    const handleVote = async (postId: string, optionId: number) => {
        if (!user) {
            toast.error("Oy kullanmak için giriş yapın.");
            return;
        }
        try {
            const result = await votePoll(
                postId,
                optionId,
                user.uid,
                user.displayName || user.email?.split('@')[0] || 'Anonim',
                user.photoURL || undefined
            );

            // Different feedback based on action
            if (result.action === 'voted') {
                toast.success("Oyunuz kaydedildi!");
            } else if (result.action === 'changed') {
                toast.info("Oyunuz değiştirildi!");
            } else if (result.action === 'removed') {
                toast.info("Oyunuz geri alındı.");
            }

            fetchData();
        } catch (error) {
            console.error("Vote error:", error);
            toast.error("Oy verilemedi. Lütfen tekrar deneyin.");
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

    if (loading) return null;

    return (
        <section className="w-full mt-32 py-20 relative bg-gradient-to-b from-purple-500/10 via-background to-transparent border-t border-purple-500/20">
            {/* Glowing Divider Line - The "Arrival" Signal */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_2px_rgba(168,85,247,0.6)]" />

            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-40 bg-purple-500/20 blur-[120px] pointer-events-none rounded-[100%]" />

            {/* Bottom Corner Hanging Spotlights (Ceiling Mounted) */}
            {/* Left Lamp Fixture */}
            <div className="absolute bottom-[-1.5rem] left-[-2rem] sm:left-0 z-10 pointer-events-none scale-75 sm:scale-100 flex flex-col items-center h-96">
                {/* Ceiling Mount Bar */}
                <div className="w-20 h-2 bg-neutral-900/80 rounded-full border-b border-white/10 shadow-lg" />

                {/* Hanging Cord */}
                <div className="w-[2px] h-48 bg-neutral-800/60" />

                {/* Pivot Point */}
                <div className="w-5 h-5 bg-neutral-700 rounded-full border border-white/10 shadow-md -mb-1 relative z-0" />

                {/* Lamp Head Assembly (Rotated to point right/inward) */}
                <div className="origin-top -rotate-[135deg] relative z-10 translate-y-3 -translate-x-2">
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
            <div className="absolute bottom-[-1.5rem] right-[-2rem] sm:right-0 z-10 pointer-events-none scale-75 sm:scale-100 flex flex-col items-center h-96">
                {/* Ceiling Mount Bar */}
                <div className="w-20 h-2 bg-neutral-900/80 rounded-full border-b border-white/10 shadow-lg" />

                {/* Hanging Cord */}
                <div className="w-[2px] h-48 bg-neutral-800/60" />

                {/* Pivot Point */}
                <div className="w-5 h-5 bg-neutral-700 rounded-full border border-white/10 shadow-md -mb-1 relative z-0" />

                {/* Lamp Head Assembly (Rotated to point left/inward) */}
                <div className="origin-top rotate-[135deg] relative z-10 translate-y-3 translate-x-2">
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
                    <div className="w-full max-w-4xl mx-auto">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="flex items-center justify-between mb-4">
                                <TabsList className="bg-transparent p-0 gap-2 sm:gap-4 h-auto flex-wrap">
                                    <TabsTrigger
                                        value="feed"
                                        className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium"
                                    >
                                        Canlı Akış
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="polls"
                                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium flex items-center gap-1.5"
                                    >
                                        <BarChart2 size={14} />
                                        Anketler
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="reviews"
                                        className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 border border-transparent data-[state=active]:border-primary/20 transition-all font-medium"
                                    >
                                        Değerlendirmeler
                                    </TabsTrigger>
                                </TabsList>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span className="hidden sm:inline">Topluluk Nabzı</span>
                                </div>
                            </div>

                            <Card className="border-border/50 bg-background/50 backdrop-blur-sm h-[600px] flex flex-col relative overflow-hidden ring-1 ring-border/50 shadow-xl rounded-xl">

                                {/* FEED TAB */}
                                <TabsContent value="feed" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    {/* Posts List (Scrollable Area) */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/30">
                                        {posts.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50">
                                                <MessageSquare size={48} />
                                                <p>Henüz gönderi yok. İlk sen ol!</p>
                                            </div>
                                        ) : posts.map((post) => (
                                            <div key={post.id} className="group flex gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <Avatar className="h-10 w-10 border border-border mt-1">
                                                    <AvatarImage src={post.userImage} />
                                                    <AvatarFallback>{post.userName[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline justify-between w-full">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="font-semibold text-sm text-foreground/90">{post.userName}</span>
                                                            <span className="text-[10px] text-muted-foreground/60">{timeAgo(post.createdAt)}</span>
                                                        </div>
                                                        {post.type === 'poll' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={`h-6 w-6 -mr-2 ${savedPostIds.includes(post.id) ? 'text-primary fill-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                                                                onClick={() => handleBookmark(post.id)}
                                                            >
                                                                <Bookmark size={16} fill={savedPostIds.includes(post.id) ? "currentColor" : "none"} />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <p className="mt-1 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                                        {renderContentWithMentions(post.content)}
                                                    </p>

                                                    {/* Poll Display */}
                                                    {post.type === 'poll' && post.pollOptions && (
                                                        <div className="mt-3 space-y-2 w-full max-w-sm">
                                                            {/* Expired Badge */}
                                                            {post.expiresAt && post.expiresAt.toDate() < new Date() && (
                                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50 mb-2">
                                                                    <span className="text-xs font-semibold text-muted-foreground opacity-75">🔒 Anket Kapandı</span>
                                                                </div>
                                                            )}
                                                            {post.pollOptions.map((opt, idx) => {
                                                                const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
                                                                const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                                                                const isExpired = post.expiresAt && post.expiresAt.toDate() < new Date();

                                                                // Different gradient colors for each option
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
                                                                        className={`w-full relative h-10 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all duration-300 overflow-hidden text-xs group/poll border ${color.border} hover:shadow-lg ${color.glow} hover:scale-[1.02]`}
                                                                    >
                                                                        {/* Progress Bar with Gradient */}
                                                                        <div
                                                                            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color.bg} transition-all duration-700 ease-out backdrop-blur-sm`}
                                                                            style={{ width: `${percentage}%` }}
                                                                        />

                                                                        {/* Glow Effect */}
                                                                        <div
                                                                            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color.bg} blur-sm opacity-50`}
                                                                            style={{ width: `${percentage}%` }}
                                                                        />

                                                                        <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                {/* Novel Cover */}
                                                                                {opt.novelCover && (
                                                                                    <div className="w-6 h-8 bg-muted rounded overflow-hidden flex-shrink-0">
                                                                                        <img src={opt.novelCover} alt={opt.novelTitle} className="w-full h-full object-cover" />
                                                                                    </div>
                                                                                )}
                                                                                <span className="font-semibold truncate text-foreground">
                                                                                    {opt.novelTitle || opt.text}
                                                                                </span>
                                                                            </div>
                                                                            <span className={`font-mono font-bold ${color.text} ml-2 shrink-0`}>{percentage}%</span>
                                                                        </div>
                                                                    </button>
                                                                )
                                                            })}
                                                            <div className="flex justify-end mt-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 text-[10px] text-muted-foreground hover:text-primary px-2 gap-1"
                                                                    onClick={() => setViewingPollId(post.id)}
                                                                >
                                                                    <span className="font-semibold">{post.pollOptions.reduce((acc, curr) => acc + curr.votes, 0)} oy</span>
                                                                    <span className="opacity-60">• Detaylar</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Input Area (Fixed Bottom) */}
                                    <div className="p-4 bg-zinc-950/90 backdrop-blur-3xl border-t border-white/10 sticky bottom-0 z-20 shadow-[-10px_-10px_30px_rgba(0,0,0,0.5)]">
                                        <div className="flex flex-col gap-3 relative">
                                            {isPoll && (
                                                <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-950/95 p-4 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2 backdrop-blur-3xl">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-sm font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                                            <BarChart2 size={14} className="text-primary" /> Anket Oluştur
                                                        </span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10" onClick={() => setIsPoll(false)}>×</Button>
                                                    </div>

                                                    {/* Option Count Selector */}
                                                    <div className="flex gap-1.5 mb-3">
                                                        <span className="text-xs text-muted-foreground self-center mr-1">Seçenek:</span>
                                                        {([2, 3, 4] as const).map((count) => (
                                                            <button
                                                                key={count}
                                                                onClick={() => {
                                                                    setOptionCount(count);
                                                                    const newOpts = Array(count).fill(null).map((_, i) => pollOptions[i] || { text: '' });
                                                                    setPollOptions(newOpts);
                                                                }}
                                                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${optionCount === count
                                                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
                                                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                                                    }`}
                                                            >
                                                                {count}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="space-y-3">
                                                        {pollOptions.map((opt, idx) => (
                                                            <div key={idx} className="space-y-2">
                                                                {/* Text Input */}
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        placeholder={`${idx + 1}. Seçenek ${idx === 0 ? '(metin veya kitap)' : ''}`}
                                                                        value={opt.text}
                                                                        onChange={(e) => {
                                                                            const newOpts = [...pollOptions];
                                                                            newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                                                                            setPollOptions(newOpts);
                                                                        }}
                                                                        className="flex-1 h-9 text-xs bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
                                                                        disabled={!!opt.novelId}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant={opt.novelId ? "secondary" : "outline"}
                                                                        onClick={() => {
                                                                            setSelectedOptionIndex(idx);
                                                                            setNovelSearchOpen(true);
                                                                        }}
                                                                        className="shrink-0 text-xs h-9"
                                                                    >
                                                                        <BookOpen size={14} className="mr-1" />
                                                                        {opt.novelId ? 'Değiştir' : 'Kitap Ekle'}
                                                                    </Button>
                                                                </div>

                                                                {/* Novel Preview */}
                                                                {opt.novelId && (
                                                                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                                                                        {opt.novelCover && (
                                                                            <div className="w-8 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                                                                                <img src={opt.novelCover} alt={opt.novelTitle} className="w-full h-full object-cover" />
                                                                            </div>
                                                                        )}
                                                                        <span className="text-xs font-medium flex-1 truncate">{opt.novelTitle}</span>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => {
                                                                                const newOpts = [...pollOptions];
                                                                                newOpts[idx] = { text: newOpts[idx].text };
                                                                                setPollOptions(newOpts);
                                                                            }}
                                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                                        >
                                                                            ×
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2 items-end bg-muted/30 p-2 rounded-2xl border border-transparent focus-within:border-primary/20 transition-all">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setIsPoll(!isPoll)}
                                                    className={`h-9 w-9 rounded-full shrink-0 ${isPoll ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                                    title="Anket Ekle"
                                                >
                                                    <BarChart2 size={18} />
                                                </Button>

                                                <div className="flex-1">
                                                    <MentionInput
                                                        value={postContent}
                                                        onChange={setPostContent}
                                                        users={knownUsers}
                                                        placeholder={user ? "Toplulukla paylaş... (@ ile etiketle)" : "Paylaşım yapmak için giriş yap"}
                                                        className="min-h-[36px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 px-2 py-2 text-sm placeholder:text-muted-foreground/50 shadow-none"
                                                        minHeight="36px"
                                                    />
                                                </div>

                                                <Button
                                                    size="icon"
                                                    onClick={handleCreatePost}
                                                    className="h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-all shrink-0"
                                                    disabled={(!postContent.trim() && !isPoll) || !user}
                                                >
                                                    <Send size={16} className={postContent.trim() ? "translate-x-0.5" : ""} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* POLLS TAB */}
                                <TabsContent value="polls" className="flex-1 flex flex-col h-full mt-0 data-[state=inactive]:hidden">
                                    <div className="space-y-2 pb-24 overflow-y-auto max-h-[600px] scrollbar-hide px-1">
                                        {posts.filter(p => p.type === 'poll').length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 pt-12">
                                                <BarChart2 size={40} className="text-primary/50" />
                                                <p className="text-sm">Henüz anket yok</p>
                                            </div>
                                        ) : posts.filter(p => p.type === 'poll').map((post) => (
                                            <div key={post.id} className="relative group pl-2 py-1">
                                                {/* Left Line - Thinner and closer */}
                                                <div className="absolute left-0 top-2 bottom-0 w-[1px] bg-border/30 group-last:hidden" />

                                                <div className="flex gap-2.5">
                                                    {/* Avatar - Even Smaller */}
                                                    <Avatar className="h-7 w-7 ring-1 ring-background shrink-0 mt-0.5">
                                                        <AvatarImage src={post.userImage} />
                                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                            {post.userName?.[0]?.toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        {/* Header - Compact */}
                                                        <div className="flex items-center justify-between h-5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-xs hover:underline cursor-pointer text-foreground/90">
                                                                    {post.userName}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {timeAgo(post.createdAt)}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {/* Delete Button */}
                                                                {user && (user.uid === post.userId || user.email === 'admin@novelytical.com') && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                                                        onClick={() => handleDeletePost(post.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                )}
                                                                {/* Bookmark Button */}
                                                                {user && user.uid !== post.userId && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className={`h-5 w-5 ${savedPostIds.includes(post.id) ? 'opacity-100 text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                                                        onClick={() => handleBookmark(post.id)}
                                                                    >
                                                                        <Bookmark className={`h-3 w-3 ${savedPostIds.includes(post.id) ? 'fill-current' : ''}`} />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Text Content - Smaller font/margin */}
                                                        {post.content && (
                                                            <div className="text-xs text-foreground/80 leading-snug mb-1.5 break-words">
                                                                {renderContentWithMentions(post.content)}
                                                            </div>
                                                        )}

                                                        {/* Poll Options - Thinner bars */}
                                                        {post.pollOptions && post.pollOptions.length > 0 && (
                                                            <div className="space-y-1 mt-1 max-w-sm">
                                                                {post.pollOptions.map((opt) => {
                                                                    const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
                                                                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                                                                    const isVoted = post.userVote === opt.id;

                                                                    const isWinner = percentage > 0 && percentage === Math.max(...post.pollOptions!.map(o => Math.round((o.votes / totalVotes) * 100)));
                                                                    const color = isVoted
                                                                        ? { bg: 'from-primary/20 to-primary/10', border: 'border-primary/30', text: 'text-primary' }
                                                                        : isWinner
                                                                            ? { bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-500' }
                                                                            : { bg: 'from-muted/40 to-muted/20', border: 'border-border/30', text: 'text-muted-foreground' };

                                                                    return (
                                                                        <button
                                                                            key={opt.id}
                                                                            onClick={() => handleVote(post.id, opt.id)}
                                                                            disabled={isVoted && post.userVote === opt.id}
                                                                            className={`relative w-full text-left h-7 rounded overflow-hidden border transition-all hover:brightness-95 active:scale-[0.99] ${color.border} group/poll`}
                                                                        >
                                                                            <div
                                                                                className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color.bg} transition-all duration-700 ease-out`}
                                                                                style={{ width: `${percentage}%` }}
                                                                            />
                                                                            <div className="absolute inset-0 flex items-center justify-between px-2 z-10">
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                    {opt.novelCover && (
                                                                                        <div className="w-4 h-5 bg-muted rounded overflow-hidden shrink-0">
                                                                                            <img src={opt.novelCover} alt={opt.novelTitle} className="w-full h-full object-cover" />
                                                                                        </div>
                                                                                    )}
                                                                                    <span className="text-[11px] font-medium truncate text-foreground/80">
                                                                                        {opt.novelTitle || opt.text}
                                                                                    </span>
                                                                                </div>
                                                                                <span className={`text-[10px] font-bold ${color.text} ml-2 shrink-0`}>{percentage}%</span>
                                                                            </div>
                                                                        </button>
                                                                    )
                                                                })}
                                                                <div className="flex justify-end -mt-0.5">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-4 text-[9px] text-muted-foreground hover:text-primary px-1 gap-1"
                                                                        onClick={() => setViewingPollId(post.id)}
                                                                    >
                                                                        <span>{post.pollOptions.reduce((acc, curr) => acc + curr.votes, 0)} oy</span>
                                                                        <span className="opacity-50">• Detaylar</span>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* REVIEWS TAB */}
                                <TabsContent value="reviews" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0 data-[state=inactive]:hidden scrollbar-thin scrollbar-thumb-primary/10">
                                    {reviews.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">Henüz inceleme yok.</p>
                                    ) : (
                                        reviews.map((review) => (
                                            <div key={review.id} className="flex gap-4 items-start p-4 rounded-xl border border-border/30 bg-muted/10">
                                                <Avatar className="h-10 w-10 border border-border">
                                                    <AvatarImage src={review.userImage} />
                                                    <AvatarFallback>{review.userName[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-sm">{review.userName}</span>
                                                        <span className="text-xs text-muted-foreground">{timeAgo(review.createdAt)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                        <div className="flex items-center gap-0.5 text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-md">
                                                            <Star size={10} className="fill-current" />
                                                            <span className="font-bold">{review.averageRating}</span>
                                                        </div>
                                                        <Link href={`/novel/${review.novelId}`} className="hover:text-primary transition-colors text-primary/80">
                                                            Roman #{review.novelId}
                                                        </Link>
                                                    </div>
                                                    <p className="text-sm text-foreground/80 leading-relaxed font-serif italic">"{review.content}"</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </TabsContent>
                            </Card>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Novel Search Modal */}
            <NovelSearchModal
                open={novelSearchOpen}
                onClose={() => {
                    setNovelSearchOpen(false);
                    setSelectedOptionIndex(null);
                }}
                onSelect={(novel) => {
                    if (selectedOptionIndex !== null) {
                        const newOpts = [...pollOptions];
                        newOpts[selectedOptionIndex] = {
                            ...newOpts[selectedOptionIndex], // Preserve existing props
                            text: newOpts[selectedOptionIndex].text || novel.title,
                            novelId: novel.id,
                            novelTitle: novel.title,
                            novelCover: novel.coverImage
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
        </section>
    );
}
