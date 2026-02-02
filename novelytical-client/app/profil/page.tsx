"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import UserLibraryList from "@/components/profile/user-library-list";
import UserInteractionList from "@/components/profile/user-interaction-list";
import SavedPollsList from "@/components/profile/saved-polls-list";
import NotificationList from "@/components/notifications/notification-list";
import { BookOpen, Bell, MessageSquare, BarChart2, Calendar, Trophy, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LevelService, UserLevelData, LEVEL_FRAMES } from "@/services/level-service";
import { FollowService } from "@/services/follow-service";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FollowListDialog } from "@/components/profile/follow-list-dialog";

export default function ProfilePage() {
    const { user, backendUser, loading } = useAuth();
    const router = useRouter();
    const [levelData, setLevelData] = useState<UserLevelData | null>(null);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    // Modal State
    const [followDialogTab, setFollowDialogTab] = useState<'followers' | 'following'>('followers');
    const [isFollowDialogOpen, setIsFollowDialogOpen] = useState(false);

    const openFollowDialog = (tab: 'followers' | 'following') => {
        setFollowDialogTab(tab);
        setIsFollowDialogOpen(true);
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            // Fetch Level Data
            LevelService.getUserLevelData(user.uid).then(setLevelData);

            // Subscribe to Follow Counts (Real-time)
            const unsubFollowers = FollowService.subscribeToFollowerCount(user.uid, setFollowerCount);
            const unsubFollowing = FollowService.subscribeToFollowingCount(user.uid, setFollowingCount);

            return () => {
                unsubFollowers();
                unsubFollowing();
            };
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!user) return null;

    // Get frame color/style based on level
    const currentFrame = LEVEL_FRAMES.find(f => f.id === levelData?.selectedFrame) || LEVEL_FRAMES[0];

    return (
        <div className="min-h-screen bg-background text-gray-100 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Section (Profile Card) */}
                <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-white/5 shadow-xl mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500/50 via-purple-500/50 to-amber-500/50"></div>

                    <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                        {/* Avatar */}
                        <div className="relative group">
                            {/* Frame Effect if any */}
                            {levelData?.selectedFrame && levelData.selectedFrame !== 'default' && (
                                <div className={`absolute -inset-1 rounded-full ${currentFrame.cssClass} opacity-80 pointer-events-none z-20`}></div>
                            )}

                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl relative bg-zinc-800 z-10">
                                {user.photoURL ? (
                                    <Image
                                        src={user.photoURL}
                                        alt={user.displayName || 'Profile'}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 128px, 128px"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-amber-500">
                                        {user.displayName?.charAt(0) || user.email?.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Online Status */}
                            <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-[#1a1a1a] rounded-full z-30" title="Online"></div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div className="flex items-center justify-center md:justify-start gap-3">
                                <h1 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 ${currentFrame.color}`}>
                                    {user.displayName || 'İsimsiz Kahraman'}
                                </h1>
                                {/* Backend Sync Status Dot */}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className={`w-3 h-3 rounded-full ${backendUser ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`}></div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{backendUser ? 'Postgres ile Eşleşti' : 'Senkronize Ediliyor...'}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <p className="text-gray-400 font-medium">{user.email}</p>

                            {/* Stats Grid */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6 text-sm">
                                {/* Join Date */}
                                <div className="flex items-center gap-2 text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition-colors">
                                    <Calendar className="w-4 h-4 text-purple-400" />
                                    <span>
                                        Katılım: {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : '-'}
                                    </span>
                                </div>

                                {/* Level with Title Tooltip */}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className={`flex items-center gap-2 text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition-colors cursor-help ${currentFrame.color}`}>
                                                <Trophy className="w-4 h-4" />
                                                <span>
                                                    Seviye {levelData?.level || 1} <span className="text-xs text-zinc-500">({levelData?.xp || 0} XP)</span>
                                                </span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="font-bold">{currentFrame.name}</p>
                                            <p className="text-xs text-muted-foreground">Mevcut Lakap</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                {/* Followers */}
                                <div className="flex items-center gap-4 bg-zinc-800/50 px-4 py-1.5 rounded-full border border-white/5">
                                    <div
                                        className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
                                        onClick={() => openFollowDialog('followers')}
                                    >
                                        <Users className="w-4 h-4 text-blue-400" />
                                        <span className="font-bold text-white">{followerCount}</span>
                                        <span className="text-zinc-500 text-xs">Takipçi</span>
                                    </div>
                                    <div className="w-px h-3 bg-white/10"></div>
                                    <div
                                        className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
                                        onClick={() => openFollowDialog('following')}
                                    >
                                        <span className="font-bold text-white">{followingCount}</span>
                                        <span className="text-zinc-500 text-xs">Takip</span>
                                    </div>
                                </div>
                            </div>

                            <FollowListDialog
                                isOpen={isFollowDialogOpen}
                                onClose={() => setIsFollowDialogOpen(false)}
                                userId={user.uid}
                                defaultTab={followDialogTab}
                            />

                            {backendUser?.role === 'Admin' && (
                                <div className="mt-3 flex justify-center md:justify-start">
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                                        🛡️ Yönetici
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Integrated Profile Content using Tabs inside the Card */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <Tabs defaultValue="library" className="w-full">
                            <TabsList className="w-full grid w-full grid-cols-4 bg-zinc-900/50 p-1 mb-6">
                                <TabsTrigger value="library" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400">
                                    <BookOpen className="w-4 h-4 mr-2 md:block hidden" />
                                    Kütüphane
                                </TabsTrigger>
                                <TabsTrigger value="notifications" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-400">
                                    <Bell className="w-4 h-4 mr-2 md:block hidden" />
                                    Bildirimler
                                </TabsTrigger>
                                <TabsTrigger value="interactions" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-purple-400">
                                    <MessageSquare className="w-4 h-4 mr-2 md:block hidden" />
                                    Yorumlar
                                </TabsTrigger>
                                <TabsTrigger value="polls" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-green-400">
                                    <BarChart2 className="w-4 h-4 mr-2 md:block hidden" />
                                    Anketler
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="library" className="mt-4 focus-visible:outline-none focus-visible:ring-0 min-h-[290px]">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 sr-only">
                                    Kütüphanem
                                </h2>
                                <UserLibraryList />
                            </TabsContent>

                            <TabsContent value="notifications" className="mt-4 focus-visible:outline-none focus-visible:ring-0 min-h-[290px]">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 sr-only">
                                    Bildirimler
                                </h2>
                                <NotificationList />
                            </TabsContent>

                            <TabsContent value="interactions" className="mt-4 focus-visible:outline-none focus-visible:ring-0 min-h-[290px]">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 sr-only">
                                    Son Etkileşimlerim & Yorumlarım
                                </h2>
                                <UserInteractionList />
                            </TabsContent>

                            <TabsContent value="polls" className="mt-4 focus-visible:outline-none focus-visible:ring-0 min-h-[290px]">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 sr-only">
                                    Kaydettiğim Anketler
                                </h2>
                                <SavedPollsList />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
