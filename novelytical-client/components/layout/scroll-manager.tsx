'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollManager() {
    const pathname = usePathname();

    // 1. Native Restoration
    useEffect(() => {
        // Enforce native browser behavior
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'auto';
        }
    }, [pathname]);

    // Previous custom logic removed to prevent fighting with browser and layout shift fixes.

    return null;
}
