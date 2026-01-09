"use client";

import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserInteractionList from "@/components/profile/user-interaction-list";
import UserLibraryList from "@/components/profile/user-library-list";
import SavedPollsList from "@/components/profile/saved-polls-list";
import ProfileEditDialog from "@/components/profile/profile-edit-dialog";
import { BookOpen, Mail, CalendarDays, MessageSquare, BarChart2 } from "lucide-react";

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("reviews");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/"); // Redirect to home if not logged in
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!user) return null;

    const joinDate = user.metadata.creationTime
        ? format(new Date(user.metadata.creationTime), "d MMMM yyyy", { locale: tr })
        : "Bilinmiyor";

    const displayName = user.displayName || user.email?.split('@')[0] || "Okur";

    return (
        <div className="min-h-screen pt-24 pb-12 bg-background">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Profile Header */}
                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-lg">
                    <Avatar className="h-24 w-24 md:h-32 md:w-32 ring-4 ring-white/10 shadow-xl">
                        <AvatarImage src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`} />
                        <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-indigo-500 text-white text-3xl font-bold">
                            {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 text-center md:text-left space-y-3">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{displayName}</h1>
                            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                                <Mail size={14} />
                                {user.email}
                            </p>
                            <div className="mt-2 flex justify-center md:justify-start">
                                <ProfileEditDialog />
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-6 text-sm text-foreground/80">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <CalendarDays size={16} className="text-purple-400" />
                                <span>Katılma: <span className="font-semibold text-foreground">{joinDate}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-lg">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                            <BookOpen size={20} />
                        </span>
                        Kütüphanem
                    </h2>
                    <UserLibraryList />
                </div>

                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-16 shadow-lg">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                            <MessageSquare size={20} />
                        </span>
                        Son Etkileşimlerim & Yorumlarım
                    </h2>
                    <UserInteractionList />
                </div>

                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-lg">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-green-500/20 p-2 rounded-lg text-green-400">
                            <BarChart2 size={20} />
                        </span>
                        Kaydettiğim Anketler
                    </h2>
                    <SavedPollsList />
                </div>
            </div>
        </div>
    );
}
