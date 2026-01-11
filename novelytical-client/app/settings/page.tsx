"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Shield } from "lucide-react";
import ProfileForm from "@/components/settings/profile-form";
import AppearanceForm from "@/components/settings/appearance-form";
import AccountForm from "@/components/settings/account-form";
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
        <div className="min-h-screen pt-24 pb-12 bg-background">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="bg-white/5 dark:bg-zinc-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-lg">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold">Ayarlar</h1>
                        <p className="text-muted-foreground mt-2">Profilinizi ve uygulama tercihlerinizi yönetin.</p>
                    </div>

                    <Tabs defaultValue="profile" className="space-y-6">
                        <TabsList className="bg-black/20 p-1 border border-white/5 w-full justify-start overflow-x-auto">
                            <TabsTrigger value="profile" className="gap-2 px-6">
                                <User className="h-4 w-4" /> Profil
                            </TabsTrigger>
                            <TabsTrigger value="appearance" className="gap-2 px-6">
                                <Palette className="h-4 w-4" /> Görünüm
                            </TabsTrigger>
                            <TabsTrigger value="account" className="gap-2 px-6">
                                <Shield className="h-4 w-4" /> Hesap
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="profile" className="animate-in fade-in-50 slide-in-from-left-2 duration-300 focus-visible:outline-none">
                                <ProfileForm />
                            </TabsContent>

                            <TabsContent value="appearance" className="animate-in fade-in-50 slide-in-from-left-2 duration-300 focus-visible:outline-none">
                                <AppearanceForm />
                            </TabsContent>

                            <TabsContent value="account" className="animate-in fade-in-50 slide-in-from-left-2 duration-300 focus-visible:outline-none">
                                <AccountForm />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
