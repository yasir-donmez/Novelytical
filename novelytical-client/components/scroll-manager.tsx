'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollManager() {
    const pathname = usePathname();

    // 1. Restore Scroll Logic
    useEffect(() => {
        // Disable browser's auto restoration to prevent conflicts
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        const restoreScroll = () => {
            const savedScrollStr = sessionStorage.getItem(`scroll_${pathname}`);
            const savedScroll = savedScrollStr ? parseInt(savedScrollStr, 10) : 0;

            // If we have a saved position (greater than 0)
            if (savedScroll > 0) {
                let attempts = 0;
                // Try for approx 5 seconds (300 * 16ms approx) - increased for slow Community section
                const maxAttempts = 300;

                const attemptScroll = () => {
                    const docHeight = document.documentElement.scrollHeight;
                    const winHeight = window.innerHeight;

                    // We can only scroll to 'savedScroll' if the document is tall enough.
                    // safely: docHeight must be >= savedScroll + winHeight (roughly)
                    // If we try to scroll to 500px but doc is only 200px, browser forces it to 0 or max.
                    if (docHeight >= savedScroll + winHeight - 50) { // -50 tolerance
                        window.scrollTo({ top: savedScroll, behavior: 'instant' });
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        requestAnimationFrame(attemptScroll);
                    }
                };

                requestAnimationFrame(attemptScroll);
            }
        };

        restoreScroll();
    }, [pathname]);

    // 2. Save Scroll Logic
    useEffect(() => {
        const handleScroll = () => {
            // Save current scroll position
            sessionStorage.setItem(`scroll_${pathname}`, window.scrollY.toString());
        };

        // Passive listener for performance
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [pathname]);

    return null;
}
