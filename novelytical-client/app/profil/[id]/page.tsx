"use client";

import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image"; // Used in page.tsx
import UserInteractionList from "@/components/profile/user-interaction-list";
import UserLibraryList from "@/components/profile/user-library-list";
import SavedPollsList from "@/components/profile/saved-polls-list";
import { BookOpen, Calendar, MessageSquare, BarChart2, UserPlus, UserMinus, MessageCircle, Lock, Trophy, Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LevelService, UserLevelData, LEVEL_FRAMES } from "@/services/level-service";
import { FollowService } from "@/services/follow-service";
import { UserService, UserProfile } from "@/services/user-service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FollowListDialog } from "@/components/profile/follow-list-dialog";
import { openChatWithUser } from "@/components/chat/chat-floating-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

    const openFollowDialog = (tab: 'followers' | 'following') => {
        if (!isFollowing && targetUser?.privacySettings?.privateProfile) {
            toast.error("Bu listeyi görmek için kullanıcıyı takip etmelisiniz.");
            return;
        }
        setFollowDialogTab(tab);
        setIsFollowDialogOpen(true);
    };

    useEffect(() => {
        let isMounted = true;
        let unsubscribeUser: (() => void) | undefined;

        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Subscribe to Target User Profile
                unsubscribeUser = UserService.subscribeToUserProfile(targetUserId, (profile) => {
                    if (!isMounted) return;
                    if (!profile) {
                        toast.error("Kullanıcı bulunamadı.");
                        router.push("/");
                        return;
                    }
                    setTargetUser(profile);
                    setLoading(false);
                });

                // 2. Fetch Level & Stats (Keep one-time fetch or consider subscribing too)
                const levelDisplay = await LevelService.getUserLevelData(targetUserId);
                if (isMounted) setLevelData(levelDisplay);

                // 3. Check Relationship if logged in
                if (currentUser) {
                    const following = await FollowService.isFollowing(currentUser.uid, targetUserId);
                    if (isMounted) setIsFollowing(following);
                    const mutual = await FollowService.isMutualFollow(currentUser.uid, targetUserId);
                    if (isMounted) setIsMutual(mutual);
                }

            } catch (error) {
                console.error(error);
                if (isMounted) toast.error("Bir hata oluştu.");
                setLoading(false);
            }
        };

        if (targetUserId) {
            loadData();
        }

        return () => {
            isMounted = false;
            if (unsubscribeUser) unsubscribeUser();
        };
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
                toast.success("Takipten çıkıldı.");
            } else {
                await FollowService.followUser(currentUser.uid, targetUserId);
                setIsFollowing(true);
                toast.success("Takip edildi.");
            }
            // Re-check mutual status
            const mutual = await FollowService.isMutualFollow(currentUser.uid, targetUserId);
            setIsMutual(mutual);

        } catch (error) {
            toast.error("İşlem başarısız.");
        }
    };

    // Check if viewing self - Redirect effect
    useEffect(() => {
        if (currentUser?.uid === targetUserId) {
            router.replace("/profil");
        }
    }, [currentUser, targetUserId, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (currentUser?.uid === targetUserId) return null;
    if (!targetUser) return null;

    const joinDate = targetUser.createdAt
        ? format(new Date(targetUser.createdAt.seconds * 1000), "MMMM yyyy", { locale: tr })
        : "Bilinmiyor";

    const frameId = levelData?.selectedFrame || 'default';
    const currentFrame = LEVEL_FRAMES.find(f => f.id === frameId) || LEVEL_FRAMES[0];

    // Visibility Logic
    const isPrivate = targetUser.privacySettings?.privateProfile ?? false;
    const isMutualRestricted = targetUser.privacySettings?.restrictContentToMutuals ?? false;
    const isLibraryHidden = targetUser.privacySettings?.hideLibrary ?? false;

    let contentVisible = true;
    if (isLibraryHidden) {
        contentVisible = false;
    } else if (isPrivate && !isFollowing) {
        contentVisible = false;
    } else if (isMutualRestricted && !isMutual) {
        contentVisible = false;
    }

    const HiddenPlaceholder = ({ title, message }: { title: string, message: string }) => (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-zinc-900/50 rounded-xl border border-white/5">
            <div className="bg-white/5 p-4 rounded-full ring-1 ring-white/10">
                <Lock className="h-6 w-6 text-zinc-400" />
            </div>
            <div>
                <h3 className="font-semibold text-zinc-300">{title}</h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-1">
                    {message}
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-gray-100 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Section (Profile Card) */}
                <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-white/5 shadow-xl mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500/50 via-purple-500/50 to-amber-500/50"></div>

                    <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                        {/* Avatar */}
                        <div className="relative group shrink-0">
                            {/* Frame Effect */}
                            {frameId !== 'default' && (
                                <div className={cn("absolute -inset-1 rounded-full opacity-80 pointer-events-none z-20", currentFrame.cssClass)}></div>
                            )}

                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl relative bg-zinc-800 z-10">
                                {targetUser.photoURL ? (
                                    <Image
                                        src={targetUser.photoURL}
                                        alt={targetUser.username}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 128px, 128px"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-amber-500">
                                        {targetUser.username?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div>
                                <h1 className={cn("text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400", currentFrame.color)}>
                                    {targetUser.username}
                                </h1>
                                <p className="text-gray-400 font-medium ">{targetUser.email}</p>
                            </div>

                            {/* Stats Grid */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6 text-sm">
                                {/* Join Date */}
                                <div className="flex items-center gap-2 text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition-colors">
                                    <Calendar className="w-4 h-4 text-purple-400" />
                                    <span>Katılım: {joinDate}</span>
                                </div>

                                {/* Level */}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className={cn("flex items-center gap-2 text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition-colors cursor-help", currentFrame.color)}>
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
                                        <span className="font-bold text-white">{socialStats.followers}</span>
                                        <span className="text-zinc-500 text-xs">Takipçi</span>
                                    </div>
                                    <div className="w-px h-3 bg-white/10"></div>
                                    <div
                                        className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
                                        onClick={() => openFollowDialog('following')}
                                    >
                                        <span className="font-bold text-white">{socialStats.following}</span>
                                        <span className="text-zinc-500 text-xs">Takip</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                                <Button
                                    onClick={handleFollowToggle}
                                    variant={isFollowing ? "secondary" : "default"}
                                    size="sm"
                                    className={cn("rounded-full", isFollowing && "bg-zinc-700 hover:bg-zinc-600 text-zinc-100")}
                                >
                                    {isFollowing ? <><UserMinus className="mr-2 h-4 w-4" /> Takipten Çık</> : <><UserPlus className="mr-2 h-4 w-4" /> Takip Et</>}
                                </Button>

                                {(isMutual || targetUser.privacySettings?.allowMessagesFromNonFollowers) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                                        onClick={() => openChatWithUser(targetUserId)}
                                    >
                                        <MessageCircle className="mr-2 h-4 w-4" /> Mesaj
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Integrated Profile Content (Tabs) */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <Tabs defaultValue="library" className="w-full">
                            <TabsList className="w-full grid w-full grid-cols-3 bg-zinc-900/50 p-1 mb-6">
                                <TabsTrigger value="library" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400">
                                    <BookOpen className="w-4 h-4 mr-2 md:block hidden" />
                                    Kütüphane
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
                                {contentVisible ? (
                                    <UserLibraryList userId={targetUserId} />
                                ) : (
                                    <HiddenPlaceholder
                                        title="Bu Kütüphane Gizli"
                                        message={isLibraryHidden ? "Kullanıcı kütüphanesini gizledi." : "Detayları görmek için takip etmelisiniz."}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="interactions" className="mt-4 focus-visible:outline-none focus-visible:ring-0 min-h-[290px]">
                                {contentVisible ? (
                                    <UserInteractionList userId={targetUserId} />
                                ) : (
                                    <HiddenPlaceholder
                                        title="Etkileşimler Gizli"
                                        message={isLibraryHidden ? "Kullanıcı etkileşimlerini gizledi." : "Detayları görmek için takip etmelisiniz."}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="polls" className="mt-4 focus-visible:outline-none focus-visible:ring-0 min-h-[290px]">
                                {contentVisible ? (
                                    <SavedPollsList userId={targetUserId} />
                                ) : (
                                    <HiddenPlaceholder
                                        title="Anketler Gizli"
                                        message={isLibraryHidden ? "Kullanıcı anketlerini gizledi." : "Detayları görmek için takip etmelisiniz."}
                                    />
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            <FollowListDialog
                isOpen={isFollowDialogOpen}
                onClose={() => setIsFollowDialogOpen(false)}
                userId={targetUserId}
                defaultTab={followDialogTab}
            />
        </div>
    );
}
