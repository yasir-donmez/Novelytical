"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LevelService, UserLevelData, LEVEL_FRAMES } from "@/services/level-service";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function UserNav() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [levelData, setLevelData] = useState<UserLevelData | null>(null);

    useEffect(() => {
        const fetchLevelData = () => {
            if (user) {
                LevelService.getUserLevelData(user.uid).then(setLevelData);
            }
        };

        fetchLevelData();

        // Listen for profile updates
        window.addEventListener('user-profile-update', fetchLevelData);
        return () => window.removeEventListener('user-profile-update', fetchLevelData);
    }, [user]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            toast.success("Çıkış yapıldı.");
            router.push("/");
        } catch (error) {
            toast.error("Çıkış yapılırken hata oluştu.");
        }
    };

    if (loading) {
        return <div className="h-9 w-9 bg-muted animate-pulse rounded-full" />;
    }

    if (!user) {
        return (
            <Button asChild variant="default" size="sm" className="gap-2">
                <Link href="/login">
                    <User className="h-4 w-4" />
                    Giriş Yap
                </Link>
            </Button>
        );
    }

    const frameId = levelData?.selectedFrame || 'default';
    const frameObj = LEVEL_FRAMES.find(f => f.id === frameId) || LEVEL_FRAMES[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <UserAvatar
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        frameId={levelData?.selectedFrame}
                        className="h-9 w-9"
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName || "Kullanıcı"}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profil')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profilim</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Ayarlar</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Çıkış Yap</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
