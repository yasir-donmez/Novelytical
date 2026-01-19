'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import NotificationBell from "@/components/notifications/notification-bell";

import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";

export function SiteHeader() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [mobileMenuOpen]);

    return (
        <header
            className={cn(
                "fixed top-0 z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-300",
                isScrolled || mobileMenuOpen
                    ? "bg-background/80 backdrop-blur-md border-b border-border/40 supports-[backdrop-filter]:bg-background/60"
                    : "bg-transparent border-transparent"
            )}
            style={{ paddingRight: 'var(--removed-body-scroll-bar-size, 0px)' }}
        >
            <div className="container flex h-16 items-center justify-between px-4 sm:px-12 lg:px-16 xl:px-24">
                <div className="flex items-center gap-6 md:gap-8">
                    <Link href="/" className="flex items-center gap-1 group relative z-50" onClick={() => setMobileMenuOpen(false)}>
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
                    <nav className="hidden md:flex items-center gap-6">
                        <Link
                            href="/romanlar"
                            className="text-sm font-medium transition-colors hover:text-primary text-foreground/80 hover:bg-muted/50 px-3 py-2 rounded-md"
                        >
                            Romanlar
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden md:flex items-center gap-4">
                        <NotificationBell />
                        <UserNav />
                        <ThemeToggle />
                    </div>

                    {/* Mobile Actions (Visible on small screens) */}
                    <div className="flex md:hidden items-center gap-2">
                        <NotificationBell />
                        <UserNav />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="relative z-50"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Backdrop (Transparent) */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Compact Dropdown Menu */}
            <div
                className={cn(
                    "fixed top-[4.5rem] right-4 z-50 w-56 transform transition-all duration-200 ease-out origin-top-right md:hidden",
                    mobileMenuOpen
                        ? "scale-100 opacity-100 translate-y-0"
                        : "scale-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
            >
                <div className="bg-popover/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden">
                    <nav className="flex flex-col p-1.5">
                        <Link
                            href="/romanlar"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-sm font-medium transition-colors group"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span className="flex-1">Romanlar</span>
                            <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity text-primary" />
                        </Link>
                        <Link
                            href="/yazarlar"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-sm font-medium transition-colors group"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span className="flex-1">Yazarlar</span>
                            <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity text-primary" />
                        </Link>
                    </nav>

                    <div className="border-t border-border/50 p-1.5 bg-muted/20">
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <span className="text-xs font-medium text-muted-foreground">Tema</span>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </div>


        </header >
    );
}
