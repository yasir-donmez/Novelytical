"use client";

import { useEffect, useState } from "react";
import { UserService, UserProfile } from "@/services/user-service";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LEVEL_FRAMES } from "@/services/level-service";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DeveloperCard() {
    const [devProfile, setDevProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDev = async () => {
            try {
                // Fetch Yasir's profile by username
                const uid = await UserService.getUserIdByUsername("ZuGaiKoTsu");
                if (uid) {
                    const profile = await UserService.getUserProfile(uid);
                    setDevProfile(profile);
                }
            } catch (error) {
                console.error("Failed to fetch developer profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDev();
    }, []);

    if (loading) {
        return (
            <div className="p-6 rounded-xl border bg-card animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted rounded"></div>
                        <div className="h-3 w-48 bg-muted rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!devProfile) {
        // Fallback if not found (Static)
        return (
            <div className="p-6 rounded-xl border bg-card">
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                        Y
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Yasir</h3>
                        <p className="text-sm text-muted-foreground mb-3">Öğrenci & Meraklı Geliştirici</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Yazılım geliştirmeyi öğrenen, yapay zeka ve web teknolojilerine ilgi duyan bir öğrenciyim.
                            Bu proje, öğrenme sürecimin bir parçası ve aynı zamanda roman okuma hobimin dijital bir yansıması.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const frameId = devProfile.frame || 'default';
    const frameObj = LEVEL_FRAMES.find(f => f.id === frameId) || LEVEL_FRAMES[0];

    return (
        <Link href={`/profile/${devProfile.uid}`} className="block transition-transform hover:scale-[1.01]">
            <div className="p-6 rounded-xl border bg-card hover:bg-muted/50 transition-colors group relative overflow-hidden">

                <div className="flex items-start gap-4 relative z-10">
                    <UserAvatar
                        src={devProfile.photoURL}
                        alt={devProfile.username}
                        frameId={frameId}
                        size="xl"
                        className="h-16 w-16"
                    />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{devProfile.username}</h3>
                            {frameObj.id !== 'default' && (
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border bg-background/50 backdrop-blur-sm", frameObj.color)}>
                                    {frameObj.name}
                                </span>
                            )}
                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 font-medium">Kurucu & Geliştirici</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Yazılım geliştirmeyi öğrenen, yapay zeka ve web teknolojilerine ilgi duyan bir öğrenciyim.
                            Bu proje, öğrenme sürecimin bir parçası ve aynı zamanda roman okuma hobimin dijital bir yansıması.
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
}
