"use client";

import { useEffect, useState } from "react";
import { deleteComment, Comment } from "@/services/comment-service";
import CommentForm from "./comment-form";
import CommentList from "./comment-list";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

interface CommentSectionProps {
    novelId: number;
}

export default function CommentSection({ novelId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOption, setSortOption] = useState("newest");
    const { user } = useAuth();

    useEffect(() => {
        setLoading(true);
        const commentsRef = collection(db, "comments");

        let q = query(commentsRef, where("novelId", "==", novelId));

        if (sortOption === "newest") {
            q = query(q, orderBy("createdAt", "desc"));
        } else if (sortOption === "oldest") {
            q = query(q, orderBy("createdAt", "asc"));
        } else {
            q = query(q, orderBy("createdAt", "desc"));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Comment));
            setComments(commentsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching comments realtime:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [novelId, sortOption]);

    const handleDelete = async (commentId: string) => {
        if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;

        try {
            await deleteComment(commentId);
            toast.success("Yorum silindi.");
            // onSnapshot updates automatically
        } catch (error) {
            console.error(error);
            toast.error("Silme işlemi başarısız.");
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">Yorumlar</h2>
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50">
                        {comments.length}
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
                    </SelectContent>
                </Select>
            </div>

            <CommentForm novelId={novelId} onCommentAdded={() => { }} />

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <CommentList comments={comments} onDelete={handleDelete} onReplyAdded={() => { }} />
            )}
        </div>
    );
}
