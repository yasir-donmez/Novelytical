"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, User } from "lucide-react";

interface LibraryItem {
    userId: string;
    novelId: number;
    currentChapter?: number;
    status: string;
}

interface ProgressBucket {
    bucketIndex: number;
    range: string;
    userCount: number;
    isUserHere: boolean;
}

interface StoryTowerProps {
    novelId: number;
    className?: string;
}

export function StoryTower({ novelId, className }: StoryTowerProps) {
    const { user } = useAuth();
    const [buckets, setBuckets] = useState<ProgressBucket[]>([]);
    const [loading, setLoading] = useState(true);
    const [maxCount, setMaxCount] = useState(0);

    useEffect(() => {
        const fetchDistribution = async () => {
            try {
                // Fetch directly from Firestore (since Library data is there, not in SQL)
                const librariesRef = collection(db, "libraries");
                const q = query(librariesRef, where("novelId", "==", novelId));
                const snapshot = await getDocs(q);

                // Client-side aggregation (temporary solution until Cloud Functions)
                const items = snapshot.docs.map(doc => doc.data() as LibraryItem);

                // Determine total chapters (max seen or from props if we had them)
                const maxChapters = Math.max(100, ...items.map(i => i.currentChapter || 0));

                // Create buckets
                const bucketCount = 10;
                const bucketSize = Math.ceil(maxChapters / bucketCount);
                const newBuckets: ProgressBucket[] = [];

                for (let i = 0; i < bucketCount; i++) {
                    const start = i * bucketSize; // 0-based for chapters usually starts at 1 but 0 cover intro
                    const end = (i + 1) * bucketSize;

                    // Count users in this range
                    const count = items.filter(u => {
                        const chap = u.currentChapter || 0;
                        return chap >= start && chap < end;
                    }).length;

                    const isUserHere = user ? items.some(u => u.userId === user.uid && (u.currentChapter || 0) >= start && (u.currentChapter || 0) < end) : false;

                    newBuckets.push({
                        bucketIndex: i + 1,
                        range: `${start}-${end}`,
                        userCount: count,
                        isUserHere: isUserHere
                    });
                }

                setBuckets(newBuckets);
                if (newBuckets.length > 0) {
                    setMaxCount(Math.max(...newBuckets.map(b => b.userCount)));
                }
            } catch (error) {
                console.error("Failed to fetch story tower data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDistribution();
    }, [novelId, user]);

    if (loading) return <div className="h-64 w-12 animate-pulse bg-zinc-800/50 rounded-full" />;
    if (buckets.length === 0) return null;

    // Reverse buckets to show "Tower" (Bottom = Start, Top = End)
    // Actually, traditionally a tower is climbed. So Bucket 1 (Chapters 1-100) should be at BOTTOM.
    const towerLevels = [...buckets].reverse();

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <div className="flex flex-col w-12 bg-zinc-900/50 backdrop-blur-sm rounded-full p-1 border border-white/5 relative">
                {/* Decorative Turret Top */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-purple-900/40 rounded-t-lg border-t border-l border-r border-purple-500/30" />

                <TooltipProvider delayDuration={0}>
                    <div className="flex flex-col gap-[2px] w-full">
                        {towerLevels.map((level) => {
                            // Calculate opacity/intensity based on user count
                            // Min opacity 0.2, Max 1.0 (if count > 0)
                            const intensity = maxCount > 0 ? (level.userCount / maxCount) : 0;
                            const isHot = intensity > 0.7;

                            return (
                                <Tooltip key={level.bucketIndex}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "w-full h-8 rounded-sm transition-all duration-300 relative group cursor-pointer",
                                                level.isUserHere ? "ring-2 ring-yellow-400 z-10" : ""
                                            )}
                                            style={{
                                                backgroundColor: `rgba(147, 51, 234, ${0.1 + (intensity * 0.7)})`, // Purple base
                                                boxShadow: isHot ? `0 0 ${intensity * 10}px rgba(168, 85, 247, 0.4)` : 'none'
                                            }}
                                        >
                                            {/* Floor Line */}
                                            <div className="absolute bottom-0 w-full h-[1px] bg-white/5" />

                                            {/* User Indicator (Dot) */}
                                            {level.isUserHere && (
                                                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2">
                                                    <div className="relative">
                                                        <User size={14} className="text-yellow-400 fill-yellow-400/20 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                                        <div className="absolute -right-1 -top-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Crowd Indicator (If heavy) */}
                                            {isHot && !level.isUserHere && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Users size={10} className="text-white/80" />
                                                </div>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-zinc-950 border-white/10 text-xs">
                                        <div className="font-bold text-white mb-0.5">Kat {level.bucketIndex}</div>
                                        <div className="text-zinc-400">Bölümler: <span className="text-zinc-200">{level.range}</span></div>
                                        <div className="text-zinc-400">Okuyucu: <span className="text-purple-400 font-bold">{level.userCount}</span></div>
                                        {level.isUserHere && <div className="text-yellow-400 font-bold mt-1 text-[10px] uppercase tracking-wide">Buradasınız!</div>}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                </TooltipProvider>

                {/* Decorative Base */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-zinc-800 rounded-b-lg border border-white/5" />
            </div>

            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">Kule</span>
        </div>
    );
}
