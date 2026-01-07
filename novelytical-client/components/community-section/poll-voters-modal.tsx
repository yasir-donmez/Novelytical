"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { getPollVoters, PollOption, VoteInfo } from "@/services/feed-service";
import { Loader2, Users } from "lucide-react";

interface PollVotersModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    pollOptions: PollOption[];
}

export function PollVotersModal({ isOpen, onClose, postId, pollOptions }: PollVotersModalProps) {
    const [voters, setVoters] = useState<VoteInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>(pollOptions[0]?.id.toString() || "0");

    useEffect(() => {
        if (isOpen) {
            fetchVoters();
        }
    }, [isOpen, postId]);

    const fetchVoters = async () => {
        setLoading(true);
        try {
            const data = await getPollVoters(postId);
            setVoters(data);
        } catch (error) {
            console.error("Failed to fetch voters", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const getVotersForOption = (optionId: number) => {
        return voters.filter(v => v.optionId === optionId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Oy Detayları
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/10">
                            <TabsList className="w-max h-auto bg-muted/50 p-1">
                                {pollOptions.map((opt, idx) => {
                                    const count = getVotersForOption(opt.id).length;
                                    return (
                                        <TabsTrigger
                                            key={opt.id}
                                            value={opt.id.toString()}
                                            className="px-3 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                                        >
                                            {idx + 1}. Seçenek ({count})
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </div>

                        {pollOptions.map((opt) => {
                            const optionVoters = getVotersForOption(opt.id);
                            return (
                                <TabsContent key={opt.id} value={opt.id.toString()} className="mt-0">
                                    <div className="mb-3 px-1">
                                        <h4 className="text-sm font-medium text-foreground/80 truncate">
                                            {opt.novelTitle || opt.text}
                                        </h4>
                                    </div>
                                    <ScrollArea className="h-[300px] w-full pr-4">
                                        {optionVoters.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground text-sm">
                                                Henüz bu seçeneğe oy veren yok.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {optionVoters.map((voter) => (
                                                    <div key={voter.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                        <Avatar className="h-8 w-8 border border-border/50">
                                                            <AvatarImage src={voter.userImage} />
                                                            <AvatarFallback>{voter.userName?.[0] || "?"}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {voter.userName || "Anonim"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
