"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserService, NotificationSettings } from "@/services/user-service";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Bell, Mail, Smartphone, Loader2, Clock } from "lucide-react";

export default function NotificationsForm() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    const [settings, setSettings] = useState<NotificationSettings>({
        emailReplies: true,
        emailMentions: true,
        emailUpdates: false,
        pushReplies: true,
        pushNewChapters: true,
        pushFollows: true,
        retentionPeriod: 'forever'
    });

    useEffect(() => {
        if (!user) return;
        const loadSettings = async () => {
            try {
                const data = await UserService.getNotificationSettings(user.uid);
                if (data) {
                    setSettings(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setPageLoading(false);
            }
        };
        loadSettings();
    }, [user]);

    const handleToggle = (key: keyof NotificationSettings) => {
        if (key === 'retentionPeriod') return;
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (user) {
                await UserService.updateNotificationSettings(user.uid, settings);
                toast.success("Bildirim tercihleri güncellendi.");
            }
        } catch (error) {
            toast.error("Ayarlar kaydedilemedi.");
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">Bildirim Tercihleri</h3>
                    <p className="text-sm text-muted-foreground">Hangi konularda bildirim almak istediğinizi seçin.</p>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-6 space-y-8">
                    {/* Email Notifications */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary pb-2 border-b border-white/5">
                            <Mail className="h-4 w-4" />
                            <h4 className="text-sm font-semibold">E-posta Bildirimleri</h4>
                        </div>

                        <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="emailReplies" className="flex flex-col gap-1">
                                    <span>Yorum Yanıtları</span>
                                    <span className="font-normal text-xs text-muted-foreground">Biri yorumunuza cevap verdiğinde e-posta al.</span>
                                </Label>
                                <Switch
                                    id="emailReplies"
                                    checked={settings.emailReplies}
                                    onCheckedChange={() => handleToggle('emailReplies')}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="emailMentions" className="flex flex-col gap-1">
                                    <span>Bahsetmeler (@mention)</span>
                                    <span className="font-normal text-xs text-muted-foreground">Biri sizden bahsettiğinde e-posta al.</span>
                                </Label>
                                <Switch
                                    id="emailMentions"
                                    checked={settings.emailMentions}
                                    onCheckedChange={() => handleToggle('emailMentions')}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="emailUpdates" className="flex flex-col gap-1">
                                    <span>Sistem Güncellemeleri</span>
                                    <span className="font-normal text-xs text-muted-foreground">Novelytical güncellemeleri hakkında e-posta al.</span>
                                </Label>
                                <Switch
                                    id="emailUpdates"
                                    checked={settings.emailUpdates}
                                    onCheckedChange={() => handleToggle('emailUpdates')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Push / In-App Notifications */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 text-primary pb-2 border-b border-white/5">
                            <Bell className="h-4 w-4" />
                            <h4 className="text-sm font-semibold">Uygulama İçi Bildirimler</h4>
                        </div>

                        <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pushReplies" className="flex flex-col gap-1">
                                    <span>Yorum ve Etkileşimler</span>
                                    <span className="font-normal text-xs text-muted-foreground">Beğeni ve yanıt bildirimi al.</span>
                                </Label>
                                <Switch
                                    id="pushReplies"
                                    checked={settings.pushReplies}
                                    onCheckedChange={() => handleToggle('pushReplies')}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pushNewChapters" className="flex flex-col gap-1">
                                    <span>Yeni Bölümler</span>
                                    <span className="font-normal text-xs text-muted-foreground">Takip ettiğin romanlara yeni bölüm eklenince bildir.</span>
                                </Label>
                                <Switch
                                    id="pushNewChapters"
                                    checked={settings.pushNewChapters}
                                    onCheckedChange={() => handleToggle('pushNewChapters')}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pushFollows" className="flex flex-col gap-1">
                                    <span>Yeni Takipçiler</span>
                                    <span className="font-normal text-xs text-muted-foreground">Biri sizi takip ettiğinde bildirim al.</span>
                                </Label>
                                <Switch
                                    id="pushFollows"
                                    checked={settings.pushFollows}
                                    onCheckedChange={() => handleToggle('pushFollows')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Retention Settings */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 text-primary pb-2 border-b border-white/5">
                            <Clock className="h-4 w-4" />
                            <h4 className="text-sm font-semibold">Bildirim Geçmişi</h4>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="retention" className="flex flex-col gap-1">
                                <span>Bildirim Saklama Süresi</span>
                                <span className="font-normal text-xs text-muted-foreground">Okunmuş bildirimler ne kadar süre saklansın?</span>
                            </Label>
                            <Select
                                value={settings.retentionPeriod}
                                onValueChange={(val: any) => setSettings(prev => ({ ...prev, retentionPeriod: val }))}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Süre seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 Gün</SelectItem>
                                    <SelectItem value="30">30 Gün</SelectItem>
                                    <SelectItem value="90">3 Ay</SelectItem>
                                    <SelectItem value="forever">Süresiz (Kalıcı)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
                <Button type="submit" disabled={loading} className="min-w-[150px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tercihleri Kaydet
                </Button>
            </div>
        </form>
    );
}
