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
        <div className="mt-8">
            <Tabs defaultValue="journey" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mb-8 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-1 h-auto">
                    <TabsTrigger value="journey" className="flex items-center gap-2">
                        <MapPin size={16} />
                        Yolculuk
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="flex items-center gap-2">
                        <Star size={16} />
                        Değerlendirmeler
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="flex items-center gap-2">
                        <MessageSquare size={16} />
                        Yorumlar
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="journey" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <ReadingJourney
                        novelId={novelId}
                        chapterCount={chapterCount}
                        orientation="vertical"
                        className="bg-zinc-950/20 rounded-3xl border border-white/5"
                    />
                </TabsContent>

                <TabsContent value="reviews" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <ReviewSection novelId={novelId} coverImage={coverImage} />
                </TabsContent>

                <TabsContent value="comments" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <CommentSection novelId={novelId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
