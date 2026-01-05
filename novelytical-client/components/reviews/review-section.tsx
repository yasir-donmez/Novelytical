"use client";

import { useEffect, useState } from "react";
import { getReviewsByNovelId, Review } from "@/services/review-service";
import ReviewForm from "./review-form";
import ReviewList from "./review-list";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface ReviewSectionProps {
    novelId: number;
}

export default function ReviewSection({ novelId }: ReviewSectionProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOption, setSortOption] = useState("newest");

    const fetchReviews = async () => {
        setLoading(true);
        const data = await getReviewsByNovelId(novelId, sortOption);
        setReviews(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchReviews();
    }, [novelId, sortOption]);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">Okur Değerlendirmeleri</h2>
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50">
                        {reviews.length}
                    </Badge>
                </div>
                <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[180px] h-9 text-xs font-medium bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-colors focus:ring-0">
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Sıralama" />
                        </div>
                    </SelectTrigger>
                    <SelectContent position="popper" align="end" sideOffset={5}>
                        <SelectItem value="newest">En Yeni</SelectItem>
                        <SelectItem value="oldest">En Eski</SelectItem>
                        <SelectItem value="highest-rating">En Yüksek Puan</SelectItem>
                        <SelectItem value="lowest-rating">En Düşük Puan</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <ReviewForm novelId={novelId} onReviewAdded={fetchReviews} />

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <ReviewList reviews={reviews} onDelete={async (id) => {
                    await fetchReviews(); // Refresh list after delete
                }} />
            )}
        </div>
    );
}
