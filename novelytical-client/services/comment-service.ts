
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
    getDoc,
    limit,
    increment,
    setDoc,
    runTransaction
} from "firebase/firestore";
import { LevelService, XP_RULES } from "./level-service";
import { createNotification } from "./notification-service";
import { UserService } from "./user-service";
import { incrementCommentCount, decrementCommentCount } from "./novel-stats-service";

export interface Comment {
    id: string;
    novelId: number;
    userId: string;
    userName: string;
    userImage?: string; // Added userImage
    userFrame?: string; // Added userFrame
    content: string;
    parentId: string | null;  // For replies
    isSpoiler?: boolean;
    likeCount?: number;
    dislikeCount?: number;
    createdAt: Timestamp;
}

const COLLECTION_NAME = "comments";
const COMMENT_VOTES_COLLECTION = "votes"; // Subcollection name

export const addComment = async (
    novelId: number,
    userId: string,
    userName: string,
    userImage: string | null | undefined, // Added userImage
    userFrame: string | null | undefined, // Added userFrame
    content: string,
    parentId: string | null = null, // Optional parentId
    isSpoiler: boolean = false
) => {
    try {
        // Fetch userFrame if not provided (fallback)
        if (!userFrame) {
            const levelData = await LevelService.getUserLevelData(userId);
            userFrame = levelData?.selectedFrame;
        }

        const commentRef = await addDoc(collection(db, COLLECTION_NAME), {
            novelId,
            userId,
            userName,
            userImage: userImage || null, // Store userImage
            userFrame: userFrame || null, // Store userFrame
            content,
            parentId,
            isSpoiler,
            likeCount: 0,
            dislikeCount: 0,
            createdAt: serverTimestamp()
        });

        // Award XP
        await LevelService.gainXp(userId, XP_RULES.COMMENT);

        // Update novel stats (only for top-level comments, not replies)
        if (!parentId) {
            await incrementCommentCount(novelId);
        }

        // Handle Mentions
        const mentionRegex = /@(\w+)/g;
        const mentions = content.match(mentionRegex);

        if (mentions) {
            const mentionedUsers = new Set<string>();
            for (const mention of mentions) {
                const username = mention.substring(1); // Remove @
                if (username.toLowerCase() === userName.toLowerCase()) continue;

                const mentionedUserId = await UserService.getUserIdByUsername(username);
                if (mentionedUserId && !mentionedUsers.has(mentionedUserId)) {
                    mentionedUsers.add(mentionedUserId);
                    await createNotification(
                        mentionedUserId,
                        'system',
                        `${userName} bir yorumda sizden bahsetti.`,
                        commentRef.id,
                        `/novel/${novelId}`,
                        userId,
                        userName,
                        userImage || undefined,
                        userFrame || undefined
                    );
                }
            }
        }

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
                            userImage || undefined,
                            userFrame || undefined
                        );
                    }
                }
            } catch (notifyError) {
                console.error("Failed to send notification:", notifyError);
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};


export const getCommentsPaginated = async (
    novelId: number,
    sortBy: string = 'newest',
    limitCount: number = 10,
    lastDoc: any = null
): Promise<{ comments: Comment[], lastVisible: any }> => {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            where("novelId", "==", novelId)
        );

        if (sortBy === 'newest') {
            q = query(q, orderBy("createdAt", "desc"));
        } else if (sortBy === 'oldest') {
            q = query(q, orderBy("createdAt", "asc"));
        } else if (sortBy === 'likes_desc') {
            q = query(q, orderBy("likes", "desc"));
        } else if (sortBy === 'dislikes_desc') {
            q = query(q, orderBy("unlikes", "desc"));
        } else {
            q = query(q, orderBy("createdAt", "desc"));
        }

        if (lastDoc) {
            const { startAfter } = await import("firebase/firestore");
            q = query(q, startAfter(lastDoc));
        }

        q = query(q, limit(limitCount));

        const querySnapshot = await getDocs(q);
        const comments = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Comment));

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

        return { comments, lastVisible };
    } catch (error) {
        console.error("Error fetching paginated comments:", error);
        return { comments: [], lastVisible: null };
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
        const api = (await import("@/lib/axios")).default;
        // Backend endpoint: /api/reviews/user/{uid}/comments
        const { data } = await api.get(`/reviews/user/${userId}/comments`);

        // Map backend response 
        // Assuming backend returns a list of comments with SQL field names (PascalCase or camelCase)
        // We map them to the Comment interface expected by the frontend
        return data.data.map((c: any) => ({
            id: c.id.toString(), // SQL ID is likely number
            novelId: c.novelId,
            userId: c.userId,
            userName: c.userName || "Unknown", // Fallbacks
            userImage: c.userImage,
            userFrame: c.userFrame,
            content: c.content,
            parentId: c.parentId ? c.parentId.toString() : null,
            isSpoiler: c.isSpoiler || false,
            likeCount: c.likeCount || 0,
            dislikeCount: c.dislikeCount || 0,
            // Handle Date mapping: SQL usually sends ISO string. Convert to Firestore Timestamp-like object or Date
            // The frontend expects Timestamp object with toDate(), so we mock it or convert if interface allows Date
            // Wait, the interface says 'timestamp: Timestamp'. 
            // We should probably update the interface to allow Date | Timestamp, or convert here.
            // Let's create a partial mock for Timestamp to avoid breaking UI that calls .toDate()
            createdAt: {
                toDate: () => new Date(c.createdAt),
                seconds: new Date(c.createdAt).getTime() / 1000,
                nanoseconds: 0
            }
        }));
    } catch (error) {
        console.error("Error fetching user comments from API:", error);
        return [];
    }
};

export const deleteComment = async (commentId: string, novelId?: number) => {
    try {
        // Get comment to check if it's a top-level comment
        const commentDoc = await getDoc(doc(db, COLLECTION_NAME, commentId));
        const isTopLevel = commentDoc.exists() && !commentDoc.data().parentId;

        await deleteDoc(doc(db, COLLECTION_NAME, commentId));

        // Decrement count only for top-level comments
        if (novelId && isTopLevel) {
            await decrementCommentCount(novelId);
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting comment:", error);
        throw error;
    }
};

export const updateUserIdentityInComments = async (userId: string, userName: string, userImage: string | null, userFrame: string | null) => {
    try {
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const snapshot = await getDocs(q);

        const updatePromises = snapshot.docs.map(doc =>
            updateDoc(doc.ref, { userName, userImage, userFrame })
        );

        await Promise.all(updatePromises);
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error syncing user identity in comments:", error);
        throw error;
    }
};

export const getLatestComments = async (count: number = 5): Promise<Comment[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc"),
            limit(count)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Comment));
    } catch (error) {
        console.error("Error fetching latest comments:", error);
        return [];
    }
};

export const toggleCommentVote = async (
    commentId: string,
    userId: string,
    action: 'like' | 'dislike',
    novelId: number,
    senderName: string,
    senderImage: string | undefined,
    senderFrame: string | undefined
) => {
    try {
        // Fetch senderFrame if not provided (fallback)
        if (!senderFrame) {
            const levelData = await LevelService.getUserLevelData(userId);
            senderFrame = levelData?.selectedFrame;
        }

        const commentRef = doc(db, COLLECTION_NAME, commentId);
        const voteRef = doc(collection(commentRef, COMMENT_VOTES_COLLECTION), userId);

        let result = '';

        await runTransaction(db, async (transaction) => {
            const commentDoc = await transaction.get(commentRef);
            const voteDoc = await transaction.get(voteRef);

            if (!commentDoc.exists()) {
                throw "Comment does not exist!";
            }

            const data = commentDoc.data();
            // Sanitize current counts (treat negative as 0)
            let currentLikeCount = Math.max(0, data.likeCount || 0);
            let currentDislikeCount = Math.max(0, data.dislikeCount || 0);

            if (voteDoc.exists()) {
                const currentAction = voteDoc.data().action;
                if (currentAction === action) {
                    // Remove vote (toggle off)
                    transaction.delete(voteRef);
                    if (action === 'like') currentLikeCount--;
                    else currentDislikeCount--;
                    result = 'removed';
                } else {
                    // Change vote
                    transaction.set(voteRef, { action, votedAt: serverTimestamp() });
                    if (currentAction === 'like') {
                        currentLikeCount--;
                        currentDislikeCount++;
                    } else {
                        currentDislikeCount--;
                        currentLikeCount++;
                    }
                    result = 'changed';
                }
            } else {
                // New vote
                transaction.set(voteRef, { action, votedAt: serverTimestamp() });
                if (action === 'like') currentLikeCount++;
                else currentDislikeCount++;
                result = 'added';
            }

            // Ensure we never go below 0 on write
            transaction.update(commentRef, {
                likeCount: Math.max(0, currentLikeCount),
                dislikeCount: Math.max(0, currentDislikeCount)
            });
        });

        // Notify comment owner (outside transaction)
        if (result === 'added' || result === 'changed') {
            const commentDoc = await getDoc(commentRef);
            if (commentDoc.exists()) {
                const commentData = commentDoc.data() as Comment;
                if (commentData.userId !== userId) {
                    const message = action === 'like'
                        ? `${senderName} yorumunuzu beğendi.`
                        : `${senderName} yorumunuzu beğenmedi.`;

                    await createNotification(
                        commentData.userId,
                        action === 'like' ? 'like' : 'dislike',
                        message,
                        commentId,
                        `/novel/${novelId}`,
                        userId,
                        senderName,
                        senderImage,
                        senderFrame
                    );
                }
            }
        }

        return result;
    } catch (error) {
        console.error("Error toggling vote:", error);
        throw error;
    }
};

export const getUserVoteForComment = async (commentId: string, userId: string): Promise<'like' | 'dislike' | null> => {
    try {
        const voteRef = doc(db, COLLECTION_NAME, commentId, COMMENT_VOTES_COLLECTION, userId);
        const voteDoc = await getDoc(voteRef);
        if (voteDoc.exists()) {
            return voteDoc.data().action as 'like' | 'dislike';
        }
        return null;
    } catch (error) {
        console.error("Error checking user vote:", error);
        return null;
    }
};
