
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
    Timestamp,
    updateDoc,
    getDoc
} from "firebase/firestore";
import { createNotification } from "./notification-service";

export interface Comment {
    id: string;
    novelId: number;
    userId: string;
    userName: string;
    content: string;
    parentId: string | null;  // For replies
    isSpoiler?: boolean;
    createdAt: Timestamp;
}

const COLLECTION_NAME = "comments";

export const addComment = async (
    novelId: number,
    userId: string,
    userName: string,
    content: string,
    parentId: string | null = null, // Optional parentId
    isSpoiler: boolean = false
) => {
    try {
        const commentRef = await addDoc(collection(db, COLLECTION_NAME), {
            novelId,
            userId,
            userName,
            content,
            parentId,
            isSpoiler,
            createdAt: serverTimestamp()
        });

        // Trigger notification if it's a reply
        if (parentId) {
            try {
                const parentDoc = await getDoc(doc(db, COLLECTION_NAME, parentId));
                if (parentDoc.exists()) {
                    const parentData = parentDoc.data() as Comment;
                    // Don't notify if replying to self
                    if (parentData.userId !== userId) {
                        await createNotification(
                            parentData.userId,
                            'reply',
                            `${userName} yorumunuza cevap verdi: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                            commentRef.id,
                            `/novel/${novelId}`, // Link to the novel
                            userId,
                            userName,
                            // userImage is not passed to addComment currently, maybe update signature?
                            // For now leaving undefined or we need to pass it.
                            // Looking at addComment signature:
                            // (novelId, userId, userName, content, parentId)
                            // It doesn't receive userImage.
                            undefined // senderImage
                        );
                    }
                }
            } catch (notifyError) {
                console.error("Failed to send notification:", notifyError);
                // Don't fail the comment creation
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};

export const getCommentsByNovelId = async (novelId: number, sortBy: string = 'newest'): Promise<Comment[]> => {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            where("novelId", "==", novelId)
        );

        if (sortBy === 'newest') {
            q = query(q, orderBy("createdAt", "desc"));
        } else if (sortBy === 'oldest') {
            q = query(q, orderBy("createdAt", "asc"));
        } else {
            q = query(q, orderBy("createdAt", "desc"));
        }

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

export const getCommentsByUserId = async (userId: string): Promise<Comment[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Comment));
    } catch (error) {
        console.error("Error fetching user comments:", error);
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

export const updateUserIdentityInComments = async (userId: string, userName: string) => {
    try {
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const snapshot = await getDocs(q);

        // Note: Comments currently don't store userImage, only userName
        const updatePromises = snapshot.docs.map(doc =>
            updateDoc(doc.ref, { userName })
        );

        await Promise.all(updatePromises);
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error syncing user identity in comments:", error);
        throw error;
    }
};
