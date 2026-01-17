"use client";

import ReviewSection from "./reviews/review-section";
import CommentSection from "./comments/comment-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Star, MapPin } from "lucide-react";
import { ReadingJourney } from "./reading-journey";

interface InteractionTabsProps {
    novelId: number;
    coverImage?: string;
    chapterCount?: number;
}

export default function InteractionTabs({ novelId, coverImage, chapterCount }: InteractionTabsProps) {
    return (
        <div className="mt-8 relative min-h-[800px] overflow-hidden rounded-3xl border border-white/5 bg-black/20">
            {/* GLOBAL BACKGROUND - FROSTED GLASS */}
            {coverImage && (
                <>
                    <div
                        className="absolute inset-0 z-0 bg-cover bg-top bg-no-repeat blur-md opacity-35 transform scale-105 pointer-events-none"
                        style={{ backgroundImage: `url(${coverImage})` }}
                    />
                    <div className="absolute inset-0 z-0 bg-stone-950/50 pointer-events-none" />
                </>
            )}

            <div className="relative z-10 p-4 sm:p-8">
                <Tabs defaultValue="journey" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mb-8 bg-black/40 backdrop-blur-md border border-white/10 p-1 h-auto mx-auto shadow-2xl">
                        <TabsTrigger value="journey" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                            <MapPin size={16} />
                            Kule
                        </TabsTrigger>
                        <TabsTrigger value="reviews" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                            <Star size={16} />
                            Değerlendirmeler
                        </TabsTrigger>
                        <TabsTrigger value="comments" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                            <MessageSquare size={16} />
                            Yorumlar
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="journey"
                        forceMount
                        className="mt-0 focus-visible:outline-none focus-visible:ring-0 data-[state=inactive]:hidden"
                    >
                        <ReadingJourney
                            novelId={novelId}
                            chapterCount={chapterCount}
                            orientation="vertical"
                            className="bg-transparent border-none shadow-none"
                            coverImage={coverImage}
                        />
                    </TabsContent>

                    <TabsContent value="reviews" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                        <div className="h-[750px] overflow-y-auto pr-4 custom-scrollbar [scrollbar-gutter:stable]">
                            <ReviewSection novelId={novelId} coverImage={coverImage} />
                        </div>
                    </TabsContent>

                    <TabsContent value="comments" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                        <div className="h-[750px] overflow-y-auto pr-4 custom-scrollbar [scrollbar-gutter:stable]">
                            <CommentSection novelId={novelId} />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
