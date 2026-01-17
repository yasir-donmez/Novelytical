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
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load user chats
    useEffect(() => {
        if (!user) return;
        const unsubscribe = ChatService.subscribeToUserChats(user.uid, (updatedChats) => {
            setChats(updatedChats);
        });
        return () => unsubscribe();
    }, [user]);

    // Load active chat messages
    useEffect(() => {
        if (!activeChat || !isOpen) {
            setMessages([]);
            return;
        }

        setIsLoadingMessages(true);
        const unsubscribe = ChatService.subscribeToMessages(activeChat.id, (msgs) => {
            setMessages(msgs);
            setIsLoadingMessages(false);

            // Mark as read if there are unread messages
            if (activeChat.id && user) {
                ChatService.markMessagesAsRead(activeChat.id, user.uid).catch(console.error);
            }
        });

        // Add scroll event listener to detect when not at bottom (visually top due to reverse)
        const scrollElement = scrollRef.current;
        const handleScroll = () => {
            if (scrollElement) {
                // In reverse mode, scrollTop > 0 means we successfully scrolled "up" (visually) into history
                // We want to show button if we are NOT at 0 (Visual Bottom)
                const isAtBottom = Math.abs(scrollElement.scrollTop) < 50;
                setShowScrollButton(!isAtBottom);
            }
        };

        // Use a timeout to attach listener to ensure ref is ready
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.addEventListener('scroll', handleScroll);
            }
        }, 100);

        return () => {
            unsubscribe();
            if (scrollRef.current) {
                scrollRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, [activeChat, isOpen]);

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

    if (!user) return null;

    // Calculate position to prevent scrollbar shift
    const positionStyle = {
        left: isOpen ? 'calc(100vw - 366px)' : 'calc(100vw - 72px)'
    };

    return (
        <div
            className="fixed bottom-4 z-50 transition-[left] duration-200"
            style={positionStyle}
        >
            {!isOpen && (
                <Button
                    className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-transform hover:scale-105 relative"
                    onClick={() => setIsOpen(true)}
                >
                    <MessageCircle className="h-6 w-6 text-white" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            )}

            {isOpen && (
                <div className="bg-background border border-border shadow-2xl rounded-2xl w-[350px] h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {/* Header */}
                    <div className="p-3 border-b flex items-center justify-between bg-muted/50">
                        {activeChat ? (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveChat(null)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-semibold text-sm truncate max-w-[150px]">
                                    {activeChat.participantProfiles?.[0]?.username || "Sohbet"}
                                </span>
                            </div>
                        ) : (
                            <span className="font-semibold ml-2">Mesajlar</span>
                        )}
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
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
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 transition-opacity duration-200">
                                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                <div
                                    ref={scrollRef}
                                    style={{ scrollBehavior: 'auto' }}
                                    className={cn(
                                        "flex-1 p-4 overscroll-contain scale-y-[-1] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
                                        isLoadingMessages ? "overflow-hidden opacity-0" : "overflow-y-auto"
                                    )}
                                >
                                    <div className="space-y-1 min-h-full">
                                        {messages.length === 0 && (
                                            <div className="text-center text-xs text-muted-foreground mt-4 scale-y-[-1]">
                                                Mesajlaşmaya başlayın.
                                            </div>
                                        )}
                                        {[...messages].reverse().map((msg) => {
                                            const isMe = msg.senderId === user.uid;
                                            return (
                                                <div key={msg.id} className={cn("flex group items-center gap-1 scale-y-[-1]", isMe ? "justify-end" : "justify-start")}>
                                                    {isMe && (
                                                        <button
                                                            onClick={() => ChatService.deleteMessage(activeChat.id, msg.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                                                            title="Mesajı sil"
                                                        >
                                                            <Trash2 className="h-3 w-3 text-destructive" />
                                                        </button>
                                                    )}
                                                    <div className={cn(
                                                        "px-3 py-2 rounded-2xl text-sm max-w-[75%] relative min-w-[60px]",
                                                        isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                                                    )}>
                                                        <span className="break-words">{msg.content}</span>
                                                        <div className={cn(
                                                            "text-[10px] mt-1 text-right opacity-70",
                                                            isMe ? "text-primary-foreground/80" : "text-muted-foreground"
                                                        )}>
                                                            {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Scroll to bottom button - only show when not at bottom */}
                                {showScrollButton && (
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute bottom-16 right-4 h-8 w-8 rounded-full shadow-lg"
                                        onClick={() => {
                                            if (scrollRef.current) {
                                                scrollRef.current.scrollTop = 0; // 0 is visually bottom in reverse mode
                                            }
                                        }}
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                )}

                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(e); }}
                                    className="p-3 border-t bg-background flex gap-2 items-end"
                                >
                                    <div className="flex-1 relative">
                                        <Textarea
                                            ref={textareaRef}
                                            value={newMessage}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                                setNewMessage(e.target.value);
                                                // Auto-resize
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
                                            className="min-h-[40px] max-h-[120px] rounded-2xl px-4 py-3 resize-none scrollbar-hide break-all"
                                            rows={1}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="h-10 w-10 rounded-full shrink-0 mb-0.5"
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        ) : (
                            // Chat List
                            <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
                                {chats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground p-4 text-center">
                                        <MessageCircle className="h-10 w-10 mb-2 opacity-20" />
                                        <p className="text-sm">Henüz mesajınız yok.</p>
                                        <p className="text-xs mt-1">Takipleştiğiniz kişilerin profiline giderek mesaj atabilirsiniz.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col p-2">
                                        {chats.map(chat => {
                                            const otherUser = chat.participantProfiles?.[0];
                                            if (!otherUser) return null; // Loading or error
                                            return (
                                                <button
                                                    key={chat.id}
                                                    className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors text-left"
                                                    onClick={() => setActiveChat(chat)}
                                                >
                                                    <UserAvatar
                                                        src={otherUser.photoURL}
                                                        alt={otherUser.username}
                                                        frameId={otherUser.frame}
                                                        size="lg"
                                                        className="h-10 w-10" // Explicit override if needed, though size="lg" is 10
                                                    >
                                                        <UserPresenceIndicator
                                                            userId={otherUser.uid}
                                                            showOnlineStatus={otherUser.privacySettings?.showOnlineStatus ?? true}
                                                            className="h-3 w-3 right-0 bottom-0 border-[2px] z-50"
                                                        />
                                                    </UserAvatar>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <span className="font-medium text-sm truncate">{otherUser.username}</span>
                                                                {chat.unseenCount && chat.unseenCount > 0 ? (
                                                                    <span className="bg-red-500 text-white rounded-full text-[10px] min-w-[20px] h-5 flex items-center justify-center px-1 font-bold shrink-0 animate-in zoom-in-50 duration-200">
                                                                        {chat.unseenCount > 9 ? '9+' : chat.unseenCount}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            {chat.lastMessageTime && (
                                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                                    {formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: false, locale: tr })}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate opacity-80">
                                                            {chat.lastMessage || "Resim gönderildi"}
                                                        </p>
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

