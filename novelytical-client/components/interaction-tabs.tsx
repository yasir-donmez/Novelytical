"use client";

import ReviewSection from "./reviews/review-section";
import CommentSection from "./comments/comment-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Star } from "lucide-react";

interface InteractionTabsProps {
    novelId: number;
}

export default function InteractionTabs({ novelId }: InteractionTabsProps) {
    return (
        <div className="mt-8">
            <Tabs defaultValue="reviews" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-8">
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
                    <ReviewSection novelId={novelId} />
                </TabsContent>

                <TabsContent value="comments" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <CommentSection novelId={novelId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
