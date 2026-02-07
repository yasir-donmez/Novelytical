import { HeroServer } from '@/components/features/novel/hero-server';

export default function DiscoveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Hero Section - Server Component with ISR (Cached Dynamic Data) */}
            <HeroServer />

            {/* Page-specific content */}
            {children}
        </>
    );
}

// Suspense and Skeleton removed as requested