
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    getDocs,
    serverTimestamp,
    Timestamp,
    updateDoc,
    doc,
    increment,
    getDoc,
    setDoc,
    limit,
    deleteDoc,
    where
} from "firebase/firestore";

const COLLECTION_NAME = "community_posts";
const VOTES_COLLECTION = "post_votes"; // To track user votes on polls

export interface PollOption {
    id: number;
    text: string;
    votes: number;
    novelId?: string;      // For book options
    novelTitle?: string;   // Book title
    novelCover?: string;   // Book cover URL
}

export interface Post {
    id: string;
    userId: string;
    userName: string;
    userImage?: string;
    content: string;
    type: 'text' | 'poll';
    pollOptions?: PollOption[];
    createdAt: Timestamp;
    expiresAt?: Timestamp; // For 24-hour poll expiration
    userVote?: number;     // Optional: ID of the option the current user voted for
}

export const getLatestPosts = async (count: number = 20): Promise<Post[]> => {
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
        } as Post));
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
};

export const createPost = async (
    userId: string,
    userName: string,
    userImage: string | undefined,
    content: string,
    type: 'text' | 'poll' = 'text',
    pollOptions: string[] = []
) => {
    try {
        const postData: any = {
            userId,
            userName,
            userImage,
            content,
            type,
            createdAt: serverTimestamp()
        };

        if (type === 'poll' && pollOptions.length > 0) {
            postData.pollOptions = pollOptions.map((opt, index) => ({
                id: index,
                text: opt,
                votes: 0
            }));

            // Polls expire after 24 hours
            const now = new Date();
            const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            postData.expiresAt = Timestamp.fromDate(expiryDate);
        }

        await addDoc(collection(db, COLLECTION_NAME), postData);
        return { success: true };
    } catch (error) {
        console.error("Error creating post:", error);
        throw error;
    }
};

export const deletePost = async (postId: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, postId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
};

export const votePoll = async (postId: string, optionId: number, userId: string, userName?: string, userImage?: string) => {
    try {
        const voteId = `${postId}_${userId}`;
        const voteRef = doc(db, VOTES_COLLECTION, voteId);
        const postRef = doc(db, COLLECTION_NAME, postId);

        const voteDoc = await getDoc(voteRef);

        if (voteDoc.exists()) {
            const existingVote = voteDoc.data();

            // If clicking the same option, remove the vote
            if (existingVote.optionId === optionId) {
                return await removeVote(postId, userId);
            }

            // If clicking a different option, change the vote
            return await changeVote(postId, existingVote.optionId, optionId, userId);
        }

        // First time voting
        await setDoc(voteRef, {
            postId,
            userId,
            optionId,
            userName,
            userImage,
            createdAt: serverTimestamp()
        });

        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) throw new Error("Post not found");

        const post = postSnap.data() as Post;
        if (!post.pollOptions) throw new Error("Not a poll");

        const newOptions = post.pollOptions.map(opt => {
            if (opt.id === optionId) {
                return { ...opt, votes: opt.votes + 1 };
            }
            return opt;
        });

        await updateDoc(postRef, { pollOptions: newOptions });

        return { success: true, action: 'voted' };
    } catch (error) {
        console.error("Error voting:", error);
        throw error;
    }
};

export const changeVote = async (postId: string, oldOptionId: number, newOptionId: number, userId: string) => {
    try {
        const voteId = `${postId}_${userId}`;
        const voteRef = doc(db, VOTES_COLLECTION, voteId);
        const postRef = doc(db, COLLECTION_NAME, postId);

        // Update vote record
        await updateDoc(voteRef, {
            optionId: newOptionId,
            createdAt: serverTimestamp()
        });

        // Update poll options: -1 from old, +1 to new
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) throw new Error("Post not found");

        const post = postSnap.data() as Post;
        if (!post.pollOptions) throw new Error("Not a poll");

        const newOptions = post.pollOptions.map(opt => {
            if (opt.id === oldOptionId) {
                return { ...opt, votes: Math.max(0, opt.votes - 1) };
            }
            if (opt.id === newOptionId) {
                return { ...opt, votes: opt.votes + 1 };
            }
            return opt;
        });

        await updateDoc(postRef, { pollOptions: newOptions });

        return { success: true, action: 'changed' };
    } catch (error) {
        console.error("Error changing vote:", error);
        throw error;
    }
};

export const removeVote = async (postId: string, userId: string) => {
    try {
        const voteId = `${postId}_${userId}`;
        const voteRef = doc(db, VOTES_COLLECTION, voteId);
        const postRef = doc(db, COLLECTION_NAME, postId);

        // Get the vote to know which option to decrement
        const voteDoc = await getDoc(voteRef);
        if (!voteDoc.exists()) throw new Error("Vote not found");

        const vote = voteDoc.data();
        const optionId = vote.optionId;

        // Delete vote record
        await updateDoc(voteRef, {
            optionId: null
        });

        // Update poll option: -1 vote
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) throw new Error("Post not found");

        const post = postSnap.data() as Post;
        if (!post.pollOptions) throw new Error("Not a poll");

        const newOptions = post.pollOptions.map(opt => {
            if (opt.id === optionId) {
                return { ...opt, votes: Math.max(0, opt.votes - 1) };
            }
            return opt;
        });

        await updateDoc(postRef, { pollOptions: newOptions });

        return { success: true, action: 'removed' };
    } catch (error) {
        console.error("Error removing vote:", error);
        throw error;
    }
};

// Toggle save/bookmark post
export async function toggleSavePost(userId: string, postId: string) {
    const saveRef = doc(db, "users", userId, "saved_posts", postId);
    const saveSnap = await getDoc(saveRef);

    if (saveSnap.exists()) {
        await deleteDoc(saveRef);
        return { action: 'unsaved' };
    } else {
        await setDoc(saveRef, {
            postId,
            savedAt: serverTimestamp()
        });
        return { action: 'saved' };
    }
}

// Get user's saved posts IDs
export async function getUserSavedPostIds(userId: string): Promise<string[]> {
    const q = query(collection(db, "users", userId, "saved_posts"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.id);
}

// Get full post objects for saved posts
export async function getSavedPostsData(userId: string): Promise<Post[]> {
    const savedIds = await getUserSavedPostIds(userId);
    if (savedIds.length === 0) return [];

    const posts: Post[] = [];
    const promises = savedIds.map(async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Post;
            }
        } catch (e) {
            console.error(`Failed to fetch saved post ${id}`, e);
        }
        return null;
    });

    const results = await Promise.all(promises);
    return results.filter((p): p is Post => p !== null);
}

export interface VoteInfo {
    userId: string;
    userName?: string;
    userImage?: string;
    optionId: number;
}

export const getPollVoters = async (postId: string): Promise<VoteInfo[]> => {
    try {
        const q = query(
            collection(db, VOTES_COLLECTION),
            where("postId", "==", postId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                userId: data.userId,
                userName: data.userName,
                userImage: data.userImage,
                optionId: data.optionId
            } as VoteInfo;
        });
    } catch (error) {
        console.error("Error fetching voters:", error);
        return [];
    }
};

