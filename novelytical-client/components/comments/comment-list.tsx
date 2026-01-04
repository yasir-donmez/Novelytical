
import { Comment } from "@/services/comment-service";
import CommentItem from "./comment-item";
import { useMemo } from "react";
import { Timestamp } from "firebase/firestore";

interface CommentListProps {
    comments: Comment[];
    onDelete: (id: string) => void;
    onReplyAdded: () => void;
}

export default function CommentList({ comments, onDelete, onReplyAdded }: CommentListProps) {
    // Logic to insert "Ghost" parents for orphaned comments
    const allComments = useMemo(() => {
        const commentIdSet = new Set(comments.map(c => c.id));
        const ghosts: Comment[] = [];
        const processedGhostIds = new Set<string>();

        // Find orphaned replies
        comments.forEach(c => {
            if (c.parentId && !commentIdSet.has(c.parentId)) {
                if (!processedGhostIds.has(c.parentId)) {
                    // Create ghost parent
                    ghosts.push({
                        id: c.parentId,
                        novelId: c.novelId,
                        userId: "deleted",
                        userName: "Silinmiş Kullanıcı",
                        content: "[Bu yorum silinmiş]",
                        parentId: null, // Assume root for simplicity, or we recurse up if grand-parents are missing too (complex)
                        createdAt: c.createdAt // Use child date as proxy or special handling
                    });
                    processedGhostIds.add(c.parentId);
                }
            }
        });

        return [...comments, ...ghosts];
    }, [comments]);


    if (comments.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground mb-1">Henüz yorum yapılmamış.</p>
                <p className="text-sm text-muted-foreground/70">İlk yorumu sen yap! 🚀</p>
            </div>
        );
    }

    const rootComments = allComments.filter(c => !c.parentId);

    return (
        <div className="space-y-3">
            {rootComments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    onDelete={onDelete}
                    onReplyAdded={onReplyAdded}
                    allComments={allComments}
                />
            ))}
        </div>
    );
}
