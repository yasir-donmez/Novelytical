'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';

export function HomeTags() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedTags = searchParams.getAll('tag');

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // State for drag scrolling
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [wasDragging, setWasDragging] = useState(false); // To prevent click after drag

    // Derived State
    const tagsKey = selectedTags.join(','); // Stable key for dependency
    const { row1Tags, row2Tags } = useMemo(() => {
        const splitIndex = Math.ceil(selectedTags.length * 0.55);
        return {
            row1Tags: selectedTags.slice(0, splitIndex),
            row2Tags: selectedTags.slice(splitIndex)
        };
    }, [tagsKey, selectedTags]); // selectedTags in deps is fine if we trust nextjs, but tagsKey is safer string

    const handleTagClick = (tag: string) => {
        if (wasDragging) return; // Don't remove if we were just dragging

        const params = new URLSearchParams(searchParams.toString());
        const current = params.getAll('tag');

        // In this "Applied Filters" view, clicking always removes the tag
        params.delete('tag');
        current.filter(t => t !== tag).forEach(t => params.append('tag', t));

        // Reset page when filtering
        params.delete('page');
        router.push(`/romanlar?${params.toString()}`, { scroll: false });
    };

    /**
     * Effect to bind non-passive wheel listeners and handle centering
     */
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            const el = e.currentTarget as HTMLDivElement;
            if (!el) return;

            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };

        const container = containerRef.current;
        const content = contentRef.current;

        if (container && content) {
            container.addEventListener('wheel', handleWheel, { passive: false });

            const centerScroll = () => {
                if (container.scrollWidth > container.clientWidth) {
                    const targetX = (container.scrollWidth - container.clientWidth) / 2;
                    // Only apply if it's significantly off-center (to avoid fighting user) or exact center is desired
                    // For initial load, we force it.
                    if (Math.abs(container.scrollLeft - targetX) > 10) {
                        container.scrollLeft = targetX;
                    }
                }
            };

            // Only center on mount or when tags change significantly
            if (!isDragging) {
                setTimeout(centerScroll, 100);
                setTimeout(centerScroll, 500);
            }

            return () => {
                container.removeEventListener('wheel', handleWheel);
            };
        }
    }, [isDragging, tagsKey]);

    /**
     * Drag Definitions
     */
    const onMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - containerRef.current.offsetLeft);
        setScrollLeft(containerRef.current.scrollLeft);
        setWasDragging(false); // Reset drag status
    };

    const onMouseLeave = () => {
        setIsDragging(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
        // We handle 'wasDragging' logic in onClick via the state maintained during move
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        containerRef.current.scrollLeft = scrollLeft - walk;

        // If we moved significantly, mark as dragging to prevent click
        if (Math.abs(x - startX) > 5) {
            setWasDragging(true);
        }
    };

    const containerClass = cn(
        "overflow-x-auto no-scrollbar px-8 md:px-16 py-6 flex w-full cursor-grab active:cursor-grabbing",
        !isDragging && "scroll-smooth" // Only smooth scroll when NOT dragging
    );

    return (
        <div className="relative w-full py-2 min-h-[140px] flex items-center">
            {/* Unified Scroll Container */}
            <div
                ref={containerRef}
                className={containerClass}
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                }}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
            >
                <div ref={contentRef} className="flex flex-col gap-3 w-max mx-auto items-center">
                    <LayoutGroup>
                        {/* Row 1 */}
                        <div className="flex gap-3 items-center justify-center">
                            <AnimatePresence>
                                {row1Tags.map((tag) => {
                                    const isNegative = tag.startsWith('-');
                                    const displayTag = isNegative ? tag.substring(1) : tag;

                                    return (
                                        <motion.button
                                            layout="position"
                                            layoutId={tag}
                                            initial={{ opacity: 0, scale: 0.5, y: 20, filter: "blur(10px)" }}
                                            animate={{ opacity: 1, scale: 1, y: 0, width: "auto", paddingLeft: "0.75rem", paddingRight: "0.75rem", filter: "blur(0px)" }}
                                            exit={{
                                                opacity: 0,
                                                scale: 0,
                                                width: 0,
                                                paddingLeft: 0,
                                                paddingRight: 0,
                                                marginLeft: 0,
                                                marginRight: 0,
                                                overflow: 'hidden',
                                                transition: { duration: 0.2, ease: "easeInOut" }
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                            key={tag}
                                            onClick={() => handleTagClick(tag)}
                                            className={cn(
                                                "group whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200 border select-none flex items-center shadow-sm",
                                                isNegative
                                                    ? "bg-transparent text-red-600 dark:text-red-400 border-red-500/50 hover:bg-red-500/20"
                                                    : "bg-transparent text-purple-600 dark:text-purple-400 border-purple-500/50 hover:bg-purple-500/20"
                                            )}
                                            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                                            whileTap={{ scale: 0.9, transition: { duration: 0.1 } }}
                                        >
                                            <motion.span layout="position">{displayTag}</motion.span>
                                            <span className="inline-flex items-center justify-center w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:w-4 group-hover:ml-1 group-hover:opacity-100">
                                                ×
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {/* Row 2 */}
                        {row2Tags.length > 0 && (
                            <div className="flex gap-3 items-center justify-center">
                                <div className="w-8 shrink-0" /> {/* Visual offset */}
                                <AnimatePresence>
                                    {row2Tags.map((tag) => {
                                        const isNegative = tag.startsWith('-');
                                        const displayTag = isNegative ? tag.substring(1) : tag;

                                        return (
                                            <motion.button
                                                layout="position"
                                                layoutId={tag}
                                                initial={{ opacity: 0, scale: 0.5, y: 20, filter: "blur(10px)" }}
                                                animate={{ opacity: 1, scale: 1, y: 0, width: "auto", paddingLeft: "0.75rem", paddingRight: "0.75rem", filter: "blur(0px)" }}
                                                exit={{
                                                    opacity: 0,
                                                    scale: 0,
                                                    width: 0,
                                                    paddingLeft: 0,
                                                    paddingRight: 0,
                                                    marginLeft: 0,
                                                    marginRight: 0,
                                                    overflow: 'hidden',
                                                    transition: { duration: 0.2, ease: "easeInOut" }
                                                }}
                                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                key={tag}
                                                onClick={() => handleTagClick(tag)}
                                                className={cn(
                                                    "group whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200 border select-none flex items-center shadow-sm",
                                                    isNegative
                                                        ? "bg-transparent text-red-600 dark:text-red-400 border-red-500/50 hover:bg-red-500/20"
                                                        : "bg-transparent text-purple-600 dark:text-purple-400 border-purple-500/50 hover:bg-purple-500/20"
                                                )}
                                                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                                                whileTap={{ scale: 0.9, transition: { duration: 0.1 } }}
                                            >
                                                <motion.span layout="position">{displayTag}</motion.span>
                                                <span className="inline-flex items-center justify-center w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:w-4 group-hover:ml-1 group-hover:opacity-100">
                                                    ×
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </LayoutGroup>
                </div>
            </div>
        </div>
    );
}
