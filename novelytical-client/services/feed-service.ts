
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
    limit
} from "firebase/firestore";

const COLLECTION_NAME = "community_posts";
const VOTES_COLLECTION = "post_votes"; // To track user votes on polls

export interface PollOption {
    id: number;
    text: string;
    votes: number;
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
        }

        await addDoc(collection(db, COLLECTION_NAME), postData);
        return { success: true };
    } catch (error) {
        console.error("Error creating post:", error);
        throw error;
    }
};

export const votePoll = async (postId: string, optionId: number, userId: string) => {
    try {
        const voteId = `${postId}_${userId}`;
        const voteRef = doc(db, VOTES_COLLECTION, voteId);
        const postRef = doc(db, COLLECTION_NAME, postId);

        const voteDoc = await getDoc(voteRef);

        if (voteDoc.exists()) {
            // Already voted? Maybe allow changing vote?
            // For simplicity, let's say "One vote per person" and no changing for now, or strict separate logic.
            // Let's prevent double voting for simplicity first.
            throw new Error("Already voted");
        }

        // 1. Record the vote
        await setDoc(voteRef, {
            postId,
            userId,
            optionId,
            createdAt: serverTimestamp()
        });

        // 2. Update post metrics (Requires reading the post to update the specific array item... Firestore array update is tricky for specific index fields)
        // Actually, updating an object inside an array is hard in Firestore.
        // Easier: Read, modify, write back.

        // Transaction would be safer but let's do read-write for prototype speed.
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

        return { success: true };
    } catch (error) {
        console.error("Error voting:", error);
        throw error;
    }
};
