
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";

export interface Comment {
    id: string;
    novelId: number;
    userId: string;
    userName: string;
    content: string;
    parentId: string | null;  // For replies
    createdAt: Timestamp;
}

const COLLECTION_NAME = "comments";

export const addComment = async (
    novelId: number,
    userId: string,
    userName: string,
    content: string,
    parentId: string | null = null // Optional parentId
) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), {
            novelId,
            userId,
            userName,
            content,
            parentId,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};

export const getCommentsByNovelId = async (novelId: number): Promise<Comment[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("novelId", "==", novelId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Comment));
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
};

export const deleteComment = async (commentId: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, commentId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting comment:", error);
        throw error;
    }
};
