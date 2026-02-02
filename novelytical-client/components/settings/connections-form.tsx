"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShieldCheck, Lock, MessageCircle, Users } from "lucide-react";
import { FollowService } from "@/services/follow-service";
import { FollowListDialog } from "@/components/profile/follow-list-dialog";

export default function ConnectionsForm() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showFollowDialog, setShowFollowDialog] = useState(false);

    // Stats
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const [privacy, setPrivacy] = useState({
        allowMessagesFromNonFollowers: false,
        privateProfile: false,
        showOnlineStatus: true,
        restrictContentToMutuals: false,
        hideLibrary: false
    });

    // Load real settings & stats on mount
    useEffect(() => {
        if (!user) return;

        let unsubFollowers: () => void;
        let unsubFollowing: () => void;

        const loadSettings = async () => {
            try {
                const profile = await import("@/services/user-service").then(m => m.UserService.getUserProfile(user.uid));
                if (profile?.privacySettings) {
                    setPrivacy({
                        ...profile.privacySettings,
                        restrictContentToMutuals: profile.privacySettings.restrictContentToMutuals || false,
                        hideLibrary: profile.privacySettings.hideLibrary || false
                    });
                }

                // Subscribe to stats
                unsubFollowers = FollowService.subscribeToFollowerCount(user.uid, setFollowerCount);
                unsubFollowing = FollowService.subscribeToFollowingCount(user.uid, setFollowingCount);

            } catch (error) {
                console.error(error);
            }
        };
        loadSettings();

        return () => {
            if (unsubFollowers) unsubFollowers();
            if (unsubFollowing) unsubFollowing();
        };
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (!user) return;
        try {
            await import("@/services/user-service").then(m => m.UserService.updatePrivacySettings(user.uid, privacy));
            toast.success("Gizlilik ayarları güncellendi.");
        } catch (error) {
            toast.error("Ayarlar kaydedilemedi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Bağlantı & Gizlilik</h3>
                <p className="text-sm text-muted-foreground">Hesabınızın görünürlüğünü ve kimlerin sizinle iletişime geçebileceğini yönetin.</p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-6 space-y-8">

                {/* Profile Privacy */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary pb-2 border-b border-white/5">
                        <Lock className="h-4 w-4" />
                        <h4 className="text-sm font-semibold">Hesap Gizliliği</h4>
                    </div>

                    <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="privateProfile" className="flex flex-col gap-1">
                                <span>Gizli Hesap</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    Hesabınız gizli olduğunda, sadece sizi takip edenler kütüphanenizi ve aktivitelerinizi görebilir.
                                </span>
                            </Label>
                            <Switch
                                id="privateProfile"
                                checked={privacy.privateProfile}
                                onCheckedChange={(c) => setPrivacy(p => ({
                                    ...p,
                                    privateProfile: c,
                                    // If enabling this, disable others
                                    hideLibrary: c ? false : p.hideLibrary,
                                    restrictContentToMutuals: c ? false : p.restrictContentToMutuals
                                }))}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="hideLibrary" className="flex flex-col gap-1">
                                <span>Kütüphanemi Herkesten Gizle</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    Açık olduğunda, kütüphanenizi <b>kimse</b> (takipçileriniz dahil) göremez.
                                </span>
                            </Label>
                            <Switch
                                id="hideLibrary"
                                checked={privacy.hideLibrary || false}
                                onCheckedChange={(c) => setPrivacy(p => ({
                                    ...p,
                                    hideLibrary: c,
                                    // If enabling this, disable others
                                    privateProfile: c ? false : p.privateProfile,
                                    restrictContentToMutuals: c ? false : p.restrictContentToMutuals
                                }))}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="restrictMutuals" className="flex flex-col gap-1">
                                <span>Sadece Karşılıklı Takipler Görebilsin</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    Açık olduğunda, içeriklerinizi sadece sizin de takip ettiğiniz (takipleştiğiniz) kişiler görebilir.
                                </span>
                            </Label>
                            <Switch
                                id="restrictMutuals"
                                checked={privacy.restrictContentToMutuals || false}
                                onCheckedChange={(c) => setPrivacy(p => ({
                                    ...p,
                                    restrictContentToMutuals: c,
                                    // If enabling this, disable others
                                    privateProfile: c ? false : p.privateProfile,
                                    hideLibrary: c ? false : p.hideLibrary
                                }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Messaging */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-primary pb-2 border-b border-white/5">
                        <MessageCircle className="h-4 w-4" />
                        <h4 className="text-sm font-semibold">Mesajlaşma</h4>
                    </div>

                    <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="messages" className="flex flex-col gap-1">
                                <span>Sadece Takip Ettiklerim Mesaj Atabilsin</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    Bu seçenek kapalıysa, sizi takip eden herkes mesaj atabilir (Karşılıklı takip şartı kalkar).
                                </span>
                            </Label>
                            <Switch
                                id="messages"
                                checked={!privacy.allowMessagesFromNonFollowers}
                                onCheckedChange={(c) => setPrivacy(p => ({ ...p, allowMessagesFromNonFollowers: !c }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-primary pb-2 border-b border-white/5">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-sm font-semibold">Durum</h4>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="online" className="flex flex-col gap-1">
                            <span>Çevrimiçi Durumunu Göster</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Diğer kullanıcılar sizin çevrimiçi olup olmadığınızı görebilir.
                            </span>
                        </Label>
                        <Switch
                            id="online"
                            checked={privacy.showOnlineStatus}
                            onCheckedChange={(c) => setPrivacy(p => ({ ...p, showOnlineStatus: c }))}
                        />
                    </div>
                </div>

                {/* Connection Management */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-primary pb-2 border-b border-white/5">
                        <Users className="h-4 w-4" />
                        <h4 className="text-sm font-semibold">Bağlantılar</h4>
                    </div>
                    <div className="flex items-center justify-center sm:justify-between flex-wrap gap-4">
                        <Label className="flex flex-col gap-1">
                            <span>Takipçileri ve Takip Edilenleri Yönet</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Listenizi görüntüleyin, takipçi çıkarın veya takipten çıkın.
                            </span>
                            <div className="flex gap-4 mt-2 text-xs font-medium text-muted-foreground bg-black/20 w-fit px-3 py-1.5 rounded-md border border-white/5">
                                <span><span className="text-foreground font-bold">{followerCount}</span> Takipçi</span>
                                <span className="w-px h-3 bg-white/10 self-center"></span>
                                <span><span className="text-foreground font-bold">{followingCount}</span> Takip Edilen</span>
                            </div>
                        </Label>
                        <Button type="button" variant="outline" onClick={() => setShowFollowDialog(true)}>
                            Listeyi Yönet
                        </Button>
                    </div>
                </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
                <Button type="submit" disabled={loading} className="min-w-[150px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ayarları Kaydet
                </Button>
            </div>

            <FollowListDialog
                userId={user?.uid || ""}
                isOpen={showFollowDialog}
                onClose={() => setShowFollowDialog(false)}
            />
        </form>
    );
}
