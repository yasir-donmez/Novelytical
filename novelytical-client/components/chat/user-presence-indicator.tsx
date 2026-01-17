"use client";

import { useEffect, useState } from "react";
import { PresenceService, UserPresence } from "@/services/presence-service";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserPresenceIndicatorProps {
    userId: string;
    showOnlineStatus?: boolean; // From privacy settings
    className?: string;
}

export function UserPresenceIndicator({ userId, showOnlineStatus = true, className }: UserPresenceIndicatorProps) {
    const [presence, setPresence] = useState<UserPresence | null>(null);

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = PresenceService.subscribeToPresence(userId, (data) => {
            setPresence(data);
        });
        return () => unsubscribe();
    }, [userId]);

    // If user hides status or has no status data -> Offline/Gray
    const isOnline = showOnlineStatus && presence?.state === 'online';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "h-3 w-3 rounded-full border-2 border-background absolute bottom-0 right-0",
                        isOnline ? "bg-green-500" : "bg-zinc-500",
                        className
                    )} />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isOnline ? "Çevrimiçi" : "Çevrimdışı"}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
