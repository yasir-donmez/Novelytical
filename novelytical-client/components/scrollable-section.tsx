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
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 0);
            // Allow a small tolerance (1px) for calculation errors
            setShowRightArrow(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 1);

            // Center detection logic
            const containerCenter = scrollLeft + clientWidth / 2;
            const children = Array.from(scrollContainerRef.current.children) as HTMLElement[];

            let closestChild: HTMLElement | null = null;
            let minDistance = Infinity;

            children.forEach((child) => {
                const childCenter = child.offsetLeft + child.offsetWidth / 2;
                const distance = Math.abs(childCenter - containerCenter);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestChild = child;
                }

                // Reset others
                if (child.hasAttribute('data-centered')) {
                    child.removeAttribute('data-centered');
                }
            });

            if (closestChild) {
                (closestChild as HTMLElement).setAttribute('data-centered', 'true');
            }
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

                {/* Navigation Arrows (Only show if scrollable) */}
                {(showLeftArrow || showRightArrow) && (
                    <div className="hidden md:flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-20 disabled:opacity-0 transition-opacity"
                            onClick={(e) => scroll('left', e)}
                            disabled={!showLeftArrow}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:text-primary z-20 disabled:opacity-0 transition-opacity"
                            onClick={(e) => scroll('right', e)}
                            disabled={!showRightArrow}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="relative">
                {/* Left Gradient Overlay */}
                {showLeftArrow && (
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                )}

                {/* Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className="flex overflow-x-auto py-8 gap-5 snap-x scrollbar-none [&::-webkit-scrollbar]:hidden px-[30vw] lg:px-0"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {children}
                </div>

                {/* Right Gradient Overlay */}
                {showRightArrow && (
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                )}
            </div>
        </section>
    );
}
