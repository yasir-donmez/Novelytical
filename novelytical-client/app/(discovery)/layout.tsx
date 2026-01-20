import { HeroServer } from '@/components/hero-server';

export default function DiscoveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background pb-20 w-full overflow-x-hidden">
            {/* Fixed Hero Section - Shared across all pages in this group */}
            <HeroServer />

            {/* Dynamic Content - Changes based on route */}
            <div className="relative z-20 -mt-44">
                {children}
            </div>
        </div>
    );
}
