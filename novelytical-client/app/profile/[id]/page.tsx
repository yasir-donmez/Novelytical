"use client";

import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import UserInteractionList from "@/components/profile/user-interaction-list";
import UserLibraryList from "@/components/profile/user-library-list";
import SavedPollsList from "@/components/profile/saved-polls-list";
import { BookOpen, Mail, CalendarDays, MessageSquare, BarChart2, UserPlus, UserMinus, MessageCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LevelService, UserLevelData, LEVEL_FRAMES } from "@/services/level-service";
import { FollowService } from "@/services/follow-service";
import { UserService, UserProfile } from "@/services/user-service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FollowListDialog } from "@/components/profile/follow-list-dialog";
import { openChatWithUser } from "@/components/chat/chat-floating-dialog";

export default function UserProfilePage() {
    const { user: currentUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const targetUserId = params.id as string;

    const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
    const [levelData, setLevelData] = useState<UserLevelData | null>(null);
    const [socialStats, setSocialStats] = useState({ followers: 0, following: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [isMutual, setIsMutual] = useState(false);
    const [loading, setLoading] = useState(true);

    // Dialog
    const [isFollowDialogOpen, setIsFollowDialogOpen] = useState(false);
    const [followDialogTab, setFollowDialogTab] = useState<"followers" | "following">("followers");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Target User Profile
                const profile = await UserService.getUserProfile(targetUserId);
                if (!profile) {
                    toast.error("Kullanıcı bulunamadı.");
                    router.push("/");
                    return;
                }
                setTargetUser(profile);

                // 2. Fetch Level & Stats
                const levelDisplay = await LevelService.getUserLevelData(targetUserId);
                setLevelData(levelDisplay);

                // 3. Check Relationship if logged in
                if (currentUser) {
                    const following = await FollowService.isFollowing(currentUser.uid, targetUserId);
                    setIsFollowing(following);
                    const mutual = await FollowService.isMutualFollow(currentUser.uid, targetUserId);
                    setIsMutual(mutual);
                }

            } catch (error) {
                console.error(error);
                toast.error("Bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };

        if (targetUserId) {
            loadData();
        }
    }, [targetUserId, currentUser, router]);

    // Real-time follower/following count subscription
    useEffect(() => {
        if (!targetUserId) return;

        const unsubFollowers = FollowService.subscribeToFollowerCount(targetUserId, (count) => {
            setSocialStats(prev => ({ ...prev, followers: count }));
        });

        const unsubFollowing = FollowService.subscribeToFollowingCount(targetUserId, (count) => {
            setSocialStats(prev => ({ ...prev, following: count }));
        });

        return () => {
            unsubFollowers();
            unsubFollowing();
        };
    }, [targetUserId]);

    const handleFollowToggle = async () => {
        if (!currentUser) {
            toast.error("Giriş yapmalısınız.");
            router.push("/login");
            return;
        }

        try {
            if (isFollowing) {
                await FollowService.unfollowUser(currentUser.uid, targetUserId);
                setIsFollowing(false);
                setSocialStats(prev => ({ ...prev, followers: prev.followers - 1 }));
                toast.success("Takipten çıkıldı.");
            } else {
                await FollowService.followUser(currentUser.uid, targetUserId);
                setIsFollowing(true);
                setSocialStats(prev => ({ ...prev, followers: prev.followers + 1 }));
                toast.success("Takip edildi.");
            }
            // Re-check mutual status
            const mutual = await FollowService.isMutualFollow(currentUser.uid, targetUserId);
            setIsMutual(mutual);

        } catch (error) {
            toast.error("İşlem başarısız.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!targetUser) return null;

    // Check if viewing self
    if (currentUser?.uid === targetUserId) {
        router.push("/profile");
        return null;
    }

    const joinDate = targetUser.createdAt
        ? format(new Date(targetUser.createdAt.seconds * 1000), "d MMMM yyyy", { locale: tr })
        : "Bilinmiyor";

    const frameId = levelData?.selectedFrame || 'default';
    const frameObj = LEVEL_FRAMES.find(f => f.id === frameId) || LEVEL_FRAMES[0];

    // Visibility Logic
    const isPrivate = targetUser.privacySettings?.privateProfile ?? false;
    const isMutualRestricted = targetUser.privacySettings?.restrictContentToMutuals ?? false;

    // 1. Basic Privacy: If private, must follow.
    // 2. Mutual Restriction: If enabled, must be mutual follow.
    // Note: Mutual restriction usually implies private logic too, but we treat it as an extra layer.

    let contentVisible = true;

    if (isPrivate && !isFollowing) {
        contentVisible = false;
    } else if (isMutualRestricted && !isMutual) {
        contentVisible = false;
    }

    return (
        <div className="min-h-screen pt-24 pb-12 bg-background">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Profile Header */}
                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-lg relative overflow-visible">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 overflow-hidden" />

                    <div className="relative group shrink-0 p-1">
                        <UserAvatar
                            src={targetUser.photoURL || undefined}
                            alt={targetUser.username}
                            frameId={frameObj.id}
                            className="h-32 w-32 md:h-40 md:w-40 bg-zinc-900"
                        />
                    </div>

                    <div className="flex-1 w-full text-center md:text-left space-y-4 z-10">
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{targetUser.username}</h1>
                                {frameObj.id !== 'default' && (
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full border bg-background/50 backdrop-blur-sm w-fit mx-auto md:mx-0", frameObj.color)}>
                                        {frameObj.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                                <Mail size={14} />
                                {targetUser.email} {/* Maybe hide email for privacy? Keeping for now as per design */}
                            </p>
                        </div>

                        <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                            <div
                                className={cn(
                                    "flex flex-col items-center md:items-start transition-opacity",
                                    isFollowing ? "cursor-pointer hover:opacity-80" : "cursor-default opacity-50"
                                )}
                                onClick={() => {
                                    if (isFollowing) {
                                        setFollowDialogTab("followers");
                                        setIsFollowDialogOpen(true);
                                    } else {
                                        toast.error("Bu listeyi görmek için kullanıcıyı takip etmelisiniz.");
                                    }
                                }}
                            >
                                <span className="font-bold text-lg">{socialStats.followers}</span>
                                <span className="text-muted-foreground">Takipçi</span>
                            </div>
                            <div
                                className={cn(
                                    "flex flex-col items-center md:items-start transition-opacity",
                                    isFollowing ? "cursor-pointer hover:opacity-80" : "cursor-default opacity-50"
                                )}
                                onClick={() => {
                                    if (isFollowing) {
                                        setFollowDialogTab("following");
                                        setIsFollowDialogOpen(true);
                                    } else {
                                        toast.error("Bu listeyi görmek için kullanıcıyı takip etmelisiniz.");
                                    }
                                }}
                            >
                                <span className="font-bold text-lg">{socialStats.following}</span>
                                <span className="text-muted-foreground">Takip Edilen</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                            <Button
                                onClick={handleFollowToggle}
                                variant={isFollowing ? "secondary" : "default"}
                                className={cn(isFollowing && "bg-white/10 hover:bg-white/20")}
                            >
                                {isFollowing ? <><UserMinus className="mr-2 h-4 w-4" /> Takipten Çık</> : <><UserPlus className="mr-2 h-4 w-4" /> Takip Et</>}
                            </Button>

                            {isMutual && (
                                <Button
                                    variant="outline"
                                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                                    onClick={() => openChatWithUser(targetUserId)}
                                >
                                    <MessageCircle className="mr-2 h-4 w-4" /> Mesaj Gönder
                                </Button>
                            )}

                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 text-sm">
                                <CalendarDays size={16} className="text-purple-400" />
                                <span>Katılma: {joinDate}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Restricted Content */}
                {contentVisible ? (
                    <>
                        <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-lg">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                    <BookOpen size={20} />
                                </span>
                                Kütüphane
                            </h2>
                            {/* Note: UserLibraryList internally uses useAuth().user.uid, so it will show CURRENT user's library if we don't modify it. 
                                 We need to pass userId prop to UserLibraryList or it needs to read from context/props.
                                 Assume for now we need to update UserLibraryList to accept a userId prop. 
                                 If it doesn't support it, this will show WRONG data.
                                 Let's comment out for now or check UserLibraryList.
                             */}
                            <div className="text-center py-8 text-muted-foreground">
                                {/* Placeholder until components connect to targetUserId */}
                                (Kütüphane Bileşeni Entegrasyonu Gerekiyor)
                            </div>
                        </div>

                        <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-lg">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                    <MessageSquare size={20} />
                                </span>
                                Son Etkileşimler
                            </h2>
                            <div className="text-center py-8 text-muted-foreground">
                                (Etkileşim Bileşeni Entegrasyonu Gerekiyor)
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white/5 border border-white/10 rounded-2xl text-center space-y-4">
                        <div className="bg-white/10 p-4 rounded-full">
                            <Lock className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold">Gizli Profil</h3>
                            <p className="text-muted-foreground max-w-sm mt-2">
                                Bu kullanıcının kütüphanesini ve etkileşimlerini görmek için takip etmeniz gerekiyor.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <FollowListDialog
                userId={targetUserId}
                isOpen={isFollowDialogOpen}
                onClose={() => setIsFollowDialogOpen(false)}
                defaultTab={followDialogTab}
            />
        </div>
    );
}
