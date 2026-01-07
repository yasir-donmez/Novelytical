"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getSavedPostsData, Post, toggleSavePost } from "@/services/feed-service";
import { BarChart2, Bookmark, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

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
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        loadPosts();
    }, [user]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            if (user) {
                const data = await getSavedPostsData(user.uid);
                // Filter only polls just in case
                setPosts(data.filter(p => p.type === 'poll'));
            }
        } catch (error) {
            console.error("Failed to load saved polls", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsave = async (postId: string) => {
        if (!user) return;
        try {
            await toggleSavePost(user.uid, postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast.success("Anket kaydedilenlerden kaldırıldı.");
        } catch (error) {
            toast.error("İşlem başarısız.");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Yükleniyor...</div>;
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-12 bg-black/5 dark:bg-zinc-800/40 rounded-xl border border-black/5 dark:border-white/10">
                <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Kaydedilen anket yok</h3>
                <p className="text-muted-foreground mt-2">Topluluk anketlerini buradan takip edebilirsiniz.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
                <div key={post.id} className="group relative p-4 rounded-xl bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5 border border-primary/10 hover:border-primary/20 transition-all shadow-sm">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-9 w-9 border border-primary/20">
                            <AvatarImage src={post.userImage} />
                            <AvatarFallback>{post.userName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{post.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{timeAgo(post.createdAt)}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleUnsave(post.id)}
                            title="Kaydetmeyi Kaldır"
                        >
                            <Bookmark size={16} fill="currentColor" />
                        </Button>
                    </div>

                    {/* Content */}
                    {post.content && (
                        <p className="text-sm text-foreground/90 mb-3 line-clamp-2">{post.content}</p>
                    )}

                    {/* Poll Preview (Simplified) */}
                    {post.pollOptions && (
                        <div className="space-y-1.5">
                            {post.pollOptions.slice(0, 2).map((opt, idx) => {
                                const totalVotes = post.pollOptions!.reduce((acc, curr) => acc + curr.votes, 0);
                                const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);

                                return (
                                    <div key={opt.id} className="relative h-7 rounded-md bg-muted/30 overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-primary/10"
                                            style={{ width: `${percentage}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-between px-2">
                                            <span className="text-xs font-medium truncate pr-2">{opt.novelTitle || opt.text}</span>
                                            <span className="text-[10px] font-mono opacity-70">{percentage}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {post.pollOptions.length > 2 && (
                                <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider py-1">
                                    + {post.pollOptions.length - 2} seçenek daha
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
