"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

interface LibraryItem {
    userId: string;
    novelId: number;
    currentChapter: number;
    status: "reading" | "completed" | "dropped";
    photoURL?: string;
    displayName?: string;
}

interface ReadingJourneyProps {
    novelId: number;
    chapterCount?: number;
    className?: string;
    orientation?: "horizontal" | "vertical";
}

interface AnimationControls {
    torso: ReturnType<typeof useAnimation>;
    rightArmUpper: ReturnType<typeof useAnimation>;
    rightArmFore: ReturnType<typeof useAnimation>;
    leftArm: ReturnType<typeof useAnimation>;
    legs: ReturnType<typeof useAnimation>;
    head: ReturnType<typeof useAnimation>;
    bowStringUpper: ReturnType<typeof useAnimation>;
    bowStringLower: ReturnType<typeof useAnimation>;
}

// ====================================================================
// CUSTOM HOOKS
// ====================================================================

/**
 * Hook for fetching novel readers from Firestore
 */
function useNovelReaders(novelId: number) {
    const [readers, setReaders] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReaders = async () => {
            try {
                const librariesRef = collection(db, "libraries");
                const q = query(librariesRef, where("novelId", "==", novelId));
                const snapshot = await getDocs(q);

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

                setReaders(items);
            } catch (error) {
                console.error("Failed to fetch reading journey", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReaders();
    }, [novelId]);

    return { readers, loading };
}

/**
 * Hook for archer animation logic
 */
function useArcherAnimation() {
    const [isRevealed, setIsRevealed] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hasShot, setHasShot] = useState(false);

    const controls: AnimationControls = {
        torso: useAnimation(),
        rightArmUpper: useAnimation(),
        rightArmFore: useAnimation(),
        leftArm: useAnimation(),
        legs: useAnimation(),
        head: useAnimation(),
        bowStringUpper: useAnimation(),
        bowStringLower: useAnimation(),
    };

    // IDLE ANIMATION LOOP
    useEffect(() => {
        if (!isAnimating) {
            controls.torso.start({
                rotate: [0, 1, 0],
                y: [0, 1, 0],
                transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            });

            controls.leftArm.start({
                rotate: [0, -2, 0],
                transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            });

            controls.rightArmUpper.start({
                rotate: [0, 2, 0],
                transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            });

            controls.head.start({
                rotate: [0, -2, 0],
                y: [0, 1, 0],
                transition: {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.1,
                },
            });
        }
    }, [isAnimating, controls]);

    const handleTelAliClick = async () => {
        if (isRevealed || isAnimating) return;

        setIsAnimating(true);
        setHasShot(false);

        const drawDuration = 1.0;

        // PHASE 1: DRAW (Yayı Ger)
        await Promise.all([
            controls.torso.start({
                rotate: -5,
                x: -2,
                transition: { duration: drawDuration, ease: "easeInOut" },
            }),

            controls.head.start({
                rotate: 0,
                x: 2,
                transition: { duration: drawDuration },
            }),

            controls.leftArm.start({
                rotate: -45,
                x: 0,
                y: -5,
                transition: { duration: drawDuration, ease: "easeInOut" },
            }),

            controls.rightArmUpper.start({
                rotate: -150,
                x: -5,
                y: -5,
                transition: { duration: drawDuration, ease: "easeInOut" },
            }),

            controls.rightArmFore.start({
                rotate: -120,
                transition: { duration: drawDuration, ease: "easeInOut" },
            }),

            controls.legs.start({
                scaleY: 0.95,
                y: 3,
                transition: { duration: drawDuration },
            }),
        ]);

        // PHASE 2: AIM & HOLD (Nişan Al)
        await new Promise((r) => setTimeout(r, 400));

        // PHASE 3: RELEASE (Bırak)
        setHasShot(true);

        await Promise.all([
            controls.torso.start({
                rotate: 0,
                x: 2,
                transition: { duration: 0.2, type: "spring", stiffness: 200 },
            }),

            controls.rightArmUpper.start({
                rotate: -130,
                x: 5,
                transition: { duration: 0.15, ease: "easeOut" },
            }),

            controls.rightArmFore.start({
                rotate: -40,
                transition: { duration: 0.15, ease: "easeOut" },
            }),

            controls.leftArm.start({
                rotate: -40,
                y: 0,
                transition: { duration: 0.2, type: "spring" },
            }),
        ]);

        // PHASE 4: RELAX
        await new Promise((r) => setTimeout(r, 500));

        await Promise.all([
            controls.torso.start({
                rotate: 0,
                x: 0,
                transition: { duration: 1 },
            }),

            controls.leftArm.start({
                rotate: 0,
                y: 0,
                transition: { duration: 1 },
            }),

            controls.rightArmUpper.start({
                rotate: 0,
                x: 0,
                y: 0,
                transition: { duration: 1 },
            }),

            controls.rightArmFore.start({
                rotate: 0,
                transition: { duration: 1 },
            }),

            controls.legs.start({
                scaleY: 1,
                y: 0,
                transition: { duration: 1 },
            }),
        ]);

        setIsRevealed(true);
        setTimeout(() => setIsAnimating(false), 1500);
    };

    return {
        isRevealed,
        isAnimating,
        hasShot,
        controls,
        handleTelAliClick,
    };
}

/**
 * Generates stats from readers data
 */
function useReadingStats(
    readers: LibraryItem[],
    user: any,
    chapterCount?: number
) {
    const maxChapter = useMemo(() => {
        const readerMax = Math.max(0, ...readers.map((r) => r.currentChapter || 0));
        return Math.max(chapterCount || 0, readerMax, 100);
    }, [chapterCount, readers]);

    const myProgress = useMemo(() => {
        if (!user) return null;
        return readers.find((r) => r.userId === user.uid) || null;
    }, [readers, user]);

    const myPercent = useMemo(() => {
        if (!myProgress?.currentChapter) return 0;
        return Math.min(100, (myProgress.currentChapter / maxChapter) * 100);
    }, [myProgress, maxChapter]);

    const topReaders = useMemo(() => {
        return [...readers]
            .sort((a, b) => (b.currentChapter || 0) - (a.currentChapter || 0))
            .slice(0, 10);
    }, [readers]);

    return { maxChapter, myProgress, myPercent, topReaders };
}

// ====================================================================
// SUB-COMPONENTS
// ====================================================================

interface ArcherComponentProps {
    user: any;
    isRevealed: boolean;
    isAnimating: boolean;
    hasShot: boolean;
    controls: AnimationControls;
    onTelAliClick: () => void;
}

function ArcherComponent({
    user,
    isRevealed,
    isAnimating,
    hasShot,
    controls,
    onTelAliClick,
}: ArcherComponentProps) {
    return (
        <div className="absolute bottom-2 left-4 sm:left-[20%] z-30 scale-125 origin-bottom">
            <motion.div className="relative w-[120px] h-[150px]">
                <motion.svg
                    width="120"
                    height="150"
                    viewBox="0 0 120 200"
                    className="stroke-zinc-200 stroke-[3px] fill-none drop-shadow-xl overflow-visible absolute inset-0"
                    animate={controls.legs}
                >
                    {/* TORSO GROUP */}
                    <motion.g
                        animate={controls.torso}
                        style={{ originX: "60px", originY: "100px" }}
                    >
                        <line x1="60" y1="45" x2="60" y2="100" />

                        {/* USER HEAD */}
                        <foreignObject x="35" y="0" width="50" height="50">
                            <motion.div
                                animate={controls.head}
                                className="w-full h-full flex items-center justify-center"
                            >
                                <Avatar className="h-10 w-10 border-2 border-zinc-200 bg-zinc-900">
                                    <AvatarImage
                                        src={user?.photoURL || undefined}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="bg-purple-900 text-[8px] text-white">
                                        BEN
                                    </AvatarFallback>
                                </Avatar>
                            </motion.div>
                        </foreignObject>

                        {/* RIGHT ARM (Draw Hand) - KINEMATIC CHAIN */}
                        {/* Origin: Shoulder (60,50) */}
                        <motion.g
                            animate={controls.rightArmUpper}
                            style={{ originX: "60px", originY: "50px" }}
                        >
                            {/* Upper Arm Bone */}
                            <line x1="60" y1="50" x2="60" y2="90" className="stroke-zinc-400 stroke-[4px] rounded-full" />

                            {/* ELBOW JOINT (Nested Group) */}
                            {/* Origin: The end of the upper arm (60, 90) */}
                            <motion.g
                                animate={controls.rightArmFore}
                                style={{ originX: "60px", originY: "90px" }}
                            >
                                {/* Elbow visual */}
                                <circle cx="60" cy="90" r="3" className="fill-zinc-500" />

                                {/* Forearm Bone */}
                                <line x1="60" y1="90" x2="60" y2="125" className="stroke-zinc-400 stroke-[3px] rounded-full" />

                                {/* Hand Visual */}
                                <circle cx="60" cy="125" r="2.5" className="fill-zinc-500" />

                                {/* ARROW (Nocked) */}
                                <motion.line
                                    x1="60" y1="125" x2="0" y2="125"
                                    className="stroke-zinc-200 stroke-[2px]"
                                    initial={{ opacity: 0, pathLength: 0 }}
                                    animate={{
                                        opacity: isAnimating && !hasShot ? 1 : 0,
                                        pathLength: isAnimating && !hasShot ? 1 : 0,
                                    }}
                                    transition={{ duration: 0.3 }}
                                />
                            </motion.g>
                        </motion.g>

                        {/* LEFT ARM (Bow Hand) */}
                        <motion.g
                            animate={controls.leftArm}
                            style={{ originX: "60px", originY: "50px" }}
                        >
                            {/* Arm */}
                            <line x1="60" y1="50" x2="30" y2="80" className="stroke-zinc-400 stroke-[3px] rounded-full" />
                            <circle cx="30" cy="80" r="2.5" className="fill-zinc-500" />

                            {/* THE BOW */}
                            <g transform="translate(30, 80) rotate(45)">
                                <path
                                    d="M -10 -45 Q 25 0 -10 45"
                                    className="stroke-amber-700 stroke-[3px]"
                                    fill="none"
                                />
                                <line
                                    x1="-10"
                                    y1="-45"
                                    x2="-10"
                                    y2="45"
                                    className="stroke-zinc-600 stroke-[1px] opacity-50"
                                />
                            </g>
                        </motion.g>
                    </motion.g>

                    {/* LEGS */}
                    <g>
                        <line
                            x1="60"
                            y1="100"
                            x2="40"
                            y2="180"
                            className="stroke-zinc-400"
                        />
                        <line
                            x1="60"
                            y1="100"
                            x2="80"
                            y2="180"
                            className="stroke-zinc-400"
                        />
                    </g>
                </motion.svg>

                {/* BUTTON */}
                {!isRevealed && !isAnimating && (
                    <button
                        onClick={onTelAliClick}
                        aria-label="Nişan al ve okuyucuların ilerlemesini göster"
                        className="absolute inset-0 w-full h-full cursor-pointer z-50 flex items-center justify-center outline-none focus:outline-none pointer-events-auto"
                    >
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-2 py-1 rounded animate-bounce whitespace-nowrap font-bold shadow-lg border border-purple-400">
                            Nişan Al!
                        </span>
                    </button>
                )}
            </motion.div>
        </div>
    );
}

interface ArrowProjectileProps {
    startX: string;
    targetY: number;
}

function ArrowProjectile({ startX, targetY }: ArrowProjectileProps) {
    return (
        <motion.div
            initial={{ bottom: "120px", left: startX, rotate: 60, scale: 0.8, opacity: 0 }}
            animate={{
                bottom: `${Math.max(15, targetY)}%`,
                left: "50%",
                rotate: 135,
                opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 0.4, ease: "linear" }}
            className="absolute z-40 origin-bottom"
        >
            {/* Main Arrow Shaft */}
            <div className="w-0.5 h-16 bg-white shadow-[0_0_10px_white]" />
            {/* Fletching (Feathers) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-4 bg-purple-500/50 clip-arrow-feather" />
        </motion.div>
    );
}

interface LeaderboardProps {
    topReaders: LibraryItem[];
}

function Leaderboard({ topReaders }: LeaderboardProps) {
    return (
        <div className="w-64 bg-zinc-900/30 rounded-xl border border-white/5 p-4 backdrop-blur-sm h-fit">
            <h4 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Lider Tablosu
            </h4>
            <div className="space-y-3">
                {topReaders.map((reader, index) => {
                    let rankColor = "text-zinc-500";
                    let rankIcon: string | null = null;

                    if (index === 0) {
                        rankColor = "text-yellow-500";
                        rankIcon = "🥇";
                    } else if (index === 1) {
                        rankColor = "text-zinc-300";
                        rankIcon = "🥈";
                    } else if (index === 2) {
                        rankColor = "text-amber-700";
                        rankIcon = "🥉";
                    }

                    return (
                        <div
                            key={`${reader.userId}-${index}`}
                            className="flex items-center justify-between text-xs group"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span
                                    className={cn(
                                        "font-mono font-bold w-4 text-center",
                                        rankColor
                                    )}
                                >
                                    {rankIcon || index + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 border border-white/10">
                                        {reader.photoURL && (
                                            <AvatarImage src={reader.photoURL} />
                                        )}
                                        <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400">
                                            {reader.displayName?.slice(0, 1) || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span
                                        className={cn(
                                            "truncate max-w-[80px]",
                                            index < 3
                                                ? "text-white font-medium"
                                                : "text-zinc-400"
                                        )}
                                    >
                                        {reader.displayName || `Okuyucu ${index + 1}`}
                                    </span>
                                </div>
                            </div>
                            <div className="font-mono text-zinc-500 group-hover:text-purple-400 transition-colors">
                                {reader.currentChapter}
                            </div>
                        </div>
                    );
                })}

                {topReaders.length === 0 && (
                    <div className="text-zinc-600 text-center py-4 text-xs">
                        Henüz kimse zirveye ulaşmadı.
                    </div>
                )}
            </div>
        </div>
    );
}

interface UserAvatarTooltipProps {
    user: any;
    progress: LibraryItem;
    position?: "top" | "right";
}

function UserAvatarTooltip({
    user,
    progress,
    position = "top",
}: UserAvatarTooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip open={true}>
                <TooltipTrigger asChild>
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-75" />

                        <Avatar className="h-10 w-10 border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)]">
                            {user?.photoURL && (
                                <AvatarImage src={user.photoURL} />
                            )}
                            <AvatarFallback className="bg-purple-950 text-[10px] text-purple-200">
                                {user.displayName?.slice(0, 2) || "ME"}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </TooltipTrigger>
                <TooltipContent
                    side={position}
                    className="bg-zinc-900 border-purple-500/30 text-xs z-50"
                >
                    <span className="font-bold text-white">Sen Buradasın! </span>
                    <div className="text-zinc-400">
                        {progress.currentChapter}.  Bölüm
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
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
}: ReadingJourneyProps) {
    const { user } = useAuth();
    const { readers, loading } = useNovelReaders(novelId);
    const { myProgress, myPercent, topReaders } = useReadingStats(
        readers,
        user,
        chapterCount
    );
    const {
        isRevealed,
        isAnimating,
        hasShot,
        controls,
        handleTelAliClick,
    } = useArcherAnimation();

    if (loading) {
        return (
            <div className="w-full h-[600px] rounded-xl bg-zinc-900/50 animate-pulse border border-white/5" />
        );
    }

    if (readers.length === 0 && orientation === "horizontal") return null;
    if (orientation === "horizontal") return null;

    // VERTICAL LAYOUT ("TOWER")
    return (
        <section
            className={cn(
                "relative w-full flex flex-col items-center py-8 min-h-[600px] overflow-hidden sm:overflow-visible",
                className
            )}
        >
            {/* ARCHER TEL ALI */}
            <ArcherComponent
                user={user}
                isRevealed={isRevealed}
                isAnimating={isAnimating}
                hasShot={hasShot}
                controls={controls}
                onTelAliClick={handleTelAliClick}
            />

            {/* ARROW PROJECTILE */}
            <AnimatePresence>
                {isAnimating && hasShot && (
                    <ArrowProjectile startX="30%" targetY={myPercent} />
                )}
            </AnimatePresence>

            {/* GRID */}
            <div className="flex flex-col sm:grid sm:grid-cols-5 w-full max-w-5xl relative h-full flex-grow gap-4">
                <div className="hidden sm:block sm:col-span-2" />
                <div className="relative h-[600px] w-full sm:col-span-1 flex justify-center select-none py-12">
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-zinc-800/50 rounded-full h-full my-4 overflow-visible">
                        <div className="w-full bg-gradient-to-t from-purple-600 via-purple-400 to-purple-600 h-full opacity-30" />
                    </div>
                    {user && myProgress && isRevealed && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 15,
                            }}
                            className="absolute left-1/2 -translate-x-1/2 z-20"
                            style={{ bottom: `${myPercent}%`, marginBottom: "-20px" }}
                        >
                            <UserAvatarTooltip
                                user={user}
                                progress={myProgress}
                                position="top"
                            />
                            <div className="absolute inset-0 rounded-full border border-purple-500/50 animate-ping opacity-50" />
                        </motion.div>
                    )}
                </div>
                <div className="hidden sm:flex sm:col-span-2 justify-start pl-8 pt-8">
                    <Leaderboard topReaders={topReaders} />
                </div>
            </div>
        </section>
    );
}