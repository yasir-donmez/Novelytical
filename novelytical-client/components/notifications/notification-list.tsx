"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getAllNotifications, markAsRead, Notification } from "@/services/notification-service";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Bell, MessageSquare, ThumbsUp, ThumbsDown, Info, Heart, UserPlus, MessageCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NotificationList() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
    }, [user]);

    const fetchNotifications = async () => {
        try {
            if (!user) return;
            const data = await getAllNotifications(user.uid, 50);
            setNotifications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRead = async (notification: Notification) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
            );
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Henüz bildiriminiz yok.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
                {notifications.map((notification) => (
                    <NotificationListItem
                        key={notification.id}
                        notification={notification}
                        onRead={handleRead}
                    />
                ))}
            </div>
        </ScrollArea>
    );
}

function NotificationListItem({ notification, onRead }: { notification: Notification, onRead: (n: Notification) => void }) {
    const [senderFrame, setSenderFrame] = useState(notification.senderFrame);
    const [senderImage, setSenderImage] = useState(notification.senderImage);

    useEffect(() => {
        if (notification.senderId) {
            import("firebase/firestore").then(({ doc, getDoc }) => {
                import("@/lib/firebase").then(({ db }) => {
                    getDoc(doc(db, "users", notification.senderId!)).then(userDoc => {
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            setSenderFrame(userData.selectedFrame);
                            setSenderImage(userData.photoURL);
                        }
                    });
                });
            });
        }
    }, [notification.senderId]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'reply': return <MessageSquare className="h-4 w-4 text-blue-500" />;
            case 'like': return <ThumbsUp className="h-4 w-4 text-green-500" />;
            case 'dislike': return <ThumbsDown className="h-4 w-4 text-red-500" />;
            case 'system': return <Info className="h-4 w-4 text-amber-500" />;
            default: return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    const getIconOverlay = () => {
        switch (notification.type) {
            case 'like': return <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 p-0.5" />;
            case 'dislike': return <Heart className="w-3.5 h-3.5 text-gray-500 p-0.5" />;
            case 'reply': return <MessageCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500 p-0.5" />;
            case 'follow': return <UserPlus className="w-3.5 h-3.5 text-green-500 fill-green-500 p-0.5" />;
            case 'system': return <Bell className="w-3.5 h-3.5 text-amber-500 p-0.5" />;
            default: return <Bell className="w-3.5 h-3.5 text-gray-500 p-0.5" />;
        }
    };

    return (
        <Link
            href={notification.sourceLink || '#'}
            onClick={() => onRead(notification)}
            className={cn(
                "flex gap-4 p-4 rounded-xl border transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                notification.isRead
                    ? "bg-background border-border/40 opacity-70"
                    : "bg-zinc-50 dark:bg-zinc-900/30 border-primary/20 shadow-sm"
            )}
        >
            <div className="shrink-0 pt-1 relative">
                {notification.senderId ? (
                    <div className="relative">
                        <UserAvatar
                            src={senderImage}
                            alt={notification.senderName || 'User'}
                            frameId={senderFrame}
                            className="h-10 w-10"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-sm border border-border z-10">
                            {getIconOverlay()}
                        </div>
                    </div>
                ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {getIcon(notification.type)}
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                        {notification.senderName || 'Sistem'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        • {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: tr })}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 break-all">
                    {notification.content}
                </p>
            </div>

            {!notification.isRead && (
                <div className="shrink-0 self-center">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
            )}
        </Link>
    );
}
