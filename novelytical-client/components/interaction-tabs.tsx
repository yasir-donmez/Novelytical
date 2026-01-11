"use client";

import ReviewSection from "./reviews/review-section";
import CommentSection from "./comments/comment-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Star } from "lucide-react";

interface InteractionTabsProps {
    novelId: number;
    coverImage?: string;
}

export default function InteractionTabs({ novelId, coverImage }: InteractionTabsProps) {
    return (
        <div className="mt-8">
            <Tabs defaultValue="reviews" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-8 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-1 h-auto">
                    <TabsTrigger value="reviews" className="flex items-center gap-2">
                        <Star size={16} />
                        Değerlendirmeler
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="flex items-center gap-2">
                        <MessageSquare size={16} />
                        Yorumlar
                    </TabsTrigger>
                </TabsList>

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
