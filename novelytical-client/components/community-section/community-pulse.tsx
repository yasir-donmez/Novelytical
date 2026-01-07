'use client';

import { useEffect, useState, useRef } from 'react';
import { getLatestReviews, Review } from '@/services/review-service';
import { getLatestPosts, createPost, votePoll, Post } from '@/services/feed-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Star, ArrowRight, Flame, Send, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

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

export function CommunityPulse() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('feed');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    // New Post State
    const [postContent, setPostContent] = useState('');
    const [isPoll, setIsPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

    const fetchData = async () => {
        try {
            const [latestReviews, latestPosts] = await Promise.all([
                getLatestReviews(5),
                getLatestPosts(20)
            ]);
            setReviews(latestReviews);
            setPosts(latestPosts);
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
        if (isPoll && pollOptions.some(opt => !opt.trim())) {
            toast.error("Lütfen anket seçeneklerini doldurun.");
            return;
        }

        try {
            await createPost(
                user.uid,
                user.displayName || 'Anonim',
                user.photoURL || undefined,
                postContent,
                isPoll ? 'poll' : 'text',
                isPoll ? pollOptions : []
            );
            toast.success("Gönderi paylaşıldı!");
            setPostContent('');
            setIsPoll(false);
            setPollOptions(['', '']);
            fetchData();
        } catch (error) {
            console.error("Post creation error:", error);
            toast.error("Gönderi paylaşılamadı. Lütfen tekrar deneyin.");
        }
    };

    const handleVote = async (postId: string, optionId: number) => {
        if (!user) {
            toast.error("Oy kullanmak için giriş yapın.");
            return;
        }
        try {
            await votePoll(postId, optionId, user.uid);
            toast.success("Oyunuz alındı!");
            fetchData();
        } catch (error) {
            if (error instanceof Error && error.message === "Already voted") {
                toast.error("Zaten oy kullandınız.");
            } else {
                toast.error("Oy verilemedi.");
            }
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
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="font-semibold text-sm text-foreground/90">{post.userName}</span>
                                                        <span className="text-[10px] text-muted-foreground/60">{timeAgo(post.createdAt)}</span>
                                                    </div>

                                                    <p className="mt-1 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                                                    {/* Poll Display */}
                                                    {post.type === 'poll' && post.pollOptions && (
                                                        <div className="mt-2 space-y-1.5 w-full max-w-sm">
                                                            {post.pollOptions.map((opt) => {
                                                                const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
                                                                const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);

                                                                return (
                                                                    <button
                                                                        key={opt.id}
                                                                        onClick={() => handleVote(post.id, opt.id)}
                                                                        className="w-full relative h-8 rounded-md bg-muted/30 hover:bg-muted/60 transition-colors overflow-hidden text-xs group/poll border border-transparent hover:border-primary/10"
                                                                    >
                                                                        {/* Progress Bar */}
                                                                        <div
                                                                            className="absolute top-0 left-0 h-full bg-primary/10 transition-all duration-700 ease-out"
                                                                            style={{ width: `${percentage}%` }}
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                                                                            <span className="font-medium truncate pr-2">{opt.text}</span>
                                                                            <span className="text-muted-foreground font-mono">{percentage}%</span>
                                                                        </div>
                                                                    </button>
                                                                )
                                                            })}
                                                            <div className="text-[10px] text-muted-foreground text-right px-1">
                                                                {post.pollOptions.reduce((acc, curr) => acc + curr.votes, 0)} oy
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Input Area (Fixed Bottom) */}
                                    <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50 sticky bottom-0 z-20">
                                        <div className="flex flex-col gap-3 relative">
                                            {isPoll && (
                                                <div className="absolute bottom-full left-0 w-full mb-2 bg-popover p-3 rounded-xl border border-border shadow-lg animate-in slide-in-from-bottom-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-semibold flex items-center gap-1.5">
                                                            <BarChart2 size={12} className="text-primary" /> Anket Seçenekleri
                                                        </span>
                                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsPoll(false)}>×</Button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {pollOptions.map((opt, idx) => (
                                                            <Input
                                                                key={idx}
                                                                placeholder={`${idx + 1}. Seçenek`}
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newOpts = [...pollOptions];
                                                                    newOpts[idx] = e.target.value;
                                                                    setPollOptions(newOpts);
                                                                }}
                                                                className="h-8 text-xs bg-muted/30"
                                                            />
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

                                                <Textarea
                                                    placeholder={user ? "Toplulukla paylaş..." : "Paylaşım yapmak için giriş yap"}
                                                    value={postContent}
                                                    onChange={(e) => setPostContent(e.target.value)}
                                                    className="min-h-[36px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 px-2 py-2 resize-none text-sm placeholder:text-muted-foreground/50"
                                                    rows={1}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleCreatePost();
                                                        }
                                                    }}
                                                    disabled={!user}
                                                />

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
        </section>
    );
}
