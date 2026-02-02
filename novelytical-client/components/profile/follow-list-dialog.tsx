"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserProfile } from "@/services/user-service";
import { FollowService } from "@/services/follow-service";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface FollowListDialogProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: "followers" | "following";
}

export function FollowListDialog({ userId, isOpen, onClose, defaultTab = "followers" }: FollowListDialogProps) {
    const { user: currentUser } = useAuth();
    const [followers, setFollowers] = useState<UserProfile[]>([]);
    const [following, setFollowing] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const isOwnProfile = currentUser?.uid === userId;

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [followersList, followingList] = await Promise.all([
                FollowService.getFollowers(userId),
                FollowService.getFollowing(userId)
            ]);
            setFollowers(followersList);
            setFollowing(followingList);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnfollow = async (targetId: string) => {
        if (!currentUser) return;
        try {
            await FollowService.unfollowUser(currentUser.uid, targetId);
            setFollowing(prev => prev.filter(u => u.uid !== targetId));
            toast.success("Takipten çıkıldı.");
        } catch (error: any) {
            console.error(error);
            const msg = error?.message || (typeof error === 'string' ? error : "İşlem başarısız.");
            toast.error(msg);
        }
    };

    const handleRemoveFollower = async (followerId: string) => {
        if (!currentUser) return;
        try {
            // Logic: Force unfollow (if checking own profile)
            await FollowService.unfollowUser(followerId, currentUser.uid);
            setFollowers(prev => prev.filter(u => u.uid !== followerId));
            toast.success("Takipçi çıkarıldı.");
        } catch (error: any) {
            console.error(error);
            const msg = error?.message || (typeof error === 'string' ? error : "İşlem başarısız.");
            toast.error(msg);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10">
                <DialogTitle className="sr-only">Bağlantılar</DialogTitle>
                {/* Header Removed as requested */}

                <Tabs defaultValue={defaultTab} className="w-full mt-6">
                    <div className="flex items-center justify-center mb-4">
                        <TabsList className="inline-flex w-max justify-center h-auto p-1 flex-nowrap bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10 rounded-lg">
                            <TabsTrigger value="followers" className="flex-none px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md transition-all">
                                Takipçiler <span className="ml-2 font-bold opacity-80">{followers.length}</span>
                            </TabsTrigger>
                            <TabsTrigger value="following" className="flex-none px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md transition-all">
                                Takip Edilen <span className="ml-2 font-bold opacity-80">{following.length}</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="mt-4 min-h-[300px]">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                <TabsContent value="followers">
                                    <ScrollArea className="h-[300px] px-3">
                                        <div className="space-y-4 pl-2">
                                            {followers.length === 0 && (
                                                <p className="text-center text-sm text-muted-foreground py-8">Takipçi yok.</p>
                                            )}
                                            {followers.map(u => (
                                                <div key={u.uid} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Link href={`/profil/${u.uid}`} onClick={onClose} className="pt-5 pl-5 pr-1 pb-1">
                                                            <UserAvatar
                                                                src={u.photoURL || undefined}
                                                                alt={u.username}
                                                                frameId={u.frame}
                                                                className="h-10 w-10"
                                                            />
                                                        </Link>
                                                        <div className="flex flex-col">
                                                            <Link href={`/profil/${u.uid}`} onClick={onClose} className="text-sm font-medium hover:underline">
                                                                {u.username}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                    {isOwnProfile && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFollower(u.uid)}>
                                                            Çıkar
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="following">
                                    <ScrollArea className="h-[300px] px-3">
                                        <div className="space-y-4 pl-2">
                                            {following.length === 0 && (
                                                <p className="text-center text-sm text-muted-foreground py-8">Kimse takip edilmiyor.</p>
                                            )}
                                            {following.map(u => (
                                                <div key={u.uid} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Link href={`/profil/${u.uid}`} onClick={onClose} className="pt-5 pl-5 pr-1 pb-1">
                                                            <UserAvatar
                                                                src={u.photoURL || undefined}
                                                                alt={u.username}
                                                                frameId={u.frame}
                                                                className="h-10 w-10"
                                                            />
                                                        </Link>
                                                        <div className="flex flex-col">
                                                            <Link href={`/profil/${u.uid}`} onClick={onClose} className="text-sm font-medium hover:underline">
                                                                {u.username}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                    {isOwnProfile && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-8 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                                            onClick={() => handleUnfollow(u.uid)}
                                                        >
                                                            Bırak
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog >
    );
}
