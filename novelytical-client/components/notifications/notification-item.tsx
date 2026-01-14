"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Notification } from "@/services/notification-service";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, UserPlus, Bell } from "lucide-react";

interface NotificationItemProps {
    notification: Notification;
    onClick: () => void;
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const [senderFrame, setSenderFrame] = useState(notification.senderFrame);
    const [senderImage, setSenderImage] = useState(notification.senderImage);

    useEffect(() => {
        // Fetch latest user data to ensure frame/image transparency
        if (notification.senderId) {
            const fetchUserData = async () => {
                try {
                    const { doc, getDoc } = await import("firebase/firestore");
                    const { db } = await import("@/lib/firebase");
                    const userDoc = await getDoc(doc(db, "users", notification.senderId!));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setSenderFrame(userData.selectedFrame);
                        setSenderImage(userData.photoURL);
                    }
                } catch (error) {
                    console.error("Error fetching user data for notification:", error);
                }
            };
            fetchUserData();
        }
    }, [notification.senderId]);

    const getIcon = () => {
        switch (notification.type) {
            case 'like': return <Heart className="w-3 h-3 text-red-500 fill-red-500" />;
            case 'dislike': return <Heart className="w-3 h-3 text-gray-500" />;
            case 'reply': return <MessageCircle className="w-3 h-3 text-blue-500 fill-blue-500" />;
            case 'follow': return <UserPlus className="w-3 h-3 text-green-500 fill-green-500" />;
            default: return <Bell className="w-3 h-3 text-purple-500" />;
        }
    };

    return (
        <Link
            href={notification.sourceLink || '#'}
            onClick={onClick}
            className={cn(
                "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors border-b last:border-0",
                !notification.isRead && "bg-primary/5 hover:bg-primary/10"
            )}
        >
            <div className="relative shrink-0">
                <UserAvatar
                    src={senderImage}
                    alt={notification.senderName || ""}
                    frameId={senderFrame}
                    className="w-10 h-10 rounded-full"
                />
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-[2px] shadow-sm border border-border z-20">
                    {getIcon()}
                </div>
            </div>

            <div className="flex-1 space-y-1">
                <p className="text-sm leading-snug">
                    {notification.content}
                </p>
                <p className="text-[10px] text-muted-foreground">
                    {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: tr }) : 'Az önce'}
                </p>
            </div>

            {!notification.isRead && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
            )}
        </Link>
    );
}
