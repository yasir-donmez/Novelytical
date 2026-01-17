
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp,
    orderBy
} from "firebase/firestore";

export type ReadingStatus = 'reading' | 'completed' | 'plan_to_read';

export interface LibraryItem {
    id: string; // usually composite userId_novelId or auto-id
    userId: string;
    novelId: number;
    slug?: string; // Optional for backward compatibility
    status: ReadingStatus;
    currentChapter?: number;
    updatedAt: Timestamp;
}

import { LevelService, XP_RULES } from "./level-service";
import { incrementLibraryCount, decrementLibraryCount } from "./novel-stats-service";

const COLLECTION_NAME = "libraries";

export const updateLibraryStatus = async (
    userId: string,
    novelId: number,
    slug: string, // New required param for slug
    status: ReadingStatus | null,
    currentChapter?: number,
    userInfo?: { displayName?: string; photoURL?: string }
) => {
    try {
        const docId = `${userId}_${novelId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);

        if (status === null) {
            // Check if existed before removing
            const existingDoc = await getDoc(docRef);
            const existed = existingDoc.exists();

            // Remove from library
            await deleteDoc(docRef);

            // Decrement count only if it actually existed
            if (existed) {
                await decrementLibraryCount(novelId);
            }

            return { success: true, action: 'removed' };
        } else {
            // Upsert
            const data: any = {
                userId,
                novelId,
                slug, // Save slug
                status,
                updatedAt: serverTimestamp(),
                ...userInfo
            };

            if (currentChapter !== undefined) {
                data.currentChapter = currentChapter;
            }

            // Check if this is a new addition (for stats tracking)
            const existingDoc = await getDoc(docRef);
            const isNewAddition = !existingDoc.exists();

            await setDoc(docRef, data, { merge: true });

            // Award XP
            await LevelService.gainXp(userId, XP_RULES.LIBRARY_ADD);

            // Increment library count only for new additions
            if (isNewAddition) {
                await incrementLibraryCount(novelId);
            }

            return { success: true, action: isNewAddition ? 'added' : 'updated' };
        }
    } catch (error) {
        console.error("Error updating library status:", error);
        throw error;
    }
};

export const updateLibraryProgress = async (userId: string, novelId: number, currentChapter: number, userInfo?: { displayName?: string; photoURL?: string }) => {
    try {
        const docId = `${userId}_${novelId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);

        await setDoc(docRef, {
            currentChapter,
            updatedAt: serverTimestamp(),
            ...userInfo // Merge user info
        }, { merge: true }); // Merge ensures we don't overwrite status

        return { success: true };
    } catch (error) {
        console.error("Error updating library progress:", error);
        throw error;
    }
};

export const getLibraryItem = async (userId: string, novelId: number): Promise<LibraryItem | null> => {
    try {
        const docId = `${userId}_${novelId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as LibraryItem;
        }
        return null;
    } catch (error) {
        console.error("Error fetching library item:", error);
        return null;
    }
};

export const getUserLibrary = async (userId: string, statusFilter?: ReadingStatus): Promise<LibraryItem[]> => {
    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId)
        );

        if (statusFilter) {
            q = query(q, where("status", "==", statusFilter));
        }

        // Apply sorting manually later or add composite index if needed
        // For now, let's just get them. If we need sorting by date, we might need composite index

        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as LibraryItem));

        // Sort in memory by updatedAt desc
        return items.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis() || 0;
            const timeB = b.updatedAt?.toMillis() || 0;
            return timeB - timeA;
        });

    } catch (error) {
        console.error("Error fetching user library:", error);
        return [];
    }
};
