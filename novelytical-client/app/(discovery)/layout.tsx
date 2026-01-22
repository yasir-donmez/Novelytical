export default function DiscoveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background pb-20 w-full overflow-x-hidden">
            {/* Dynamic Content - Hero section now handled by individual pages */}
            <div className="relative z-20">
                {children}
            </div>
        </div>
    );
}
