import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, increment, arrayUnion } from "firebase/firestore";
import { UserService } from "./user-service";

export interface UserLevelData {
    xp: number;
    level: number;
    selectedFrame?: string;
    unlockedFrames: string[];
}

export interface LevelFrame {
    id: string;
    name: string;
    minLevel: number;
    color: string; // Text color
    cssClass: string; // CSS class for the frame
}

export const LEVEL_FRAMES: LevelFrame[] = [
    { id: 'default', name: 'Çaylak', minLevel: 0, color: 'text-gray-400', cssClass: 'border-2 border-gray-200 dark:border-gray-800' },
    { id: 'bronze', name: 'Acemi', minLevel: 5, color: 'text-amber-700', cssClass: 'frame-bronze' },
    { id: 'silver', name: 'Gezgin', minLevel: 10, color: 'text-slate-400', cssClass: 'frame-silver' },
    { id: 'gold', name: 'Bilge', minLevel: 15, color: 'text-yellow-500', cssClass: 'frame-gold' },
    { id: 'diamond', name: 'Efsane', minLevel: 20, color: 'text-cyan-400', cssClass: 'frame-diamond' },
    { id: 'founder', name: 'Kurucu Üye', minLevel: 0, color: 'text-purple-500', cssClass: 'frame-founder' },
];

export const XP_RULES = {
    LIBRARY_ADD: 5,
    COMMUNITY_POST: 1,
    REVIEW: 20,
    COMMENT: 5, // Detail page comment
};

export class LevelService {

    // Calculate level based on XP (Simple formula: Level = floor(sqrt(XP / 10)))
    // Or constant thresholds. Let's use a linear-ish curve.
    // Level 1: 0-99
    // Level 2: 100-199
    // etc.
    // Let's stick to the prompt's implied difficulty. 
    // To get to Level 5 (Bronze) with 5 XP per book: 
    // If each level is 50 XP -> Level 5 = 250 XP = 50 Books. Reasonable? Maybe too hard.
    // Let's say Level = XP / 25.
    // Level 5 = 125 XP = 25 Books. Better.
    static calculateLevel(xp: number): number {
        return Math.floor(xp / 25) + 1;
    }

    static getLevelProgress(xp: number): { current: number, next: number, percent: number } {
        const level = this.calculateLevel(xp);
        const currentLevelXp = (level - 1) * 25;
        const nextLevelXp = level * 25;
        const xpInCurrentLevel = xp - currentLevelXp;
        const neededForNext = nextLevelXp - currentLevelXp; // Always 25 with this formula

        return {
            current: xpInCurrentLevel,
            next: neededForNext,
            percent: Math.min(100, Math.round((xpInCurrentLevel / neededForNext) * 100))
        };
    }

    static async getUserLevelData(uid: string): Promise<UserLevelData> {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    xp: data.xp || 0,
                    level: data.level || 1,
                    selectedFrame: data.selectedFrame,
                    unlockedFrames: data.unlockedFrames || ['default']
                };
            }
        } catch (error) {
            console.error("Error fetching level data:", error);
        }
        return { xp: 0, level: 1, unlockedFrames: ['default'] };
    }

    static async gainXp(uid: string, amount: number) {
        if (!uid || amount <= 0) return;

        const userRef = doc(db, "users", uid);

        try {
            const userDoc = await getDoc(userRef);
            let currentXp = 0;
            let currentUnlocked: string[] = ['default'];

            if (userDoc.exists()) {
                const data = userDoc.data();
                currentXp = data.xp || 0;
                currentUnlocked = data.unlockedFrames || ['default'];
            } else {
                // Initialize user if not exists (should theoretically exist via auth, but Firestore doc might be missing)
                await setDoc(userRef, { xp: 0, level: 1, unlockedFrames: ['default'], createdAt: new Date() }, { merge: true });
            }

            const newXp = currentXp + amount;
            const newLevel = this.calculateLevel(newXp);

            // Check for new unlocks
            const updates: any = {
                xp: newXp,
                level: newLevel
            };

            const newUnlocks: string[] = [];

            // Check level based frames
            LEVEL_FRAMES.forEach(frame => {
                if (frame.minLevel > 0 && newLevel >= frame.minLevel && !currentUnlocked.includes(frame.id)) {
                    newUnlocks.push(frame.id);
                }
            });

            if (newUnlocks.length > 0) {
                updates.unlockedFrames = arrayUnion(...newUnlocks);
            }

            await updateDoc(userRef, updates);

            return {
                oldLevel: this.calculateLevel(currentXp),
                newLevel,
                levelUp: newLevel > this.calculateLevel(currentXp),
                newUnlocks
            };

        } catch (error) {
            console.error("Error adding XP:", error);
        }
    }

    static async updateSelectedFrame(uid: string, frameId: string) {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, { selectedFrame: frameId });
    }

    static async checkAndGrantFounderBadge(uid: string) {
        // Logic to check if user is among first 50.
        // This is tricky without a counter service or reading all users.
        // For now, let's implement a manual check or a "creationTime" based check if we assume sequential IDs (which we don't have).
        // Alternative: We check a global "stats" doc.

        /* 
           Simulated Logic:
           We will trust the caller (Register page) to verify this or run a Cloud Function.
           Since we are client-side only for now, we can try to check specific hardcoded UIDs or verify via an admin flag.
           
           For this implementation, let's assume we grant it during registration if < 50 users.
           Or let's just create a method to manually grant it for testing.
        */
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            unlockedFrames: arrayUnion('founder')
        });
    }
}
