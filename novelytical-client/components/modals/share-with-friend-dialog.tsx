'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/ui/user-avatar';
import { FollowService } from '@/services/follow-service';
import { ChatService } from '@/services/chat-service';
import { useAuth } from '@/contexts/auth-context';
import { UserProfile } from '@/services/user-service';
import { Search, Send, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareWithFriendDialogProps {
    novelId: number;
    novelSlug: string;
    novelTitle: string;
    novelCover: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ShareWithFriendDialog({
    novelId,
    novelSlug,
    novelTitle,
    novelCover,
    isOpen,
    onClose
}: ShareWithFriendDialogProps) {
    const { user } = useAuth();
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [filteredFriends, setFilteredFriends] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingTo, setSendingTo] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen && user) {
            fetchMutualFriends();
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredFriends(friends);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            setFilteredFriends(friends.filter(f =>
                f.username.toLowerCase().includes(lowerQuery) ||
                (f.displayName && f.displayName.toLowerCase().includes(lowerQuery))
            ));
        }
    }, [searchQuery, friends]);

    const fetchMutualFriends = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch both lists to find mutuals
            const [following, followers] = await Promise.all([
                FollowService.getFollowing(user.uid),
                FollowService.getFollowers(user.uid)
            ]);

            // Create a set of follower IDs for O(1) lookup
            const followerIds = new Set(followers.map(f => f.uid));

            // Filter following list to keep only those who are also in follower list
            const mutuals = following.filter(f => followerIds.has(f.uid));

            setFriends(mutuals);
            setFilteredFriends(mutuals);
        } catch (error) {
            console.error("Error fetching friends:", error);
            toast.error("Hata", {
                description: "Arkadaş listesi yüklenirken bir sorun oluştu."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (friendId: string) => {
        if (!user) return;
        setSendingTo(friendId);

        try {
            const chatId = await ChatService.getOrCreateChat(user.uid, friendId);

            // Format the message
            // You might want to adjust this format based on how ChatMessage handles links or embeds
            const messageContent = `📚 Bu romana bir göz at: ${novelTitle}\n/romanlar/${novelSlug}`;

            await ChatService.sendMessage(chatId, user.uid, messageContent, friendId);

            setSentTo(prev => new Set(prev).add(friendId));
            toast.success("Gönderildi", {
                description: "Roman arkadaşınla paylaşıldı."
            });
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Hata", {
                description: "Mesaj gönderilemedi."
            });
        } finally {
            setSendingTo(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden bg-zinc-950 border-zinc-800">
                <DialogHeader className="p-4 border-b border-zinc-800">
                    <DialogTitle>Arkadaşına Gönder</DialogTitle>
                    <DialogDescription>
                        Bu romanı karşılıklı takipleştiğin arkadaşlarınla paylaş.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Arkadaş ara..."
                            className="pl-9 bg-zinc-950/50 border-zinc-800"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="h-[300px] p-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            Yükleniyor...
                        </div>
                    ) : filteredFriends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <div className="text-sm">
                                {searchQuery ? "Sonuç bulunamadı." : "Henüz karşılıklı takipleştiğin arkadaşın yok."}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredFriends.map((friend) => {
                                const isSent = sentTo.has(friend.uid);
                                const isSending = sendingTo === friend.uid;

                                return (
                                    <div
                                        key={friend.uid}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserAvatar
                                                src={friend.photoURL}
                                                alt={friend.username}
                                                frameId={friend.frame}
                                                className="h-10 w-10"
                                            />
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-medium text-sm truncate max-w-[150px]">
                                                    {friend.displayName || friend.username}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                    @{friend.username}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant={isSent ? "ghost" : "secondary"}
                                            className={`h-8 w-8 p-0 rounded-full ${isSent ? "text-green-500 hover:text-green-600 cursor-default" : ""}`}
                                            onClick={() => !isSent && handleSend(friend.uid)}
                                            disabled={isSending || isSent}
                                        >
                                            {isSending ? (
                                                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            ) : isSent ? (
                                                <Check size={16} />
                                            ) : (
                                                <Send size={14} />
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
