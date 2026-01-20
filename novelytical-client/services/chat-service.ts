import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
    limit,
    getDocs,
    writeBatch,
    increment,
    startAfter
} from "firebase/firestore";
import { UserService, UserProfile } from "./user-service";

const CHATS_COLLECTION = "chats";

export interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    createdAt: Timestamp;
    isRead: boolean;
}

export interface ChatSession {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageTime?: Timestamp;
    participantProfiles?: UserProfile[]; // Hydrated client-side
    unseenCount?: number; // Calculated client-side
}

export const ChatService = {
    /**
     * Creates or retrieves an existing chat between two users.
     * Uses a deterministic ID based on sorted user IDs.
     */
    async getOrCreateChat(user1: string, user2: string): Promise<string> {
        const sortedIds = [user1, user2].sort();
        const chatId = `${sortedIds[0]}_${sortedIds[1]}`;
        const chatRef = doc(db, CHATS_COLLECTION, chatId);

        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
            await setDoc(chatRef, {
                participants: sortedIds,
                createdAt: serverTimestamp(),
                lastMessage: null,
                lastMessageTime: null
            });
        }
        return chatId;
    },

    /**
     * Sends a message in a specific chat.
     */
    async sendMessage(chatId: string, senderId: string, content: string, recipientId?: string): Promise<void> {
        const chatRef = doc(db, CHATS_COLLECTION, chatId);
        const messagesRef = collection(chatRef, "messages");

        // If recipientId is not provided, try to find it (fallback)
        let targetUserId = recipientId;
        if (!targetUserId) {
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                const data = chatSnap.data();
                targetUserId = data.participants.find((p: string) => p !== senderId);
            }
        }

        const batch = writeBatch(db);

        // 1. Add message
        const newMessageRef = doc(messagesRef); // Auto-ID
        batch.set(newMessageRef, {
            senderId,
            content,
            createdAt: serverTimestamp(),
            isRead: false
        });

        // 2. Update chat metadata and increment unread count for recipient
        const updateData: any = {
            lastMessage: content,
            lastMessageTime: serverTimestamp()
        };

        if (targetUserId) {
            updateData[`unreadCounts.${targetUserId}`] = increment(1);
        }

        batch.update(chatRef, updateData);

        await batch.commit();
    },

    /**
     * Deletes a message from a chat.
     */
    async deleteMessage(chatId: string, messageId: string): Promise<void> {
        const messageRef = doc(db, CHATS_COLLECTION, chatId, "messages", messageId);
        await deleteDoc(messageRef);
    },

    /**
     * Subscribes to the messages of a specific chat.
     */
    subscribeToMessages(chatId: string, callback: (messages: ChatMessage[]) => void) {
        const messagesRef = collection(db, CHATS_COLLECTION, chatId, "messages");
        // Use desc to get LATEST messages, then client reverses them
        const q = query(messagesRef, orderBy("createdAt", "desc"), limit(30));

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
            callback(messages);
        });
    },

    /**
     * Fetches older messages for pagination.
     */
    async getOlderMessages(chatId: string, lastDoc: any, limitCount: number = 20): Promise<{ messages: ChatMessage[], lastVisible: any }> {
        const messagesRef = collection(db, CHATS_COLLECTION, chatId, "messages");

        let q = query(
            messagesRef,
            orderBy("createdAt", "desc"), // Consistent with subscription
            limit(limitCount)
        );

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ChatMessage));

        return {
            messages,
            lastVisible: snapshot.docs[snapshot.docs.length - 1]
        };
    },

    /**
     * Subscribes to the list of chats for a user.
     * Note: Firestore doesn't support easy "join" queries, so we might need to fetch profiles separately.
     */
    subscribeToUserChats(userId: string, callback: (chats: ChatSession[]) => void) {
        const q = query(
            collection(db, CHATS_COLLECTION),
            where("participants", "array-contains", userId),
            orderBy("lastMessageTime", "desc")
        );

        return onSnapshot(q, async (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatSession));

            // Hydrate profiles asynchronously
            // This is a bit naive for a listener (triggering async fetches on every snapshot), 
            // but fine for MVP scale.
            const hydratedChats = await Promise.all(chats.map(async chat => {
                const otherUserId = chat.participants.find(p => p !== userId);
                if (otherUserId) {
                    const profile = await UserService.getUserProfile(otherUserId);
                    if (profile) {
                        chat.participantProfiles = [profile];
                    }
                }

                // Use denormalized unread count
                const unreadCounts = (chat as any).unreadCounts || {};
                chat.unseenCount = unreadCounts[userId] || 0;

                return chat;
            }));

            callback(hydratedChats);
        });
    },

    /**
     * Subscribes to total unread message count across all chats.
     */
    subscribeToUnreadCount(userId: string, callback: (count: number) => void) {
        const q = query(
            collection(db, CHATS_COLLECTION),
            where("participants", "array-contains", userId)
        );

        return onSnapshot(q, async (snapshot) => {
            let totalUnread = 0;

            for (const chatDoc of snapshot.docs) {
                const data = chatDoc.data();
                const count = (data.unreadCounts?.[userId] || 0) as number;
                totalUnread += count;
            }

            callback(totalUnread);
        });
    },

    /**
     * Marks all unread messages in a chat as read for the current user.
     */
    async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
        const messagesRef = collection(db, CHATS_COLLECTION, chatId, "messages");
        const q = query(
            messagesRef,
            where("isRead", "==", false),
            where("senderId", "!=", userId)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        // Touch the chat document to trigger the unread count listener
        const chatRef = doc(db, CHATS_COLLECTION, chatId);
        batch.update(chatRef, {
            [`lastSeen_${userId}`]: serverTimestamp(),
            [`unreadCounts.${userId}`]: 0
        });

        await batch.commit();
    }
};
