"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BookOpen, MessageSquare, Menu } from "lucide-react";
import { useState, useEffect } from "react";

interface CurvedBottomNavProps {
    onMenuClick?: () => void;
}

export function CurvedBottomNav({ onMenuClick }: CurvedBottomNavProps) {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(true);

    // Scroll detection for auto-hide (optional, can be disabled if we want it always fixed)
    useEffect(() => {
        let lastScrollY = window.scrollY;
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            // Simple logic: Show if scrolling up or at top
            if (currentScrollY < 10 || currentScrollY < lastScrollY - 5) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY + 5) {
                // setIsVisible(false); // Keeping it visible for "Native App" feel for now? 
                // User asked for "App-like", usually nav is persistent in apps. 
                // Let's keep it persistent unless space is super critical. 
                // But user previously liked the hiding. Let's keep hiding logic but maybe smoother.
                setIsVisible(false);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Active state helper
    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

    return (
        <div
            className={cn(
                "fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ease-in-out",
                !isVisible && "translate-y-full"
            )}
            style={{ filter: "drop-shadow(0 -4px 10px rgba(0,0,0,0.1))" }}
        >
            {/* 
                SVG Curve Background 
                We use an SVG to draw the exact shape of the bar with the cutout.
            */}
            <div className="relative h-20 w-full">
                <svg
                    className="absolute bottom-0 left-0 w-full h-full text-card fill-current"
                    viewBox="0 0 375 80"
                    preserveAspectRatio="none"
                >
                    {/* 
                        Path logic:
                        Start bottom left -> up to top left -> across to start of curve
                        -> curve down and up around the button
                        -> across to top right -> down to bottom right -> close
                    */}
                    <path d="M0,80 L0,20 L135,20 C145,20 150,20 155,25 Q187.5,65 220,25 C225,20 230,20 240,20 L375,20 L375,80 Z" />
                </svg>

                {/* Content Container */}
                <div className="absolute inset-x-0 bottom-0 h-[60px] flex items-end justify-between px-8 pb-3">

                    {/* Left Side: Novels & Community */}
                    <div className="flex gap-12 items-end">
                        <Link
                            href="/romanlar"
                            className={cn(
                                "flex flex-col items-center gap-1 transition-colors",
                                isActive("/romanlar") ? "text-primary" : "text-muted-foreground/60 hover:text-primary/80"
                            )}
                        >
                            <BookOpen className={cn("h-6 w-6", isActive("/romanlar") && "fill-current")} strokeWidth={2} />
                            <span className="text-[10px] font-medium">Romanlar</span>
                        </Link>
                    </div>

                    {/* Right Side: Community & Menu */}
                    <div className="flex gap-12 items-end">

                        <Link
                            href="/topluluk"
                            className={cn(
                                "flex flex-col items-center gap-1 transition-colors",
                                isActive("/topluluk") ? "text-primary" : "text-muted-foreground/60 hover:text-primary/80"
                            )}
                        >
                            <MessageSquare className={cn("h-6 w-6", isActive("/topluluk") && "fill-current")} strokeWidth={2} />
                            <span className="text-[10px] font-medium">Topluluk</span>
                        </Link>
                    </div>
                </div>

                {/* Floating Center Button (FAB) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[20%]">
                    <Link href="/">
                        <div className={cn(
                            "h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                            isActive("/") && pathname === "/"
                                ? "bg-primary text-primary-foreground shadow-primary/30 scale-110"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}>
                            <Home className={cn("h-7 w-7", isActive("/") && pathname === "/" && "fill-current")} strokeWidth={2.5} />
                        </div>
                    </Link>
                </div>
            </div>
            {/* Safe area filler for iPhone X+ */}
            <div className="h-[env(safe-area-inset-bottom)] bg-card w-full" />
        </div>
    );
}
