'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollManager() {
    const pathname = usePathname();

    useEffect(() => {
        // Save scroll position on scroll
        const handleScroll = () => {
            sessionStorage.setItem('pageScrollPos', window.scrollY.toString());
        };

        // Throttled scroll handler
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    useEffect(() => {
        // Disable browser's native scroll restoration to manual
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        // Restore scroll position logic
        const restoreScroll = () => {
            const savedScrollStr = sessionStorage.getItem('pageScrollPos');
            if (!savedScrollStr) return;

            const savedScroll = parseInt(savedScrollStr, 10);

            // Polling mechanism to wait for content to load
            // Polling mechanism to wait for content to load
            let attempts = 0;
            const maxAttempts = 50; // Try for 5 seconds (50 * 100ms)

            const attemptScroll = () => {
                // Attempt to scroll to the saved position
                window.scrollTo({
                    top: savedScroll,
                    behavior: 'instant'
                });

                // Verify if we reached the target
                // We only stop if we are remarkably close to the target position.
                // We do NOT stop if we are just at the bottom of a partially loaded page.
                if (Math.abs(window.scrollY - savedScroll) < 10) {
                    return; // Success!
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(attemptScroll, 100);
                }
            };

            attemptScroll();
        };

        restoreScroll();
    }, [pathname]);

    return null;
}
