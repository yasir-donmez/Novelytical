
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    getDocs,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    updateDoc,
    doc,
    increment,
    getDoc,
    setDoc,
    limit,
    deleteDoc,
    where,
    runTransaction
} from "firebase/firestore";
import { LevelService, XP_RULES } from "./level-service";

const COLLECTION_NAME = "community_posts";
const VOTES_COLLECTION = "post_votes"; // To track user votes on polls

export const getUserPollVotes = async (userId: string): Promise<Record<string, number>> => {
    try {
        const q = query(
            collection(db, VOTES_COLLECTION),
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        const votes: Record<string, number> = {};

        querySnapshot.forEach(doc => {
            const data = doc.data();
            // userId is already part of the query, so we just need postId and optionId
            // The doc ID is `${postId}_${userId}`, so we can extract postId from there or assume data has it
            // Let's rely on the doc ID format since we constructed it
            const postId = doc.id.split('_')[0];
            if (data.optionId !== null && data.optionId !== undefined) {
                votes[postId] = data.optionId;
            }
        });

        return votes;
    } catch (error) {
        console.error("Error fetching user votes:", error);
        return {};
    }
};

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
    userFrame?: string; // Added userFrame
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


export const getPostsPaginated = async (
    limitCount: number = 10,
    lastDoc: any = null
): Promise<{ posts: Post[], lastVisible: any }> => {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc")
        );

        if (lastDoc) {
            const { startAfter } = await import("firebase/firestore");
            q = query(q, startAfter(lastDoc));
        }

        q = query(q, limit(limitCount));

        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

        return { posts, lastVisible };
    } catch (error) {
        console.error("Error fetching paginated posts:", error);
        return { posts: [], lastVisible: null };
    }
};

export const subscribeToLatestPosts = (count: number = 20, callback: (posts: Post[], lastVisible: any) => void, onError?: (error: any) => void) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc"),
        limit(count)
    );

    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        callback(posts, lastVisible);
    }, (error) => {
        console.error("Error in post subscription:", error);
        if (onError) onError(error);
    });
};

export const createPost = async (
    userId: string,
    userName: string,
    userImage: string | undefined,
    userFrame: string | undefined, // Added userFrame
    content: string,
    type: 'text' | 'poll' = 'text',
    pollOptions: Omit<PollOption, 'votes'>[] = []
) => {
    try {
        const postData: any = {
            userId,
            userName,
            userImage,
            userFrame: userFrame || null, // Store userFrame
            content,
            type,
            createdAt: serverTimestamp()
        };

        if (type === 'poll' && pollOptions.length > 0) {
            postData.pollOptions = pollOptions.map((opt, index) => ({
                id: opt.id ?? index,
                text: opt.text,
                votes: 0,
                ...(opt.novelId && { novelId: opt.novelId }),
                ...(opt.novelTitle && { novelTitle: opt.novelTitle }),
                ...(opt.novelCover && { novelCover: opt.novelCover })
            }));

            // Polls expire after 24 hours
            const now = new Date();
            const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            postData.expiresAt = Timestamp.fromDate(expiryDate);
        }

        await addDoc(collection(db, COLLECTION_NAME), postData);

        // Award XP
        await LevelService.gainXp(userId, XP_RULES.COMMUNITY_POST);

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

export const votePoll = async (postId: string, optionId: number, userId: string, userName?: string, userImage?: string, userFrame?: string) => {
    try {
        const voteId = `${postId}_${userId}`;
        const voteRef = doc(db, VOTES_COLLECTION, voteId);
        const postRef = doc(db, COLLECTION_NAME, postId);

        const result = await runTransaction(db, async (transaction) => {
            // 1. Check if user already voted
            const voteDoc = await transaction.get(voteRef);

            // 2. Fetch post to verify expiry & options
            const postSnap = await transaction.get(postRef);
            if (!postSnap.exists()) throw new Error("Anket bulunamadı");

            const post = postSnap.data() as Post;
            if (post.expiresAt) {
                const now = new Date();
                const expiryDate = post.expiresAt.toDate();
                if (expiryDate < now) {
                    throw new Error("Bu anket kapanmıştır. Oy kullanılamaz.");
                }
            }
            if (!post.pollOptions) throw new Error("Not a poll");

            let action = '';

            if (voteDoc.exists()) {
                const currentOptionId = voteDoc.data().optionId;

                if (currentOptionId === optionId) {
                    // Case A: UNVOTE (Toggle off)
                    // Decrement vote count
                    const newOptions = post.pollOptions.map(opt => {
                        if (opt.id === optionId) {
                            return { ...opt, votes: Math.max(0, opt.votes - 1) };
                        }
                        return opt;
                    });

                    transaction.update(postRef, { pollOptions: newOptions });
                    transaction.delete(voteRef);
                    action = 'removed';

                } else {
                    // Case B: CHANGE VOTE
                    // Decrement old, Increment new
                    const newOptions = post.pollOptions.map(opt => {
                        if (opt.id === currentOptionId) {
                            return { ...opt, votes: Math.max(0, opt.votes - 1) };
                        }
                        if (opt.id === optionId) {
                            return { ...opt, votes: opt.votes + 1 };
                        }
                        return opt;
                    });

                    transaction.update(postRef, { pollOptions: newOptions });
                    transaction.update(voteRef, {
                        optionId: optionId,
                        createdAt: serverTimestamp() // Update timestamp on change
                    });
                    action = 'changed';
                }
            } else {
                // Case C: NEW VOTE
                const newOptions = post.pollOptions.map(opt => {
                    if (opt.id === optionId) {
                        return { ...opt, votes: opt.votes + 1 };
                    }
                    return opt;
                });

                transaction.update(postRef, { pollOptions: newOptions });
                transaction.set(voteRef, {
                    postId,
                    userId,
                    userName: userName || 'Anonim',
                    userImage,
                    userFrame: userFrame || null, // Added userFrame
                    optionId,
                    createdAt: serverTimestamp()
                });
                action = 'voted';
            }

            return { success: true, action };
        });

        return result;

    } catch (error: any) {
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
    userFrame?: string; // Added userFrame
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
                userFrame: data.userFrame, // Added userFrame
                optionId: data.optionId
            } as VoteInfo;
        });
    } catch (error) {
        console.error("Error fetching voters:", error);
        return [];
    }
};

export const getUserCreatedPolls = async (userId: string): Promise<Post[]> => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            where("type", "==", "poll"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));
    } catch (error) {
        console.error("Error fetching user created polls:", error);
        return [];
    }
};

export const updateUserIdentityInCommunityPosts = async (userId: string, userName: string, userImage: string | null, userFrame: string | null) => {
    try {
        const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const snapshot = await getDocs(q);

        const updatePromises = snapshot.docs.map(doc =>
            updateDoc(doc.ref, { userName, userImage, userFrame })
        );

        await Promise.all(updatePromises);
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error syncing user identity in posts:", error);
        throw error;
    }
};

