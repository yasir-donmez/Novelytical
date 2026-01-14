"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    Notification
} from "@/services/notification-service";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, Check, MessageCircle, Heart, UserPlus, Circle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/firebase"; // For realtime updates if needed, but polling is simpler for now
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Realtime listener for notifications
        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", user.uid),
            where("isRead", "==", false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const unreadData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));

            // Sort by createdAt desc in client since snapshot order isn't guaranteed without index/sort in query
            // But complex query requires index. Let's sort locally for the Dropdown.
            unreadData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            setNotifications(unreadData);
            setUnreadCount(unreadData.length);
        });

        return () => unsubscribe();
    }, [user]);

    const handleRead = async (id: string, link: string) => {
        // Optimistic
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await markAsRead(id);
        // Navigation is handled by Link wrapper
    };

    const handleMarkAllRead = async () => {
        setNotifications([]);
        setUnreadCount(0);
        await markAllAsRead(user!.uid);
    };

    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white hover:bg-white/10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-black" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <span className="font-semibold text-sm">Bildirimler</span>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-purple-400 hover:text-purple-300"
                        >
                            Tümünü okundu işaretle
                        </button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            <Bell className="mx-auto h-8 w-8 opacity-20 mb-2" />
                            Yeni bildiriminiz yok.
                        </div>
                    ) : (
                        <div className="py-1">
                            {notifications.map((notification) => (
                                <BellNotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onRead={handleRead}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function BellNotificationItem({ notification, onRead }: { notification: Notification, onRead: (id: string, link: string) => void }) {
    const [senderFrame, setSenderFrame] = useState(notification.senderFrame);
    const [senderImage, setSenderImage] = useState(notification.senderImage);

    useEffect(() => {
        if (notification.senderId) {
            import("firebase/firestore").then(({ doc, getDoc }) => {
                getDoc(doc(db, "users", notification.senderId!)).then(userDoc => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setSenderFrame(userData.selectedFrame);
                        setSenderImage(userData.photoURL);
                    }
                });
            });
        }
    }, [notification.senderId]);

    return (
        <Link
            href={notification.sourceLink || '#'}
            onClick={() => onRead(notification.id, notification.sourceLink)}
        >
            <DropdownMenuItem className="p-3 cursor-pointer items-start gap-3 mx-1 focus:bg-white/5">
                <div className="relative shrink-0">
                    {senderImage || senderFrame ? (
                        <UserAvatar
                            src={senderImage}
                            alt={notification.senderName}
                            frameId={senderFrame}
                            className="h-10 w-10 rounded-full"
                        />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                            <Bell className="h-4 w-4 text-zinc-400" />
                        </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-sm border border-border z-10">
                        {notification.type === 'like' && <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 p-0.5" />}
                        {notification.type === 'dislike' && <Heart className="w-3.5 h-3.5 text-gray-500 p-0.5" />}
                        {notification.type === 'reply' && <MessageCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500 p-0.5" />}
                        {notification.type === 'follow' && <UserPlus className="w-3.5 h-3.5 text-green-500 fill-green-500 p-0.5" />}
                        {notification.type === 'system' && <Bell className="w-3.5 h-3.5 text-amber-500 p-0.5" />}
                    </div>
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm leading-snug line-clamp-2 break-all">
                        {notification.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: tr }) : "Az önce"}
                    </p>
                </div>
                <div className="h-2 w-2 rounded-full bg-purple-500 mt-2 shrink-0" />
            </DropdownMenuItem>
        </Link>
    );
}
