'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import NotificationBell from "@/components/notifications/notification-bell";

export function SiteHeader() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-300",
                isScrolled
                    ? "bg-background/60 backdrop-blur-md border-b supports-[backdrop-filter]:bg-background/60"
                    : "bg-transparent border-transparent"
            )}
            style={{ paddingRight: 'var(--removed-body-scroll-bar-size, 0px)' }}
        >
            <div className="container flex h-16 items-center justify-between px-4 sm:px-12 lg:px-16 xl:px-24">
                <div className="flex items-center gap-6 md:gap-8">
                    <Link href="/" className="flex items-center gap-1 group">
                        <img
                            src="/logo.png"
                            alt="N"
                            width={40}
                            height={40}
                            className="transition-transform group-hover:scale-110 duration-300"
                        />
                        <span className="font-bold text-xl group-hover:text-primary transition-colors">
                            ovelytical
                        </span>
                    </Link>
                    <nav className="flex items-center gap-6">
                        <Link
                            href="/romanlar"
                            className="text-sm font-medium transition-colors hover:text-primary text-foreground/80 hover:bg-muted/50 px-3 py-2 rounded-md"
                        >
                            Romanlar
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <UserNav />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
