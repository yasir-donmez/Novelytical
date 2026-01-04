
import { Review } from "@/services/review-service";
import ReviewItem from "./review-item";

interface ReviewListProps {
    reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
    if (reviews.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground mb-1">Henüz değerlendirme yapılmamış.</p>
                <p className="text-sm text-muted-foreground/70">Bu romanı ilk değerlendiren sen ol!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
            ))}
        </div>
    );
}
