"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";

interface LibraryItem {
    userId: string;
    novelId: number;
    currentChapter: number;
    status: "reading" | "completed" | "dropped";
    photoURL?: string;
    displayName?: string;
    selectedFrame?: string;
}

interface ReadingJourneyProps {
    novelId: number;
    chapterCount?: number;
    className?: string;
    orientation?: "horizontal" | "vertical";
    coverImage?: string;
}

// ====================================================================
// CUSTOM HOOKS
// ====================================================================

function useNovelReaders(novelId: number) {
    const [readers, setReaders] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const librariesRef = collection(db, "libraries");
        const q = query(librariesRef, where("novelId", "==", novelId));

        // REAL-TIME LISTENER
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const items = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    userId: data.userId,
                    novelId: data.novelId,
                    currentChapter: data.currentChapter || 0,
                    status: data.status || "reading",
                    photoURL: data.photoURL,
                    displayName: data.displayName,
                } as LibraryItem;
            });

            // Fetch selectedFrame for each user
            const itemsWithFrames = await Promise.all(
                items.map(async (item) => {
                    try {
                        const userDoc = await getDocs(
                            query(collection(db, "users"), where("uid", "==", item.userId))
                        );
                        if (!userDoc.empty) {
                            const userData = userDoc.docs[0].data();
                            item.selectedFrame = userData.selectedFrame || "default";
                        }
                    } catch (error) {
                        console.error(`Failed to fetch frame for user ${item.userId}`, error);
                    }
                    return item;
                })
            );

            setReaders(itemsWithFrames);
            setLoading(false);
        }, (error) => {
            console.error("Failed to subscribe to reading journey", error);
            setLoading(false);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, [novelId]);

    return { readers, loading };
}

// ====================================================================
// TOWER LOGIC & SUB-COMPONENTS
// ====================================================================

interface FloorData {
    id: number;
    label: string;
    rangeStart: number;
    rangeEnd: number;
    users: LibraryItem[];
    isActive: boolean;
    isMyFloor: boolean;
}

/**
 * Groups readers into 10 Tower Floors
 */
function useTowerFloors(readers: LibraryItem[], chapterCount: number = 100, currentUserId?: string) {
    return useMemo(() => {
        const floors: FloorData[] = [];
        const floorCount = 10;
        const chaptersPerFloor = Math.ceil(Math.max(chapterCount, 1) / floorCount);

        for (let i = 0; i < floorCount; i++) {
            const start = i * chaptersPerFloor;
            const end = (i + 1) * chaptersPerFloor;

            // Find users in this range
            // Floor 1 (i=0) includes chapter 0 to X
            const floorUsers = readers.filter(r =>
                r.currentChapter >= start && r.currentChapter < end
            );

            // Special case for the final floor to include the exact max chapter
            if (i === floorCount - 1) {
                const finalUsers = readers.filter(r => r.currentChapter >= end);
                floorUsers.push(...finalUsers);
            }

            // Sort users by chapter (Highest -> Lowest)
            floorUsers.sort((a, b) => b.currentChapter - a.currentChapter);

            const isMyFloor = floorUsers.some(u => u.userId === currentUserId);

            floors.push({
                id: i + 1,
                label: `${i + 1}. Mühür`,
                rangeStart: start,
                rangeEnd: end,
                users: floorUsers,
                isActive: floorUsers.length > 0,
                isMyFloor
            });
        }

        // Return reversed so floor 10 is at top, floor 1 at bottom
        return floors.reverse();
    }, [readers, chapterCount, currentUserId]);
}

interface TowerSealProps {
    floor: FloorData;
    currentUserId?: string;
    isCenter?: boolean;
}

function TowerSeal({ floor, currentUserId }: TowerSealProps) {
    const isFilled = floor.isActive;

    // Animation Variants for the Mechanical Shells
    const shellVariants = {
        closed: { y: 0 },
        openTop: { y: -8 }, // Move up
        openBottom: { y: 8 } // Move down
    };

    return (
        <div className="w-full h-full flex items-center justify-center relative">
            {/* VEIN BRANCH (The Connector) */}
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-1/2 h-1 -translate-x-1/2 z-0">
                {/* Empty Vein Path */}
                <div className="absolute inset-0 bg-stone-950/60 border-y border-amber-900/30 shadow-inner" />
                {/* Liquid Fill */}
                <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: isFilled ? "100%" : "0%" }}
                    transition={{ duration: 1, delay: floor.id * 0.05 }}
                    className={cn(
                        "absolute left-0 top-0 h-full bg-gradient-to-r from-fuchsia-800 via-purple-600 to-fuchsia-400 shadow-[0_0_8px_#d946ef]",
                        isFilled ? "opacity-100" : "opacity-0"
                    )}
                />
            </div>

            {/* THE MECHANICAL SEAL */}
            {!floor.isActive ? (
                // INACTIVE SEAL - Rusted/Locked Shutter
                <div className="relative z-10 w-10 h-10 rounded-full border border-amber-900/40 bg-stone-950 flex flex-col items-center justify-center overflow-hidden grayscale opacity-60 shadow-lg">
                    <div className="w-full h-1/2 bg-gradient-to-b from-stone-800 to-stone-900 border-b border-stone-950" />
                    <div className="w-full h-1/2 bg-gradient-to-t from-stone-800 to-stone-900 border-t border-stone-700/50" />
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_black]" />
                </div>
            ) : (
                // ACTIVE SEAL - Golden Mechanical "Pokeball"
                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <motion.div
                                className="relative z-10 w-12 h-12 cursor-pointer group flex items-center justify-center"
                                initial="closed"
                                whileHover="open"
                                animate="closed"
                            >
                                {/* 1. INNER CORE (The Pulse) - Revealed on Hover */}
                                <div className={cn(
                                    "absolute inset-1 rounded-full overflow-hidden flex items-center justify-center z-0",
                                    "bg-stone-950 border border-fuchsia-500/50 shadow-[0_0_15px_#d946ef]"
                                )}>
                                    {/* Liquid Background */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-900 via-purple-600 to-fuchsia-400 animate-pulse opacity-90" />

                                    {/* USER COUNT (Inside the Core) */}
                                    <span className={cn(
                                        "relative z-10 font-serif font-bold text-lg text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                                        "opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                    )}>
                                        {floor.users.length}
                                    </span>
                                </div>

                                {/* 2. OUTER SHELL - TOP (Mechanical Hemisphere) */}
                                <motion.div
                                    variants={{ closed: { y: 0 }, open: { y: -14 } }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="absolute top-0 left-0 right-0 h-1/2 z-10 overflow-hidden flex justify-center"
                                >
                                    <div className="w-full h-[200%] bg-gradient-to-b from-amber-400 via-amber-700 to-amber-950 rounded-t-full rounded-b-none border-t border-x border-amber-800/60 shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] flex items-end justify-center pb-[2px] relative">
                                        {/* Grunge Texture Overlay */}
                                        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] mix-blend-multiply pointer-events-none" />

                                        {/* Old Metal Highlight (Top Shine) */}
                                        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent" />

                                        {/* Mechanical Seam/Detail */}
                                        <div className="w-2/3 h-[2px] bg-black/60 rounded-full mb-0.5 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
                                    </div>

                                    {/* ENGRAVED NUMBER (TOP HALF) */}
                                    {/* Darkstone Etching style */}
                                    <span className={cn(
                                        "absolute bottom-0 translate-y-[37%] z-20 font-serif font-extrabold text-[16px] leading-none",
                                        "text-stone-950 mix-blend-multiply",
                                        "drop-shadow-[0_1px_0_rgba(180,100,50,0.3)]" // Faint rust/gold highlight
                                    )}>
                                        {floor.id}
                                    </span>
                                </motion.div>

                                {/* 3. OUTER SHELL - BOTTOM (Mechanical Hemisphere) */}
                                <motion.div
                                    variants={{ closed: { y: 0 }, open: { y: 14 } }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="absolute bottom-0 left-0 right-0 h-1/2 z-10 overflow-hidden flex justify-center"
                                >
                                    <div className="absolute bottom-0 w-full h-[200%] bg-gradient-to-t from-amber-500 via-amber-800 to-amber-950 rounded-b-full rounded-t-none border-b border-x border-amber-800/60 shadow-[inset_0_-5px_15px_rgba(0,0,0,0.8)] flex items-start justify-center pt-[2px]">
                                        {/* Grunge Texture Overlay */}
                                        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] mix-blend-multiply pointer-events-none" />

                                        {/* Old Metal Highlight (Bottom Shine) */}
                                        <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent" />

                                        {/* Mechanical Seam/Detail */}
                                        <div className="w-1/2 h-[2px] bg-black/60 rounded-full shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
                                    </div>

                                    {/* ENGRAVED NUMBER (BOTTOM HALF) */}
                                    <span className={cn(
                                        "absolute top-0 -translate-y-[63%] z-20 font-serif font-extrabold text-[16px] leading-none",
                                        "text-stone-950 mix-blend-multiply",
                                        "drop-shadow-[0_1px_0_rgba(180,100,50,0.3)]"
                                    )}>
                                        {floor.id}
                                    </span>
                                </motion.div>

                                {/* 4. CENTER GLOW (Pulse when closed) */}
                                <div className="absolute inset-0 z-20 pointer-events-none mix-blend-screen group-hover:opacity-0 transition-opacity duration-300">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-fuchsia-400 blur-sm animate-pulse" />
                                </div>

                            </motion.div>
                        </TooltipTrigger>
                        {/* Tooltip Content remains largely same */}
                        <TooltipContent side="right" sideOffset={20} className="bg-stone-950/95 border border-amber-600/40 p-0 rounded-xl shadow-2xl backdrop-blur-md min-w-[220px] overflow-hidden">
                            {/* ... Header ... */}
                            <div className="bg-gradient-to-r from-amber-950/80 to-stone-900/80 border-b border-amber-500/10 p-3 relative overflow-hidden">
                                <h4 className="font-serif font-bold text-amber-400 flex items-center gap-2 relative z-10 text-sm drop-shadow-md">
                                    <Users size={14} className="text-amber-600" />
                                    {floor.label}
                                </h4>
                                <span className="text-[10px] text-amber-700 font-mono relative z-10 block mt-1">
                                    Seviye {floor.rangeStart} - {floor.rangeEnd}
                                </span>
                            </div>
                            {/* ... Users list ... */}
                            <div className="p-2 space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar">
                                {floor.users.map((user, idx) => (
                                    <div key={user.userId} className={cn(
                                        "flex items-center gap-3 text-xs p-2 rounded border border-transparent transition-colors",
                                        user.userId === currentUserId
                                            ? "bg-amber-900/20 border-amber-500/20"
                                            : "hover:bg-white/5"
                                    )}>
                                        {/* Rank Badge (Framed) */}
                                        <div className="w-5 h-5 rounded-full bg-stone-900 border border-amber-800/60 flex items-center justify-center shadow-sm">
                                            <span className="font-mono text-[9px] text-amber-600 font-bold">{idx + 1}</span>
                                        </div>

                                        {/* User Avatar with Frame */}
                                        <div className="p-1">
                                            <UserAvatar
                                                src={user.photoURL}
                                                alt={user.displayName || "User"}
                                                frameId={user.selectedFrame}
                                                size="sm"
                                            />
                                        </div>

                                        <span className={cn(
                                            "truncate flex-1 font-serif",
                                            user.userId === currentUserId ? "text-amber-200 font-bold" : "text-stone-400"
                                        )}>
                                            {user.displayName || "Maceracı"}
                                        </span>
                                        <span className="text-[9px] text-amber-600 font-bold ml-auto font-mono">
                                            Lv.{user.currentChapter}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}

// ====================================================================
// SUB-COMPONENTS (Filter & Leaderboard)
// ====================================================================

interface FilterPanelProps {
    filter: "everyone" | "friends";
    setFilter: (filter: "everyone" | "friends") => void;
}

function FilterPanel({ filter, setFilter }: FilterPanelProps) {
    return (
        <div className="flex flex-col gap-4 relative mt-4 group">
            {/* The PIN (Static Wall Anchor) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-600 border border-black shadow-[0_2px_4px_black]" />
                <div className="w-16 h-8 bg-black/40 blur-md -mt-2 -z-10 rounded-full" />
            </div>

            <motion.div
                style={{ transformOrigin: "50% -12px" }}
                animate={{ rotate: 0 }} // Resting state
                whileHover={{
                    rotate: [0, 1.5, -1.5, 0.7, -0.7, 0],
                    transition: { duration: 0.6, ease: "easeInOut" }
                }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }} // Return spring
                className="relative"
            >
                {/* Stone Plate Background */}
                <div className="absolute inset-0 bg-stone-900 rounded-lg border-[3px] border-amber-700/60 shadow-2xl" />

                <div className="relative z-10 bg-stone-900/95 backdrop-blur-sm p-4 rounded-lg border border-white/5 space-y-3">
                    <h4 className="text-amber-500 font-serif text-xs font-bold uppercase tracking-widest mb-2 border-b border-amber-700/30 pb-2 text-center">
                        Görünüm Modu
                    </h4>

                    <button
                        onClick={() => setFilter("friends")}
                        className={cn(
                            "w-full text-left px-3 py-2 rounded text-xs font-bold transition-all border",
                            filter === "friends"
                                ? "bg-amber-900/40 border-amber-600 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                : "bg-transparent border-transparent text-stone-500 hover:bg-stone-800 hover:text-stone-300"
                        )}
                    >
                        ⚔️  Sadece Dostlar
                    </button>

                    <button
                        onClick={() => setFilter("everyone")}
                        className={cn(
                            "w-full text-left px-3 py-2 rounded text-xs font-bold transition-all border",
                            filter === "everyone"
                                ? "bg-purple-900/40 border-purple-600 text-purple-400 shadow-[0_0_10px_rgba(192,38,211,0.2)]"
                                : "bg-transparent border-transparent text-stone-500 hover:bg-stone-800 hover:text-stone-300"
                        )}
                    >
                        🌍  Herkes
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

interface LeaderboardProps {
    topReaders: LibraryItem[];
    currentUserId?: string;
}

function Leaderboard({ topReaders, currentUserId }: LeaderboardProps) {
    return (
        <div className="w-72 relative group mt-4"> {/* Added mt-4 to give space for the pin/swing */}

            {/* The PIN (Static Wall Anchor) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                {/* The Nail Head */}
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-600 border border-black shadow-[0_2px_4px_black]" />
                {/* Shadow of the board hanging */}
                <div className="w-20 h-12 bg-black/50 blur-xl -mt-2 -z-10 rounded-full" />
            </div>

            {/* SWINGING BOARD CONTAINER */}
            <motion.div
                style={{ transformOrigin: "50% -12px" }} // Swing from the pin location
                animate={{ rotate: 0 }} // Resting state
                whileHover={{
                    rotate: [0, 2, -2, 1, -1, 0],
                    transition: { duration: 0.6, ease: "easeInOut" }
                }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }} // Return spring physics
                className="relative"
            >
                {/* Parchment/Stone Board Background */}
                <div className="absolute inset-0 bg-stone-900 rounded-lg border-[3px] border-amber-700/60 shadow-2xl" />

                <div className="relative bg-stone-900/95 backdrop-blur-sm p-4 rounded-lg border border-white/5 z-10 min-h-[450px] max-h-[600px] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 border-b border-amber-700/30 pb-2 flex-shrink-0">
                        <h4 className="text-amber-500 font-serif tracking-wider font-bold text-sm flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            Lider Tablosu
                        </h4>
                        <div className="bg-amber-900/30 text-amber-500 text-[10px] px-2 py-0.5 rounded border border-amber-800/50">
                            Top 10
                        </div>
                    </div>

                    <div className="space-y-1.5 overflow-y-auto flex-grow pr-1 custom-scrollbar px-2">
                        {topReaders.map((reader, index) => {
                            const isCurrentUser = reader.userId === currentUserId;
                            let rowBg = "hover:bg-amber-900/10";

                            if (isCurrentUser) {
                                rowBg = "bg-amber-950/40 border-amber-500/30 ring-1 ring-amber-500/20";
                            }

                            return (
                                <div
                                    key={`${reader.userId}-${index}`}
                                    className={cn(
                                        "flex items-center justify-between text-xs p-2 rounded-lg border transition-all group/item",
                                        isCurrentUser ? "border-amber-500/30" : "border-transparent",
                                        rowBg
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Rank Badge */}
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center border shadow-sm flex-shrink-0",
                                            index === 0 ? "bg-amber-500/20 border-amber-500/50 text-amber-400" :
                                                index === 1 ? "bg-stone-500/20 border-stone-400/50 text-stone-300" :
                                                    index === 2 ? "bg-orange-800/20 border-orange-700/50 text-orange-500" :
                                                        "bg-stone-900 border-amber-900/30 text-stone-500"
                                        )}>
                                            <span className="font-mono text-[10px] font-bold">{index + 1}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* User Avatar with Frame */}
                                            <div className="p-0.5">
                                                <UserAvatar
                                                    src={reader.photoURL}
                                                    alt={reader.displayName || "User"}
                                                    frameId={reader.selectedFrame}
                                                    size="sm"
                                                />
                                            </div>
                                            <span
                                                className={cn(
                                                    "truncate font-serif tracking-wide max-w-[100px]",
                                                    isCurrentUser ? "text-amber-100 font-bold" :
                                                        index < 3 ? "text-amber-100/90 font-medium" : "text-stone-400"
                                                )}
                                            >
                                                {reader.displayName || `Maceracı ${index + 1}`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="font-mono text-amber-600/80 font-bold text-[10px] flex-shrink-0 ml-2 group-hover/item:text-amber-400 transition-colors">
                                        Lv.{reader.currentChapter}
                                    </div>
                                </div>
                            );
                        })}

                        {topReaders.length === 0 && (
                            <div className="text-stone-600 text-center py-6 text-xs italic font-serif mt-10">
                                Lonca Salonu bomboş...
                            </div>
                        )}
                    </div>
                </div>
            </motion.div >
        </div >
    );
}

// ====================================================================
// MAIN COMPONENT
// ====================================================================

export function ReadingJourney({
    novelId,
    chapterCount,
    className,
    orientation = "vertical",
    coverImage,
}: ReadingJourneyProps) {
    const { user } = useAuth();
    const [filter, setFilter] = useState<"everyone" | "friends">("everyone");
    const { readers, loading } = useNovelReaders(novelId);

    // Calculate max chapter for percentage
    const maxChapter = useMemo(() => {
        const readerMax = Math.max(0, ...readers.map((r) => r.currentChapter || 0));
        return Math.max(chapterCount || 0, readerMax, 100);
    }, [chapterCount, readers]);

    const topReaders = useMemo(() => {
        return [...readers]
            .sort((a, b) => (b.currentChapter || 0) - (a.currentChapter || 0))
            .slice(0, 10);
    }, [readers]);

    // Calculate My Percent separate for the Mana Bar fill (keep this for personal visual)
    const myPercent = useMemo(() => {
        const myProgress = readers.find((r) => r.userId === user?.uid);
        if (!myProgress?.currentChapter) return 0;
        return Math.min(100, (myProgress.currentChapter / maxChapter) * 100);
    }, [readers, user, maxChapter]);

    // TOWER FLOORS LOGIC
    const floors = useTowerFloors(readers, maxChapter, user?.uid);

    if (loading) {
        return (
            <div className="w-full h-[600px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (readers.length === 0 && orientation === "horizontal") return null;
    if (orientation === "horizontal") return null;

    // ISEKAI TOWER THEME - PURPLE EDITION WITH FROSTED GLASS BACKGROUND
    return (
        <section
            className={cn(
                "relative w-full flex flex-col items-center justify-center py-16 min-h-[750px] overflow-hidden sm:overflow-visible",
                className
            )}
        >
            {/* AMBIENT BACKGROUND EFFECTS */}


            <div className="relative z-10 flex w-full max-w-6xl items-end justify-center gap-8 sm:gap-24 px-4">

                {/* LEFT: FILTER OPTIONS */}
                <div className="hidden sm:block pb-32 w-48 order-1">
                    <FilterPanel filter={filter} setFilter={setFilter} />
                </div>

                {/* CENTER: THE TOWER OF ASCENSION - SEAL SYSTEM */}
                <div className="relative h-[660px] w-48 flex justify-center items-end flex-shrink-0 order-2">

                    {/* Tower Base (Ancient Pedestal) - MAJESTIC & GRAND */}
                    <div className="absolute bottom-[-20px] w-96 h-32 pointer-events-none z-0 flex justify-center items-end">
                        {/* Ground Energy Fissure */}
                        <div className="absolute bottom-4 w-80 h-10 bg-amber-600/20 blur-xl rounded-[100%]" />

                        {/* Bottom Platform (Foundation) */}
                        <div className="absolute bottom-0 w-72 h-10 bg-gradient-to-r from-amber-950 via-stone-950 to-amber-950 rounded-[100%] border border-amber-900/40 shadow-2xl" />

                        {/* Middle Step */}
                        <div className="absolute bottom-5 w-56 h-8 bg-gradient-to-r from-amber-900 via-stone-900 to-amber-900 rounded-[100%] border border-amber-800/50 shadow-xl" />

                        {/* Top Step (Tower Mount) */}
                        <div className="absolute bottom-9 w-40 h-6 bg-gradient-to-r from-yellow-900 via-amber-800 to-yellow-900 rounded-[100%] border border-amber-600/50 flex items-center justify-center">
                            <div className="w-32 h-4 bg-black/30 rounded-[100%] blur-sm" />
                        </div>
                    </div>

                    {/* The Monolith (Structure) - ANCIENT GOLD METALLIC */}
                    <div className={cn(
                        "relative w-24 h-full rounded-t-lg flex flex-col pt-4 pb-8 z-10 mb-8 overflow-hidden",
                        // MATERIAL: Brushed Gold Gradient
                        "bg-gradient-to-b from-amber-700 via-yellow-800 to-amber-950",
                        // BEVEL: Light Top, Dark Sides, Inner Shadow
                        "border-t-2 border-x border-amber-500/20 border-b-0",
                        "shadow-[inset_0_0_40px_rgba(0,0,0,0.7),_0_0_50px_rgba(0,0,0,0.8)]"
                    )}>
                        {/* Shadow Gradient at Base Contact Point (Inside Monolith) */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black via-black/50 to-transparent z-10 opacity-80" />

                        {/* Bevel Highlight (Left Edge) */}
                        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-yellow-300/40 to-transparent z-20" />
                        {/* Bevel Shadow (Right Edge) */}
                        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-black/40 z-20" />

                        {/* Grunge Texture Overlay */}
                        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] mix-blend-multiply pointer-events-none" />

                        {/* CENTRAL ARTERY (Deep Groove) */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 top-0 w-3 bg-black/50 border-x border-black/80 z-0 shadow-[inset_0_0_5px_black]">
                            {/* Liquid Fill */}
                            <motion.div
                                initial={{ height: "0%" }}
                                animate={{ height: `${myPercent}%` }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="absolute bottom-0 w-full bg-gradient-to-t from-fuchsia-900 via-purple-600 to-fuchsia-500 shadow-[0_0_15px_#d946ef] animate-pulse"
                            />
                        </div>

                        {/* TOWER FLOORS / SEALS CONTAINER */}
                        <div className="relative w-full h-full flex flex-col justify-between items-center z-20 px-1 py-3">
                            {floors.map((floor) => (
                                <motion.div
                                    key={floor.id}
                                    className="w-full h-full flex items-center justify-center p-1"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: floor.id * 0.1 }}
                                >
                                    <TowerSeal floor={floor} currentUserId={user?.uid} />
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* MOUNTING SOCKET (The Connector) - Hides the seam */}
                    <div className="absolute bottom-6 w-36 h-12 pointer-events-none z-20 flex justify-center items-end">
                        {/* Front Metal Lip */}
                        <div className="absolute bottom-0 w-28 h-8 rounded-[100%] border-t-[3px] border-amber-500/40 bg-gradient-to-b from-amber-900/90 to-black shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-20" />

                        {/* Side Grips/Claws (Visual) */}
                        <div className="absolute bottom-2 w-32 h-6 flex justify-between">
                            <div className="w-4 h-full bg-gradient-to-r from-amber-800 to-transparent skew-x-12 opacity-80" />
                            <div className="w-4 h-full bg-gradient-to-l from-amber-800 to-transparent -skew-x-12 opacity-80" />
                        </div>
                    </div>

                </div>

                {/* RIGHT: GUILD BOARD (Leaderboard) */}
                <div className="hidden sm:block pb-32 order-3">
                    <Leaderboard topReaders={topReaders} currentUserId={user?.uid} />
                </div>

                {/* MOBILE FALLBACK */}
                <div className="sm:hidden absolute top-0 left-4 z-50">
                    <Leaderboard topReaders={topReaders} currentUserId={user?.uid} />
                </div>
            </div>
        </section>
    );
}