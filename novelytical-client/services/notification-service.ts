
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
    writeBatch
} from "firebase/firestore";

export type NotificationType = 'reply' | 'system' | 'like' | 'dislike';

export interface Notification {
    id: string;
    recipientId: string;
    senderId?: string; // Optional (system messages might not have one)
    senderName?: string;
    senderImage?: string;
    type: NotificationType;
    content: string;
    sourceId: string; // e.g., commentId or novelId
    sourceLink: string; // Internal link to redirect
    isRead: boolean;
    createdAt: Timestamp;
}

const COLLECTION_NAME = "notifications";

export const createNotification = async (
    recipientId: string,
    type: NotificationType,
    content: string,
    sourceId: string,
    sourceLink: string,
    senderId?: string,
    senderName?: string,
    senderImage?: string
) => {
    try {
        if (recipientId === senderId) return; // Don't notify self

        await addDoc(collection(db, COLLECTION_NAME), {
            recipientId,
            type,
            content,
            sourceId,
            sourceLink,
            senderId,
            senderName,
            senderImage,
            isRead: false,
            createdAt: serverTimestamp()
        });
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
