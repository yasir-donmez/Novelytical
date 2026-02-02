'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, subscribeToRoomMessages, sendRoomMessage } from '@/services/feed-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Send, Loader2, BarChart2 as PollIcon, X, Book } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { NovelSearchModal } from './novel-search-modal';

interface RoomChatProps {
    roomId: number;
    user: any;
    onClose?: () => void;
}

export function RoomChat({ roomId, user, onClose }: RoomChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Poll State
    const [isPoll, setIsPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState<{ text: string, novelId?: number, novelTitle?: string }[]>([{ text: '' }, { text: '' }]);
    const [optionCount, setOptionCount] = useState<2 | 3 | 4>(2);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);

    // Subscribe to messages
    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = subscribeToRoomMessages(roomId, (msgs) => {
            setMessages(msgs);
            setIsLoading(false);
            // Scroll to bottom on new message
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [roomId]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || sending) return;

        try {
            setSending(true);
            await sendRoomMessage(roomId, newMessage, user);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full relative">

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth"
            >
                {isLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="animate-spin mr-2" /> Sohbet yükleniyor...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                        <p className="text-sm">Henüz mesaj yok.</p>
                        <p className="text-xs">İlk mesajı sen yaz!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.userId === user?.uid;
                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <UserAvatar
                                    src={msg.userAvatarUrl}
                                    alt={msg.userDisplayName || 'User'}
                                    className="w-8 h-8 shrink-0 border border-white/10"
                                />
                                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {msg.userDisplayName}
                                        </span>
                                        {msg.createdAt && (
                                            <span className="text-[9px] text-muted-foreground/60">
                                                {formatDistanceToNow(new Date(msg.createdAt?.toDate ? msg.createdAt.toDate() : msg.createdAt || Date.now()), { addSuffix: true, locale: tr })}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`px-3 py-2 rounded-2xl text-sm ${isMe
                                        ? 'bg-purple-600 text-white rounded-tr-none'
                                        : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-white/5'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            {/* Input Area */}
            <div className="p-2 relative z-20">
                {isPoll && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-950/95 p-3 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2 backdrop-blur-3xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                <PollIcon size={12} className="text-primary" /> Anket Oluştur
                            </span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10" onClick={() => {
                                setIsPoll(false);
                                setOptionCount(2);
                                setPollOptions([{ text: '' }, { text: '' }]);
                            }}>
                                <X size={14} />
                            </Button>
                        </div>

                        <div className="flex gap-1 mb-2">
                            <span className="text-[10px] text-muted-foreground self-center mr-1">Seçenek:</span>
                            {([2, 3, 4] as const).map((count) => (
                                <button
                                    key={count}
                                    onClick={() => {
                                        setOptionCount(count);
                                        const newOpts = Array(count).fill(null).map((_, i) => pollOptions[i] || { text: '' });
                                        setPollOptions(newOpts);
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${optionCount === count
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                        }`}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        placeholder={`${idx + 1}. Seçenek`}
                                        value={opt.text}
                                        onChange={(e) => {
                                            const newOpts = [...pollOptions];
                                            newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                                            setPollOptions(newOpts);
                                        }}
                                        className="h-8 text-xs bg-muted/50 border-white/5"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            setActiveOptionIndex(idx);
                                            setIsSearchModalOpen(true);
                                        }}
                                        className="h-8 w-8 shrink-0 bg-background/50 border-white/10 hover:bg-primary/10 hover:text-primary transition-colors"
                                        title="Kitap Seç"
                                    >
                                        <Book size={14} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-2 items-center bg-muted/40 p-1.5 rounded-3xl border border-white/5 focus-within:border-primary/30 focus-within:bg-muted/50 transition-all shadow-lg">
                    <UserAvatar src={user?.photoURL} alt={user?.displayName || "User"} className="w-8 h-8 ml-1 border border-white/10" />
                    <div className="flex-1 min-w-0">
                        <Input
                            placeholder={isPoll ? "Anket sorusu..." : "Bir mesaj yaz..."}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            className="h-9 border-0 bg-transparent focus-visible:ring-0 px-2 text-sm placeholder:text-muted-foreground/50"
                        />
                    </div>
                    <div className="flex items-center gap-1 pr-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full transition-colors ${isPoll ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                            onClick={() => setIsPoll(!isPoll)}
                            title="Anket ekle"
                        >
                            <PollIcon size={16} />
                        </Button>
                        <Button onClick={() => handleSend()} size="icon" disabled={sending || !newMessage.trim()} className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shrink-0">
                            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </Button>
                    </div>
                </div>
            </div>

            <NovelSearchModal
                open={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelect={(novel) => {
                    if (activeOptionIndex !== null) {
                        const newOpts = [...pollOptions];
                        newOpts[activeOptionIndex] = {
                            ...newOpts[activeOptionIndex],
                            text: novel.title,
                            novelId: typeof novel.id === 'string' ? parseInt(novel.id, 10) : novel.id,
                            novelTitle: novel.title
                        };
                        setPollOptions(newOpts);
                    }
                    setIsSearchModalOpen(false);
                }}
            />
        </div>
    );
}
