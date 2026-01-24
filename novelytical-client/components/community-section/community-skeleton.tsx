'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CommunitySkeleton() {
    return (
        <section className="w-full mt-4 py-6 relative bg-gradient-to-b from-purple-500/10 via-background to-transparent border-t border-purple-500/20 rounded-xl overflow-hidden">
            {/* AMBIENT EFFECTS (Matching community-pulse-optimized) */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_2px_rgba(168,85,247,0.6)]" />

            {/* LAMPS Placeholder */}
            {/* Hidden in skeleton to reduce noise, or we can keep them for fidelity. Let's keep it clean. */}

            <div className="w-full relative">
                <div className="flex flex-col h-full w-full space-y-0">

                    {/* Header Mockup */}
                    <div className="flex items-center justify-between gap-4 mb-4 px-4 sm:px-12">
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-28 rounded-full" /> {/* Tab 1 */}
                            <Skeleton className="h-10 w-28 rounded-full hidden sm:block" /> {/* Tab 2 */}
                            <Skeleton className="h-10 w-28 rounded-full hidden sm:block" /> {/* Tab 3 */}
                        </div>
                        <Skeleton className="h-4 w-32" /> {/* Active Users */}
                    </div>

                    {/* Main Card */}
                    <Card className="mx-4 sm:mx-12 border-border/50 bg-background/50 backdrop-blur-sm h-[calc(100vh-180px)] min-h-[500px] flex flex-col relative overflow-visible ring-1 ring-border/50 shadow-xl rounded-xl py-0 z-20">
                        <div className="flex-1 flex flex-col h-full mt-0">
                            <div className="relative flex-1 min-h-0">
                                <div className="absolute inset-x-0 top-3 bottom-3 px-4 sm:px-12 overflow-y-auto space-y-4 custom-scrollbar scale-y-[-1]">
                                    {/* Chat Bubbles (Mocking message flow) */}

                                    {/* User Message (Right) */}
                                    <div className="w-full flex mb-2 sm:mb-3 px-1 justify-end">
                                        <div className="flex gap-2 sm:gap-4 max-w-[95%] sm:max-w-[85%] min-w-0 flex-row">
                                            <div className="relative min-w-0 flex-1 p-3 sm:p-4 shadow-sm bg-primary/5 rounded-xl sm:rounded-2xl rounded-tr-none border border-primary/20">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Skeleton className="h-3 w-20" />
                                                </div>
                                                <Skeleton className="h-4 w-full mb-1" />
                                                <Skeleton className="h-4 w-2/3" />
                                            </div>
                                            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                        </div>
                                    </div>

                                    {/* Other Message (Left) */}
                                    <div className="w-full flex mb-2 sm:mb-3 px-1 justify-start">
                                        <div className="flex gap-2 sm:gap-4 max-w-[95%] sm:max-w-[85%] min-w-0 flex-row">
                                            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                            <div className="relative min-w-0 flex-1 p-3 sm:p-4 shadow-sm bg-muted/30 rounded-xl sm:rounded-2xl rounded-tl-none border border-border/40">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Skeleton className="h-3 w-24" />
                                                </div>
                                                <Skeleton className="h-4 w-3/4 mb-1" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Other Message (Left - Long) */}
                                    <div className="w-full flex mb-2 sm:mb-3 px-1 justify-start">
                                        <div className="flex gap-2 sm:gap-4 max-w-[95%] sm:max-w-[85%] min-w-0 flex-row">
                                            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                            <div className="relative min-w-0 flex-1 p-3 sm:p-4 shadow-sm bg-muted/30 rounded-xl sm:rounded-2xl rounded-tl-none border border-border/40">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Skeleton className="h-3 w-20" />
                                                </div>
                                                <Skeleton className="h-4 w-full mb-1" />
                                                <Skeleton className="h-4 w-full mb-1" />
                                                <Skeleton className="h-4 w-2/3" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Message (Right - Poll Mock) */}
                                    <div className="w-full flex mb-2 sm:mb-3 px-1 justify-end">
                                        <div className="flex gap-2 sm:gap-4 max-w-[95%] sm:max-w-[85%] min-w-0 flex-row w-full">
                                            <div className="relative min-w-0 flex-1 p-3 sm:p-4 shadow-sm bg-primary/5 rounded-xl sm:rounded-2xl rounded-tr-none border border-primary/20">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Skeleton className="h-3 w-24" />
                                                </div>
                                                <Skeleton className="h-10 w-full mb-2 rounded-lg" />
                                                <Skeleton className="h-10 w-full rounded-lg" />
                                            </div>
                                            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Input Area Mockup */}
                            <div className="p-4 border-t border-border/50">
                                <Skeleton className="h-12 w-full rounded-xl" />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}
