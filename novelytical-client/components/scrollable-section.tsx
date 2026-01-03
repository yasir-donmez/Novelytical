'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollableSectionProps {
    title: React.ReactNode;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export function ScrollableSection({ title, icon, children }: ScrollableSectionProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [isAtStart, setIsAtStart] = useState(true);
    const [isAtEnd, setIsAtEnd] = useState(false);


    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            const overflow = scrollWidth > clientWidth;
            setHasOverflow(overflow);



            setIsAtStart(scrollLeft <= 2);
            // Allow a tolerance (2px) for calculation errors
            setIsAtEnd(Math.abs(scrollWidth - clientWidth - scrollLeft) < 2);
        }
    };

    useEffect(() => {
        const handleResize = () => checkScroll();
        // Initial check
        checkScroll();

        // Listen for window resize
        window.addEventListener('resize', handleResize);

        // Also observe the container itself for size changes (content loading etc)
        const container = scrollContainerRef.current;
        const resizeObserver = new ResizeObserver(() => checkScroll());
        if (container) {
            resizeObserver.observe(container);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, []);

    // Re-check when children change (e.g. async loading)
    useEffect(() => {
        // Reset centering when children change significantly (optional, but good for new data)
        // We might want to re-center if the content completely changes
        // But for now let's keep it simple. If we want to re-center on new data:
        // hasCenteredRef.current = false;
        checkScroll();
    }, [children]);

    const scroll = (direction: 'left' | 'right', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (scrollContainerRef.current) {
            const { clientWidth } = scrollContainerRef.current;
            const scrollAmount = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            // setTimeout to check arrow state after scroll animation
            setTimeout(checkScroll, 300);
        }
    };

    return (
        <section className="mt-12 border-t pt-8 relative group/section select-none">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold flex items-center gap-2">{title}</h2>
                    {icon}
                </div>

                {/* Navigation Arrows - Only show if content overflows */}
                {hasOverflow && (
                    <div className="hidden md:flex gap-2">
                        {/* Left Arrow */}
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-20 transition-all duration-200",
                                isAtStart && "invisible pointer-events-none"
                            )}
                            onClick={(e) => scroll('left', e)}
                            aria-label="Sola kaydır"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Right Arrow */}
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-20 transition-all duration-200",
                                isAtEnd && "invisible pointer-events-none"
                            )}
                            onClick={(e) => scroll('right', e)}
                            aria-label="Sağa kaydır"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="relative">
                {/* Mobile Top Mist Gradient */}
                <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

                {/* Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row md:items-stretch overflow-y-auto md:overflow-y-visible md:overflow-x-auto h-[350px] md:h-auto py-24 md:py-8 gap-6 md:gap-4 pl-4 md:pl-4 pr-0 md:pr-0 snap-y snap-mandatory md:snap-x md:scroll-pl-4 scrollbar-none [&::-webkit-scrollbar]:hidden w-full relative"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {children}
                </div>

                {/* Left Gradient Overlay (Desktop Only) - Always visible */}
                <div className="hidden md:block absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />

                {/* Right Gradient Overlay (Desktop Only) - Always visible */}
                <div className="hidden md:block absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />

                {/* Mobile Bottom Mist Gradient */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
            </div>
        </section>
    );
}
