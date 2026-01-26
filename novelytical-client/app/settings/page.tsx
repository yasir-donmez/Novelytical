"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Bell, Users } from "lucide-react";
import ProfileForm from "@/components/settings/profile-form";
import ConnectionsForm from "@/components/settings/connections-form";
import AccountForm from "@/components/settings/account-form";
import NotificationsForm from "@/components/settings/notifications-form";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login?redirect=/settings");
        }
    }, [user, loading, router]);

    if (loading) return null; // Or a skeleton
    if (!user) return null;

    return (
        <div className="min-h-screen pb-12 bg-background pt-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500/50 via-purple-500/50 to-amber-500/50"></div>
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold">Ayarlar</h1>
                        <p className="text-muted-foreground mt-2">Profilinizi ve uygulama tercihlerinizi yönetin.</p>
                    </div>

                    <Tabs defaultValue="profile" className="space-y-6">
                        <TabsList className="w-full grid w-full grid-cols-4 bg-zinc-900/50 p-1 mb-6">
                            <TabsTrigger value="profile" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400 gap-2">
                                <User className="h-4 w-4 md:block hidden" />
                                <span className="hidden sm:inline">Profil</span>
                                <span className="sm:hidden">Profil</span>
                            </TabsTrigger>
                            <TabsTrigger value="connections" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-purple-400 gap-2">
                                <Users className="h-4 w-4 md:block hidden" />
                                <span className="hidden sm:inline">Bağlantılar</span>
                                <span className="sm:hidden">Bağ</span>
                            </TabsTrigger>
                            <TabsTrigger value="account" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-green-400 gap-2">
                                <Shield className="h-4 w-4 md:block hidden" />
                                <span className="hidden sm:inline">Hesap</span>
                                <span className="sm:hidden">Hesap</span>
                            </TabsTrigger>
                            <TabsTrigger value="notifications" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-400 gap-2">
                                <Bell className="h-4 w-4 md:block hidden" />
                                <span className="hidden sm:inline">Bildirimler</span>
                                <span className="sm:hidden">Bild.</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="profile" className="animate-in fade-in-50 slide-in-from-left-2 duration-300 focus-visible:outline-none">
                                <ProfileForm />
                            </TabsContent>

                            <TabsContent value="connections" className="animate-in fade-in-50 slide-in-from-left-2 duration-300 focus-visible:outline-none">
                                <ConnectionsForm />
                            </TabsContent>

                            <TabsContent value="account" className="animate-in fade-in-50 slide-in-from-left-2 duration-300 focus-visible:outline-none">
                                <AccountForm />
                            </TabsContent>

                            <TabsContent value="notifications" className="animate-in fade-in-50 slide-in-from-left-2 duration-300 focus-visible:outline-none">
                                <NotificationsForm />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
