'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollManager() {
    const pathname = usePathname();
    const prevPathname = useRef<string | null>(null);
    const isBackNavigation = useRef(false);

    // Detect back/forward navigation using popstate
    useEffect(() => {
        const handlePopState = () => {
            isBackNavigation.current = true;
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        // Disable browser's native scroll restoration
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        // Only restore scroll on back/forward navigation, not new visits
        if (isBackNavigation.current && prevPathname.current !== null) {
            const savedScrollStr = sessionStorage.getItem(`scroll_${pathname}`);
            if (savedScrollStr) {
                const savedScroll = parseInt(savedScrollStr, 10);
                // Simple one-time attempt after a short delay for content to render
                setTimeout(() => {
                    window.scrollTo({ top: savedScroll, behavior: 'instant' });
                }, 50);
            }
        } else {
            // New navigation: scroll to top
            window.scrollTo({ top: 0, behavior: 'instant' });
        }

        // Reset the flag
        isBackNavigation.current = false;
        prevPathname.current = pathname;
    }, [pathname]);

    // Save scroll position per-page on scroll
    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    sessionStorage.setItem(`scroll_${pathname}`, window.scrollY.toString());
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [pathname]);

    return null;
}
