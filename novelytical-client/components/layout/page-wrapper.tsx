'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function PageWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Sayfa dikey boşluğundan (pt-20) muaf tutulacak rotalar
    const excludedRoutes = ['/', '/romanlar', '/login', '/register'];
    const isExcluded = excludedRoutes.includes(pathname);

    return (
        <div className={cn(
            "flex flex-col flex-1",
            !isExcluded && "pt-20"
        )}>
            {children}
        </div>
    );
}
