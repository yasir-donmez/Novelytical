import { HeroSection } from '@/components/hero-section';

export default function DiscoveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Hero Section - Static, never changes */}
            <HeroSection />
            
            {/* Page-specific content */}
            {children}
        </>
    );
}