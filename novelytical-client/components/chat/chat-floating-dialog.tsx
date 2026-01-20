"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ChatService, ChatSession, ChatMessage } from "@/services/chat-service";
import { UserProfile } from "@/services/user-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserPresenceIndicator } from "./user-presence-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Minimize2, Send, ChevronLeft, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export function ChatFloatingDialog() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false); // For infinite scroll
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load user chats... (unchanged)
    useEffect(() => {
        if (!user) return;
        const unsubscribe = ChatService.subscribeToUserChats(user.uid, (updatedChats) => {
            setChats(updatedChats);
        });
        return () => unsubscribe();
    }, [user]);

    // Load active chat messages (Hybrid: Realtime + History)
    useEffect(() => {
        if (!activeChat || !isOpen) {
            setMessages([]);
            return;
        }

        setIsLoadingMessages(true);
        // Reset pagination
        setHasMore(true);

        const unsubscribe = ChatService.subscribeToMessages(activeChat.id, (realtimeMessages) => {
            // Updated Logic:
            // realtimeMessages are the LATEST 30 messages (Desc).
            // We want to merge these into our existing list without losing fetched history.
            // Since realtime updates usually affect the "Head" (newest), we replace the start.

            setMessages(prev => {
                // If clean slate (initial load), just take them
                if (prev.length === 0) {
                    setHasMore(realtimeMessages.length === 30);
                    return realtimeMessages;
                }

                // If updating, merge based on ID to avoid dupes
                const msgMap = new Map(prev.map(m => [m.id, m]));

                // Update/Add new messages
                realtimeMessages.forEach(m => msgMap.set(m.id, m));

                // Convert back to array and sort DESC (Newest First)
                const merged = Array.from(msgMap.values()).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

                return merged;
            });

            setIsLoadingMessages(false);

            // Mark as read...
            if (activeChat.id && user) {
                ChatService.markMessagesAsRead(activeChat.id, user.uid).catch(console.error);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [activeChat, isOpen]);



    // Auto-scroll logic... (keep or modify)
    // If flipped container, scrollTop 0 is BOTTOM (Newest).
    // So usually stays at bottom.


    // Cleanup scroll button logic - simpler now since default is bottom
    useEffect(() => {
        if (showScrollButton && !activeChat) setShowScrollButton(false);
    }, [activeChat, showScrollButton]);

    // Separate effect for auto-scrolling
    useEffect(() => {
        if (messages.length > 0 && isOpen) {
            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = 0; // Scroll to visual bottom (actual top)
                    setShowScrollButton(false);
                }
            }, 50); // Reduced delay slightly for snappier feel
            return () => clearTimeout(timer);
        }
    }, [messages, isOpen, activeChat]);

    // Subscribe to unread message count
    useEffect(() => {
        if (!user) return;
        const unsubscribe = ChatService.subscribeToUnreadCount(user.uid, (count) => {
            setUnreadCount(count);
        });
        return () => unsubscribe();
    }, [user]);

    // Handle external open requests
    useEffect(() => {
        if (!user) return;
        const handleOpenChat = async (e: any) => {
            const targetId = e.detail.userId;
            try {
                // 1. Open Dialog
                setIsOpen(true);

                // 2. Check if we already have this chat in our list to avoid refetching
                const existingChat = chats.find(c => c.participants.includes(targetId));
                if (existingChat) {
                    setActiveChat(existingChat);
                    return;
                }

                // 3. If not, create/get it and manually construct a temp chat object
                const chatId = await ChatService.getOrCreateChat(user.uid, targetId);
                const targetProfile = await import("@/services/user-service").then(m => m.UserService.getUserProfile(targetId));

                if (targetProfile) {
                    setActiveChat({
                        id: chatId,
                        participants: [user.uid, targetId],
                        participantProfiles: [targetProfile]
                    });
                }
            } catch (error) {
                console.error("Failed to open chat", error);
            }
        };

        window.addEventListener('open-chat', handleOpenChat);
        return () => window.removeEventListener('open-chat', handleOpenChat);
    }, [user, chats]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !activeChat || !newMessage.trim()) return;

        const messageToSend = newMessage.trim();

        // Optimistic clear
        setNewMessage("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        const recipientId = activeChat.participants.find(p => p !== user.uid);

        try {
            await ChatService.sendMessage(activeChat.id, user.uid, messageToSend, recipientId);
        } catch (error) {
            console.error(error);
            // Optionally restore message on failure could go here, but for now simple optimistic is fine
            setNewMessage(messageToSend); // Restore if failed
        }
    };

    // Load More Function
    const loadMore = async () => {
        if (!activeChat || isLoadingMore || !hasMore || messages.length === 0) return;

        setIsLoadingMore(true);
        const lastMsg = messages[messages.length - 1]; // Oldest

        try {
            const { messages: older } = await ChatService.getOlderMessages(activeChat.id, lastMsg.createdAt);

            if (older.length > 0) {
                setMessages(prev => {
                    const msgMap = new Map(prev.map(m => [m.id, m]));
                    older.forEach(m => msgMap.set(m.id, m));
                    return Array.from(msgMap.values()).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                });
                setHasMore(older.length === 20);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Failed to load older messages", e);
        }
        setIsLoadingMore(false);
    };

    // New Observer
    useEffect(() => {
        const scrollElement = scrollRef.current;
        if (!scrollElement) return;

        const handleScroll = () => {
            const isAtBottom = Math.abs(scrollElement.scrollTop) < 50;
            setShowScrollButton(!isAtBottom);

            if (!isLoadingMore && hasMore) {
                loadMore();
            }
        };

        scrollElement.addEventListener('scroll', handleScroll);
        return () => scrollElement.removeEventListener('scroll', handleScroll);
    }, [isLoadingMore, hasMore, messages, activeChat]);

    if (!user) return null;

    // Calculate position to prevent scrollbar shift
    const positionStyle = {
        left: isOpen ? 'calc(100vw - 366px)' : 'calc(100vw - 72px)'
    };

    return (
        <div className={cn(
            "fixed z-50 flex flex-col items-end gap-4 pointer-events-none",
            isOpen ? "inset-0 md:inset-auto md:bottom-4 md:right-4 w-full md:w-auto h-full md:h-auto" : "bottom-20 md:bottom-4 right-4 w-auto"
        )}>
            {isOpen && (
                <div className="pointer-events-auto bg-background md:bg-background/80 md:backdrop-blur-xl border-0 md:border md:border-white/20 dark:md:border-white/10 shadow-none md:shadow-2xl md:shadow-primary/10 rounded-none md:rounded-3xl w-full md:w-[380px] h-full md:h-[600px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 zoom-in-95 fade-in duration-300 ease-out origin-bottom-right">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-muted/30 backdrop-blur-md">
                        {activeChat ? (
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={() => setActiveChat(null)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-2">
                                    <UserAvatar
                                        src={activeChat?.participantProfiles?.[0]?.photoURL}
                                        alt={activeChat?.participantProfiles?.[0]?.username}
                                        frameId={activeChat?.participantProfiles?.[0]?.frame}
                                        size="sm"
                                        className="h-8 w-8"
                                    />
                                    <span className="font-semibold text-sm truncate max-w-[120px]">
                                        {activeChat?.participantProfiles?.[0]?.username || "Sohbet"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <span className="font-semibold ml-2 text-lg tracking-tight">Mesajlar</span>
                        )}
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => setIsOpen(false)}>
                                <Minimize2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden relative">
                        {activeChat ? (
                            // Chat View
                            <div className="flex flex-col h-full relative">
                                {isLoadingMessages && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 transition-opacity duration-200">
                                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                <div
                                    ref={scrollRef}
                                    style={{ scrollBehavior: 'auto' }}
                                    className={cn(
                                        "flex-1 p-4 overscroll-contain scale-y-[-1] custom-scrollbar",
                                        isLoadingMessages ? "overflow-hidden opacity-0" : "overflow-y-auto"
                                    )}
                                >
                                    <div className="space-y-2 min-h-full pb-2">
                                        {messages.length === 0 && (
                                            <div className="text-center flex flex-col items-center justify-center h-full scale-y-[-1] text-muted-foreground/60 gap-2">
                                                <MessageCircle className="h-8 w-8 opacity-20" />
                                                <span className="text-sm">Sohbeti başlatın</span>
                                            </div>
                                        )}
                                        {/* Messages (already DESC, so in flipped container: 0 (Newest) is Bottom) */}
                                        {messages.map((msg, index, arr) => {
                                            const isMe = msg.senderId === user?.uid;
                                            // Since list is DESC (Newest...Oldest), previous message in time is index+1
                                            const prevMsg = arr[index + 1];
                                            // Sequence check logic might need adjustment depending on visual grouping
                                            // If we group by sender... 
                                            // prevMsg (older) sender same as current?
                                            const isSequence = prevMsg && prevMsg.senderId === msg.senderId;

                                            return (
                                                <div key={msg.id} className={cn("flex group items-end gap-2 scale-y-[-1]", isMe ? "justify-end" : "justify-start")}>
                                                    {!isMe && !isSequence && (
                                                        <UserAvatar
                                                            src={activeChat.participantProfiles?.[0]?.photoURL}
                                                            alt="User"
                                                            size="sm"
                                                            className="h-6 w-6 mb-1"
                                                            frameId={activeChat?.participantProfiles?.[0]?.frame}
                                                        />
                                                    )}
                                                    {!isMe && isSequence && <div className="w-6" />} {/* Placeholder for alignment */}

                                                    <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                                                        {isMe && (
                                                            <button
                                                                onClick={() => ChatService.deleteMessage(activeChat!.id, msg.id)}
                                                                className="opacity-0 group-hover:opacity-100 transition-all absolute -top-4 right-0 p-1 hover:text-destructive"
                                                                title="Mesajı sil"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                        <div className={cn(
                                                            "px-4 py-2.5 text-sm shadow-sm relative",
                                                            isMe
                                                                ? "bg-purple-600 text-white rounded-2xl rounded-br-sm"
                                                                : "bg-muted/80 backdrop-blur-md rounded-2xl rounded-bl-sm border border-white/5"
                                                        )}>
                                                            <span className="break-words leading-relaxed">{msg.content}</span>
                                                        </div>
                                                        <span className={cn(
                                                            "text-[10px] mt-1 px-1 opacity-50 select-none",
                                                            isMe ? "text-right" : "text-left"
                                                        )}>
                                                            {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {/* Loading More Indicator (Visual Top) */}
                                        {isLoadingMore && (
                                            <div className="w-full flex justify-center py-2 scale-y-[-1]">
                                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Scroll to bottom button */}
                                {showScrollButton && (
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute bottom-20 right-4 h-8 w-8 rounded-full shadow-lg bg-background/80 backdrop-blur border"
                                        onClick={() => {
                                            if (scrollRef.current) {
                                                scrollRef.current.scrollTop = 0;
                                            }
                                        }}
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                )}

                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(e); }}
                                    className="p-3 border-t border-white/10 bg-muted/20 backdrop-blur-md flex gap-2 items-end"
                                >
                                    <div className="flex-1 relative">
                                        <Textarea
                                            ref={textareaRef}
                                            value={newMessage}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                                setNewMessage(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                            }}
                                            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e as any);
                                                }
                                            }}
                                            placeholder="Mesaj yaz..."
                                            className="min-h-[44px] max-h-[120px] rounded-3xl px-4 py-3 resize-none scrollbar-hide break-all bg-background/50 border-white/10 focus:border-primary/50 focus:bg-background transition-colors"
                                            rows={1}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className={cn(
                                            "h-11 w-11 rounded-full shrink-0 transition-all duration-300",
                                            newMessage.trim() ? "bg-purple-600 hover:bg-purple-700 scale-100" : "bg-muted translate-x-2 opacity-0 w-0 px-0"
                                        )}
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send className="h-5 w-5 ml-0.5" />
                                    </Button>
                                </form>
                            </div>
                        ) : (
                            // Chat List
                            <div className="h-full overflow-y-auto custom-scrollbar">
                                {chats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground p-6 text-center">
                                        <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                            <MessageCircle className="h-8 w-8 opacity-40" />
                                        </div>
                                        <p className="text-base font-medium text-foreground">Henüz mesajınız yok</p>
                                        <p className="text-sm mt-2 opacity-70">Takipleştiğiniz kişilerin profiline giderek sohbet başlatabilirsiniz.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col p-2 gap-1.5">
                                        {chats.map(chat => {
                                            const otherUser = chat.participantProfiles?.[0];
                                            if (!otherUser) return null;
                                            return (
                                                <button
                                                    key={chat.id}
                                                    className="group flex items-center gap-3 p-3 hover:bg-muted/60 active:bg-muted/80 rounded-2xl transition-all duration-200 text-left border border-transparent hover:border-white/5"
                                                    onClick={() => setActiveChat(chat)}
                                                >
                                                    <div className="relative">
                                                        <UserAvatar
                                                            src={otherUser.photoURL}
                                                            alt={otherUser.username}
                                                            frameId={otherUser.frame}
                                                            size="lg"
                                                            className="h-12 w-12 transition-transform group-hover:scale-105"
                                                        >
                                                            <UserPresenceIndicator
                                                                userId={otherUser.uid}
                                                                showOnlineStatus={otherUser.privacySettings?.showOnlineStatus ?? true}
                                                                className="h-3.5 w-3.5 right-0 bottom-0 border-[3px] border-background z-50"
                                                            />
                                                        </UserAvatar>
                                                    </div>
                                                    <div className="flex-1 overflow-hidden min-w-0">
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <span className="font-semibold text-sm truncate">{otherUser.username}</span>
                                                            </div>
                                                            {chat.lastMessageTime && (
                                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 opacity-70">
                                                                    {formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: false, locale: tr })}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <p className={cn(
                                                                "text-xs truncate max-w-[180px]",
                                                                chat.unseenCount && chat.unseenCount > 0 ? "text-foreground font-medium" : "text-muted-foreground opacity-80"
                                                            )}>
                                                                {chat.lastMessage || "Resim gönderildi"}
                                                            </p>
                                                            {chat.unseenCount && chat.unseenCount > 0 ? (
                                                                <span className="bg-purple-600 text-white rounded-full text-[10px] min-w-[20px] h-5 flex items-center justify-center px-1.5 font-bold shrink-0 animate-in zoom-in-50 duration-200 shadow-md shadow-purple-900/20">
                                                                    {chat.unseenCount > 9 ? '9+' : chat.unseenCount}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!isOpen && (
                <Button
                    className={cn(
                        "pointer-events-auto h-14 w-14 rounded-full shadow-xl bg-purple-600 hover:bg-purple-700 transition-all duration-300 relative group overflow-hidden",
                        "scale-100 opacity-100 hover:scale-110"
                    )}
                    onClick={() => setIsOpen(true)}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <MessageCircle className="h-6 w-6 text-primary-foreground relative z-10" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse border-2 border-background">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            )}
        </div>
    );
}

// Global helper to open chat from other components
// We'll use a custom event for simplicity in this MVP
export const openChatWithUser = (userId: string) => {
    const event = new CustomEvent('open-chat', { detail: { userId } });
    window.dispatchEvent(event);
};

// Add listener logic inside the component

