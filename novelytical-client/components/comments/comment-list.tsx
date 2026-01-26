
import { CommentDto } from "@/services/review-service";
import CommentItem from "./comment-item";

interface CommentListProps {
    comments: CommentDto[];
    novelId: number;
    onDelete: (id: string) => void;
    onReplyAdded: () => void;
}

export default function CommentList({ comments, novelId, onDelete, onReplyAdded }: CommentListProps) {
    if (comments.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground mb-1">Henüz yorum yapılmamış.</p>
                <p className="text-sm text-muted-foreground/70">İlk yorumu sen yap! 🚀</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    novelId={novelId}
                    onDelete={onDelete}
                    onReplyAdded={onReplyAdded}
                />
            ))}
        </div>
    );
}
