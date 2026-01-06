
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { updateUserIdentityInReviews } from "@/services/review-service";
import { updateUserIdentityInComments } from "@/services/comment-service";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, AlertTriangle, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfileEditDialog() {
    const { user } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [photoURL, setPhotoURL] = useState(user?.photoURL || "");

    if (!user) return null;

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateProfile(user, {
                displayName: displayName,
                photoURL: photoURL
            });

            // Sync with past data (Fire and forget, or await if critical)
            // We await to ensure consistency before reload
            await Promise.all([
                updateUserIdentityInReviews(user.uid, displayName, photoURL),
                updateUserIdentityInComments(user.uid, displayName)
            ]);

            toast.success("Profil bilgileriniz ve geçmiş etkileşimleriniz güncellendi.");
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Profil güncellenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!user.email) return;
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast.success("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
        } catch (error) {
            console.error(error);
            toast.error("E-posta gönderilemedi. Lütfen tekrar deneyin.");
        }
    };

    const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
    const isGoogleUser = !!googleProvider;

    const hasChanges = displayName !== (user.displayName || "") || photoURL !== (user.photoURL || "");

    const [avatarSeeds, setAvatarSeeds] = useState<string[]>([]);
    const [currentTab, setCurrentTab] = useState("select");

    const refreshAvatars = () => {
        const newSeeds = Array.from({ length: 9 }, () => Math.random().toString(36).substring(7));
        setAvatarSeeds(newSeeds);
    };

    // Initial load
    useEffect(() => {
        if (open && avatarSeeds.length === 0) {
            refreshAvatars();
        }
    }, [open]);

    const handleAvatarSelect = (seed: string) => {
        const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
        setPhotoURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Profili Düzenle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Profili Düzenle</DialogTitle>
                    <DialogDescription>
                        Profil bilgilerinizi ve avatarınızı güncelleyebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUpdateProfile} className="space-y-6 py-4">

                    {/* 1. Profil Resmi Section First */}
                    <div className="space-y-3">
                        <Label>Profil Resmi</Label>
                        <Tabs defaultValue="select" onValueChange={setCurrentTab} className="w-full">
                            <TabsList className="inline-flex w-full justify-start h-auto p-1 bg-black/5 dark:bg-zinc-800/40 border border-black/5 dark:border-white/10 rounded-lg mb-3">
                                <TabsTrigger value="select" className="flex-1 px-4">Avatar Seç</TabsTrigger>
                                <TabsTrigger value="custom" className="flex-1 px-4">Özel URL</TabsTrigger>
                            </TabsList>

                            {/* Persistent Preview & URL Row - Side by Side */}
                            <div className="flex gap-4 items-start mb-4">
                                <div className="shrink-0">
                                    <div className="h-16 w-16 rounded-full border-2 border-border overflow-hidden bg-muted shadow-sm">
                                        <img
                                            src={photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName}`}
                                            alt="Preview"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Input
                                        value={photoURL}
                                        onChange={(e) => setPhotoURL(e.target.value)}
                                        placeholder="https://..."
                                        className="rounded-lg font-mono text-xs"
                                        readOnly={currentTab === 'select'}
                                        disabled={currentTab === 'select'}
                                    />
                                    {currentTab === 'custom' ? (
                                        <p className="text-[10px] text-muted-foreground">
                                            Herhangi bir resim bağlantısı yapıştırabilirsiniz.
                                        </p>
                                    ) : (
                                        <div className="flex gap-2 mt-1">
                                            {isGoogleUser && googleProvider?.photoURL && googleProvider.photoURL !== photoURL && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPhotoURL(googleProvider.photoURL!)}
                                                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                                                >
                                                    Google Resmine Dön
                                                </button>
                                            )}
                                            {photoURL && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPhotoURL("")}
                                                    className="text-[10px] text-red-500 hover:underline flex items-center gap-1"
                                                >
                                                    Resmi Kaldır
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <TabsContent value="select" className="mt-0 space-y-4 animate-in fade-in-50">
                                <div className="grid grid-cols-3 gap-3 min-h-[200px]">
                                    {avatarSeeds.map((seed, i) => {
                                        const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
                                        const isSelected = photoURL === url;
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => handleAvatarSelect(seed)}
                                                className={`cursor-pointer rounded-xl p-2 border-2 transition-all hover:scale-105 active:scale-95 ${isSelected ? 'border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-500/20' : 'border-transparent bg-muted/50 hover:bg-muted'}`}
                                            >
                                                <div className="aspect-square rounded-lg overflow-hidden bg-white/5">
                                                    <img src={url} alt="Avatar Option" className="w-full h-full object-cover" />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <Button type="button" variant="secondary" onClick={refreshAvatars} className="w-full gap-2 font-medium">
                                    <Loader2 className="h-4 w-4" />
                                    Farklı Karakterler Göster
                                </Button>
                            </TabsContent>

                            <TabsContent value="custom" className="mt-0">
                                {/* Handled by shared input above */}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* 2. Kullanıcı Adı Section Second */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Kullanıcı Adı</Label>
                        <Input
                            id="name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Takma Adınız"
                            className="rounded-lg"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Novel yorumlarında ve değerlendirmelerde bu isim görünecek.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>E-posta</Label>
                        <Input value={user.email || ""} disabled className="bg-muted rounded-lg" />
                    </div>

                    {isGoogleUser && (
                        <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 rounded-lg">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Google Hesabı</AlertTitle>
                            <AlertDescription className="text-xs">
                                Google ile giriş yapıldı. Şifre işlemleri Google üzerinden yönetilir.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="pt-2 border-t border-border mt-4">
                        <Button type="button" variant="outline" onClick={handlePasswordReset} className="w-full gap-2 text-muted-foreground hover:text-foreground">
                            <Send className="h-3 w-3" />
                            Şifre Sıfırlama Bağlantısı Gönder
                        </Button>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="submit" disabled={loading || !hasChanges} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Değişiklikleri Kaydet
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
