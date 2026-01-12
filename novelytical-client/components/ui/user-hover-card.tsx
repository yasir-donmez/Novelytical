"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { FollowService } from "@/services/follow-service";
import { UserService, UserProfile } from "@/services/user-service";
import { CalendarDays, MapPin, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface UserHoverCardProps {
    userId: string;
    username: string;
    image?: string | null;
    frame?: string | null;
    children: React.ReactNode;
    className?: string;
}

export function UserHoverCard({ userId, username, image, frame, children, className }: UserHoverCardProps) {
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isFollowed, setIsFollowed] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Initial optimistic data if we don't fetch full profile yet
    const displayImage = image;
    const displayName = username;

    useEffect(() => {
        if (!isOpen) return;

        const handleScroll = () => {
            setIsOpen(false);
        };

        window.addEventListener("scroll", handleScroll, true);
        return () => window.removeEventListener("scroll", handleScroll, true);
    }, [isOpen]);

    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);
        const fetchUserData = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const promises: Promise<any>[] = [
                    UserService.getUserProfile(userId),
                    FollowService.getFollowerCount(userId),
                    FollowService.getFollowingCount(userId)
                ];

                if (currentUser && currentUser.uid !== userId) {
                    promises.push(FollowService.isFollowing(currentUser.uid, userId));
                }

                const results = await Promise.all(promises);

                const userProfile = results[0];
                const followers = results[1];
                const following = results[2];

                setProfile(userProfile);
                setFollowerCount(followers);
                setFollowingCount(following);

                if (currentUser && currentUser.uid !== userId) {
                    setIsFollowed(results[3]);
                }
            } catch (error) {
                console.error("Error fetching user data for hover card:", error);
            } finally {
                setLoading(false);
            }
        };
        if (open && !profile) {
            fetchUserData();
        }
    };

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser) return;

        const previousState = isFollowed;
        const previousCount = followerCount;

        // Optimistic update
        setIsFollowed(!isFollowed);
        setFollowerCount(prev => isFollowed ? prev - 1 : prev + 1);

        try {
            if (previousState) {
                await FollowService.unfollowUser(currentUser.uid, userId);
            } else {
                await FollowService.followUser(currentUser.uid, userId);
            }
        } catch (error) {
            // Revert
            setIsFollowed(previousState);
            setFollowerCount(previousCount);
        }
    };

    return (
        <HoverCard open={isOpen} onOpenChange={handleOpenChange} openDelay={200}>
            <HoverCardTrigger asChild>
                <Link href={`/profile/${userId}`} className={className}>
                    {children}
                </Link>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-0 overflow-hidden ml-4 z-[1000]" sideOffset={10}>
                <div className="relative h-14 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
                    {/* Cover Placeholder */}
                </div>
                <div className="px-3 pb-3 -mt-8 relative">
                    <div className="flex justify-between items-end">
                        <UserAvatar
                            src={displayImage || profile?.photoURL}
                            alt={displayName}
                            frameId={frame}
                            className="w-16 h-16 shadow-lg rounded-full bg-background"
                        />
                        {currentUser && currentUser.uid !== userId && (
                            <Button
                                size="sm"
                                variant={isFollowed ? "secondary" : "default"}
                                onClick={handleFollowToggle}
                                className={cn(
                                    "h-8 text-xs font-semibold rounded-full px-4",
                                    isFollowed && "text-muted-foreground"
                                )}
                            >
                                {isFollowed ? "Takip Ediliyor" : "Takip Et"}
                            </Button>
                        )}
                    </div>

                    <div className="mt-1.5 space-y-0.5 min-h-[52px]">
                        <Link href={`/profile/${userId}`} className="font-bold text-base hover:underline decoration-primary block truncate">
                            {displayName}
                        </Link>
                        {loading && !profile ? (
                            <div className="space-y-1.5 pt-0.5">
                                <Skeleton className="h-3 w-24" />
                                <div className="flex items-center gap-2 mt-2">
                                    <Skeleton className="h-3 w-3 rounded-full" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground truncate">@{profile?.username || displayName}</p>
                                {profile?.createdAt && (
                                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground h-3">
                                        <CalendarDays className="w-3 h-3 shrink-0" />
                                        <span>
                                            {format(profile.createdAt.toDate(), "d MMMM yyyy", { locale: tr })}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 h-[37px] box-content">
                        {loading ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-3 w-8" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-3 w-10" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-xs">
                                    <span className="font-bold text-foreground">{followingCount}</span>{" "}
                                    <span className="text-muted-foreground">Takip</span>
                                </div>
                                <div className="text-xs">
                                    <span className="font-bold text-foreground">{followerCount}</span>{" "}
                                    <span className="text-muted-foreground">Takipçi</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}

