'use client';

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";
import { CurvedBottomNav } from "@/components/layout/curved-bottom-nav";
import NotificationBell from "@/components/notifications/notification-bell";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";


import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/features/novel/search-bar";

export function SiteHeader() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [passedHero, setPassedHero] = useState(false);
    const pathname = usePathname();

    // Determine if we are on a discovery page (Home or Romanlar) where the Hero search bar exists
    const isDiscoveryPage = pathname === "/" || pathname === "/romanlar";
    const showNavbarSearch = !isDiscoveryPage || passedHero;

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsScrolled(scrollY > 10);

            // Logic for showing search bar on homepage/romanlar after scrolling past hero
            // Hero is 85vh, we show navbar search after ~60vh to transition in
            if (typeof window !== 'undefined') {
                const heroThreshold = window.innerHeight * 0.6;
                setPassedHero(scrollY > heroThreshold);
            }
        };

        // Check immediately on mount
        handleScroll();

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
        <>
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
                    <div className="flex items-center gap-6 md:gap-8 flex-1">
                        <div className="flex items-center gap-6 md:gap-8 shrink-0">
                            <Link href="/" className="flex items-center gap-1 group relative z-50" onClick={() => setMobileMenuOpen(false)}>
                                <Image
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
                                    href="/"
                                    className="text-sm font-medium transition-colors hover:text-primary text-foreground/80 hover:bg-muted/50 px-3 py-2 rounded-md"
                                >
                                    Ana Sayfa
                                </Link>
                                <Link
                                    href="/romanlar"
                                    className="text-sm font-medium transition-colors hover:text-primary text-foreground/80 hover:bg-muted/50 px-3 py-2 rounded-md"
                                >
                                    Romanlar
                                </Link>
                                <Link
                                    href="/yazarlar"
                                    className="text-sm font-medium transition-colors hover:text-primary text-foreground/80 hover:bg-muted/50 px-3 py-2 rounded-md"
                                >
                                    Yazarlar
                                </Link>
                                <Link
                                    href="/topluluk"
                                    className="text-sm font-medium transition-colors hover:text-primary text-foreground/80 hover:bg-muted/50 px-3 py-2 rounded-md"
                                >
                                    Topluluk
                                </Link>
                            </nav>
                        </div>


                        {/* Navbar Search Bar - Centered/Aligned */}
                        {showNavbarSearch && (
                            <div className="hidden lg:block flex-1 max-w-md mx-6 animate-in fade-in zoom-in-95 duration-300">
                                <Suspense fallback={<div className="w-full h-10 rounded-full bg-muted/20 animate-pulse" />}>
                                    <SearchBar variant="navbar" />
                                </Suspense>
                            </div>
                        )}

                        {/* Spacer if search bar is hidden or on smaller screens to push actions to right */}
                        {(!showNavbarSearch || true) && <div className="flex-1 lg:hidden" />}
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <div className="hidden md:flex items-center gap-4">
                            <NotificationBell />
                            <UserNav />
                            <ThemeToggle />
                        </div>

                        {/* Mobile Actions (Visible on small screens) */}
                        <div className="flex md:hidden items-center gap-2">
                            <NotificationBell />
                            <UserNav />
                            {/* Hamburger hidden, moved to bottom nav */}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Backdrop (Transparent) */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Compact Dropdown Menu (Bottom Aligned) */}
            <div
                className={cn(
                    "fixed bottom-20 right-4 z-50 w-56 transform transition-all duration-200 ease-out origin-bottom-right md:hidden",
                    mobileMenuOpen
                        ? "scale-100 opacity-100 translate-y-0"
                        : "scale-95 opacity-0 translate-y-2 pointer-events-none"
                )}
            >
                <div className="bg-popover/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden">
                    <nav className="flex flex-col p-1.5">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-sm font-medium transition-colors group"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span className="flex-1">Ana Sayfa</span>
                            <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity text-primary" />
                        </Link>
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
                        <Link
                            href="/topluluk"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-sm font-medium transition-colors group"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span className="flex-1">Topluluk</span>
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

            <CurvedBottomNav onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        </>
    );
}
