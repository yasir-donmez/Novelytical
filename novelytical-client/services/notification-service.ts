
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp,
    limit,
    writeBatch,
    setDoc
} from "firebase/firestore";

export type NotificationType = 'reply' | 'system' | 'like' | 'dislike' | 'follow';

export interface Notification {
    id: string;
    recipientId: string;
    senderId?: string; // Optional (system messages might not have one)
    senderName?: string;
    senderImage?: string;
    senderFrame?: string; // Added senderFrame
    type: NotificationType;
    content: string;
    sourceId: string; // e.g., commentId or novelId
    sourceLink: string; // Internal link to redirect
    isRead: boolean;
    createdAt: Timestamp;
}

const COLLECTION_NAME = "notifications";

import { UserService } from "./user-service";

export const createNotification = async (
    recipientId: string,
    type: NotificationType,
    content: string,
    sourceId: string,
    sourceLink: string,
    senderId?: string,
    senderName?: string,
    senderImage?: string,
    senderFrame?: string,
    uniqueId?: string // Optional deterministic ID for deduplication
) => {
    try {
        if (recipientId === senderId) return; // Don't notify self

        // 1. Check User Settings
        // We use the cached getNotificationSettings from UserService
        const settings = await UserService.getNotificationSettings(recipientId);

        if (settings) {
            let allowed = true;
            // Map types to settings keys
            if (type === 'reply' || type === 'like' || type === 'dislike') {
                if (settings.pushReplies === false) allowed = false;
            } else if (type === 'follow') {
                if (settings.pushFollows === false) allowed = false;
            } else if (type === 'system') {
                // System updates usually bypass or use specific system setting, defaulting to allowed for critical ones
                // or use 'pushNewChapters' if it's content related? 
                // For generic system, we assume true unless blocked entirely?
                // Current settings don't have "Block System".
            }

            if (!allowed) {
                // console.log(`Notification suppressed by user settings: ${type} for ${recipientId}`);
                return;
            }
        }

        const notificationData = {
            recipientId,
            type,
            content,
            sourceId,
            sourceLink,
            senderId: senderId || null,
            senderName: senderName || null,
            senderImage: senderImage || null,
            senderFrame: senderFrame || null,
            isRead: false,
            createdAt: serverTimestamp()
        };

        if (uniqueId) {
            // Idempotent write: overwrites existing notification with same ID
            await setDoc(doc(db, COLLECTION_NAME, uniqueId), notificationData);
        } else {
            // Standard auto-ID
            await addDoc(collection(db, COLLECTION_NAME), notificationData);
        }
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

export const getUnreadNotifications = async (userId: string): Promise<Notification[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("recipientId", "==", userId),
            where("isRead", "==", false),
            orderBy("createdAt", "desc"),
            limit(20)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Notification));
    } catch (error) {
        console.error("Error fetching unread notifications:", error);
        return [];
    }
};

export const getAllNotifications = async (userId: string, limitCount = 20): Promise<Notification[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("recipientId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Notification));
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
};

export const markAsRead = async (notificationId: string) => {
    try {
        const ref = doc(db, COLLECTION_NAME, notificationId);
        await updateDoc(ref, { isRead: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
};

export const markAllAsRead = async (userId: string) => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("recipientId", "==", userId),
            where("isRead", "==", false)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error marking all as read:", error);
    }
};
