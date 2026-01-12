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
    getDocs
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
    async sendMessage(chatId: string, senderId: string, content: string): Promise<void> {
        const chatRef = doc(db, CHATS_COLLECTION, chatId);
        const messagesRef = collection(chatRef, "messages");

        await addDoc(messagesRef, {
            senderId,
            content,
            createdAt: serverTimestamp(),
            isRead: false
        });

        // Update last message on the chat document
        await updateDoc(chatRef, {
            lastMessage: content,
            lastMessageTime: serverTimestamp()
        });
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
        const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
            callback(messages);
        });
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
                const messagesRef = collection(db, CHATS_COLLECTION, chatDoc.id, "messages");
                const unreadQuery = query(
                    messagesRef,
                    where("isRead", "==", false),
                    where("senderId", "!=", userId)
                );
                const unreadSnap = await getDocs(unreadQuery);
                totalUnread += unreadSnap.size;
            }

            callback(totalUnread);
        });
    }
};
