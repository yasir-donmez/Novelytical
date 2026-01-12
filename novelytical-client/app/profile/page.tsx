"use client";

import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import UserInteractionList from "@/components/profile/user-interaction-list";
import UserLibraryList from "@/components/profile/user-library-list";
import SavedPollsList from "@/components/profile/saved-polls-list";
import NotificationList from "@/components/notifications/notification-list";
import { BookOpen, Mail, CalendarDays, MessageSquare, BarChart2, Settings, Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LevelService, UserLevelData, LEVEL_FRAMES } from "@/services/level-service";
import { FollowService } from "@/services/follow-service";
import { cn } from "@/lib/utils";
import { FollowListDialog } from "@/components/profile/follow-list-dialog";

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [levelData, setLevelData] = useState<UserLevelData | null>(null);
    const [progress, setProgress] = useState({ current: 0, next: 100, percent: 0 });
    const [socialStats, setSocialStats] = useState({ followers: 0, following: 0 });

    // Dialog State
    const [isFollowDialogOpen, setIsFollowDialogOpen] = useState(false);
    const [followDialogTab, setFollowDialogTab] = useState<"followers" | "following">("followers");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            const loadLevel = async () => {
                const data = await LevelService.getUserLevelData(user.uid);
                setLevelData(data);
                if (data) {
                    setProgress(LevelService.getLevelProgress(data.xp));
                }

                // Sync Auth profile to Firestore (ensures photoURL is always up-to-date)
                if (user.photoURL || user.displayName) {
                    try {
                        const { UserService } = await import("@/services/user-service");
                        await UserService.updateUserProfile(
                            user.uid,
                            user.displayName || user.email?.split('@')[0] || "User",
                            user.photoURL || undefined
                        );
                    } catch (e) {
                        // Silent fail - not critical
                    }
                }
            };
            loadLevel();
        }
    }, [user]);

    // Real-time follower/following count subscription
    useEffect(() => {
        if (!user) return;

        const unsubFollowers = FollowService.subscribeToFollowerCount(user.uid, (count) => {
            setSocialStats(prev => ({ ...prev, followers: count }));
        });

        const unsubFollowing = FollowService.subscribeToFollowingCount(user.uid, (count) => {
            setSocialStats(prev => ({ ...prev, following: count }));
        });

        return () => {
            unsubFollowers();
            unsubFollowing();
        };
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!user) return null;

    const joinDate = user.metadata.creationTime
        ? format(new Date(user.metadata.creationTime), "d MMMM yyyy", { locale: tr })
        : "Bilinmiyor";

    const displayName = user.displayName || user.email?.split('@')[0] || "Okur";

    // Frame Logic
    const frameId = levelData?.selectedFrame || 'default';
    const frameObj = LEVEL_FRAMES.find(f => f.id === frameId) || LEVEL_FRAMES[0];

    return (
        <div className="min-h-screen pt-24 pb-12 bg-background">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Profile Header */}
                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-lg relative overflow-hidden">

                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    {/* Avatar with Frame */}
                    <div className="relative group shrink-0">
                        <UserAvatar
                            src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`}
                            alt={displayName}
                            frameId={frameObj.id}
                            className="h-32 w-32 md:h-40 md:w-40 bg-zinc-900"
                        />
                    </div>

                    <div className="flex-1 w-full text-center md:text-left space-y-4 z-10">
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{displayName}</h1>
                                {frameObj.id !== 'default' && (
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full border bg-background/50 backdrop-blur-sm w-fit mx-auto md:mx-0", frameObj.color)}>
                                        {frameObj.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                                <Mail size={14} />
                                {user.email}
                            </p>

                        </div>

                        <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                            <div
                                className="flex flex-col items-center md:items-start cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                    setFollowDialogTab("followers");
                                    setIsFollowDialogOpen(true);
                                }}
                            >
                                <span className="font-bold text-lg">{socialStats.followers}</span>
                                <span className="text-muted-foreground">Takipçi</span>
                            </div>
                            <div
                                className="flex flex-col items-center md:items-start cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                    setFollowDialogTab("following");
                                    setIsFollowDialogOpen(true);
                                }}
                            >
                                <span className="font-bold text-lg">{socialStats.following}</span>
                                <span className="text-muted-foreground">Takip Edilen</span>
                            </div>
                        </div>



                        <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-6 text-sm text-foreground/80 pt-2">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <CalendarDays size={16} className="text-purple-400" />
                                <span>Katılma: <span className="font-semibold text-foreground">{joinDate}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-lg">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                            <BookOpen size={20} />
                        </span>
                        Kütüphanem
                    </h2>
                    <UserLibraryList />
                </div>

                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-lg">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-amber-500/20 p-2 rounded-lg text-amber-400">
                            <Bell size={20} />
                        </span>
                        Bildirimler
                    </h2>
                    <NotificationList />
                </div>

                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-16 shadow-lg">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                            <MessageSquare size={20} />
                        </span>
                        Son Etkileşimlerim & Yorumlarım
                    </h2>
                    <UserInteractionList />
                </div>

                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-lg">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-green-500/20 p-2 rounded-lg text-green-400">
                            <BarChart2 size={20} />
                        </span>
                        Kaydettiğim Anketler
                    </h2>
                    <SavedPollsList />
                </div>
            </div>

            {user && (
                <FollowListDialog
                    userId={user.uid}
                    isOpen={isFollowDialogOpen}
                    onClose={() => setIsFollowDialogOpen(false)}
                    defaultTab={followDialogTab}
                />
            )}
        </div>
    );
}
