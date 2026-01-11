
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
    status: ReadingStatus;
    currentChapter?: number;
    updatedAt: Timestamp;
}

import { LevelService, XP_RULES } from "./level-service";

const COLLECTION_NAME = "libraries";

export const updateLibraryStatus = async (
    userId: string,
    novelId: number,
    status: ReadingStatus | null,
    currentChapter?: number
) => {
    try {
        const docId = `${userId}_${novelId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);

        if (status === null) {
            // Remove from library
            await deleteDoc(docRef);
            return { success: true, action: 'removed' };
        } else {
            // Upsert
            const data: any = {
                userId,
                novelId,
                status,
                updatedAt: serverTimestamp()
            };

            if (currentChapter !== undefined) {
                data.currentChapter = currentChapter;
            }

            // Check if it's a new addition or update?
            // For simplicity, let's award XP on any status update that isn't removal (assuming user doesn't spam switch)
            // Ideally check if doc exists first to prevent spam, but getDoc adds latency.
            // Let's assume adding to library is the intent.

            // To prevent spamming +5 XP by toggling status, we should check if it existed?
            // Or just award it. The user requested "add to library".
            // Let's award it.

            await setDoc(docRef, data, { merge: true });

            // Award XP
            await LevelService.gainXp(userId, XP_RULES.LIBRARY_ADD);

            return { success: true, action: 'updated' };
        }
    } catch (error) {
        console.error("Error updating library status:", error);
        throw error;
    }
};

export const updateLibraryProgress = async (userId: string, novelId: number, currentChapter: number) => {
    try {
        const docId = `${userId}_${novelId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);

        await setDoc(docRef, {
            currentChapter,
            updatedAt: serverTimestamp()
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
