
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
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

    const isGoogleUser = user.providerData.some(provider => provider.providerId === 'google.com');

    const hasChanges = displayName !== (user.displayName || "") || photoURL !== (user.photoURL || "");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Profili Düzenle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Profili Düzenle</DialogTitle>
                    <DialogDescription>
                        Profil bilgilerinizi buradan güncelleyebilirsiniz.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateProfile} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Görünen İsim</Label>
                        <Input
                            id="name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Adınız Soyadınız"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="photo">Avatar URL</Label>
                        <Input
                            id="photo"
                            value={photoURL}
                            onChange={(e) => setPhotoURL(e.target.value)}
                            placeholder="https://..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Resim bağlantısı yapıştırın. Boş bırakırsanız baş harfiniz kullanılır.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>E-posta</Label>
                        <Input value={user.email || ""} disabled className="bg-muted" />
                    </div>

                    {isGoogleUser && (
                        <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Google Hesabı</AlertTitle>
                            <AlertDescription className="text-xs">
                                Google ile giriş yaptığınız için şifre işlemleriniz Google tarafından yönetilir.
                                Ancak dilerseniz aşağıdan bir şifre belirleyerek, hem Google hem de şifre ile giriş yapabilirsiniz.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="pt-2 border-t border-border mt-4">
                        <Button type="button" variant="outline" onClick={handlePasswordReset} className="w-full gap-2 text-muted-foreground hover:text-foreground">
                            <Send className="h-3 w-3" />
                            Şifre Değiştirme/Belirleme Bağlantısı Gönder
                        </Button>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="submit" disabled={loading || !hasChanges}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Değişiklikleri Kaydet
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
