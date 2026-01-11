"use client";

import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { sendPasswordResetEmail, deleteUser as firebaseDeleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserService } from "@/services/user-service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Send } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AccountForm() {
    const { user } = useAuth();
    const [resetLoading, setResetLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    if (!user) return null;

    const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
    const isGoogleUser = !!googleProvider;

    const handlePasswordReset = async () => {
        if (!user.email) return;
        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast.success("Şifre sıfırlama bağlantısı gönderildi.");
        } catch (error) {
            console.error(error);
            toast.error("E-posta gönderilemedi.");
        } finally {
            setResetLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            // Delete from Postgres/CustomDB via Service (if needed)
            // Note: Firebase deletion should cascade or trigger backend cleanup ideally.
            // For now, removing Auth account is the primary step.

            // Re-authentication might be required for sensitive operations in Firebase.
            // If it fails, we catch error and tell user to login again.
            await firebaseDeleteUser(user);
            toast.success("Hesabınız silindi. Üzgünüz!");
        } catch (error: any) {
            if (error.code === 'auth/requires-recent-login') {
                toast.error("Güvenlik nedeniyle tekrar giriş yapmalısınız.");
            } else {
                console.error(error);
                toast.error("Hesap silinemedi.");
            }
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">Şifre ve Güvenlik</h3>
                    <p className="text-sm text-muted-foreground">Hesap güvenliğinizi ve giriş yöntemlerinizi yönetin.</p>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-6">
                    {isGoogleUser ? (
                        <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Google Hesabı</AlertTitle>
                            <AlertDescription>
                                Bu hesap Google ile bağlanmıştır. Şifre işlemleri Google üzerinden yönetilmektedir.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium">Şifre Sıfırlama</h4>
                                <p className="text-sm text-muted-foreground">
                                    E-posta adresinize şifre sıfırlama bağlantısı gönderilir.
                                </p>
                            </div>
                            <Button variant="outline" onClick={handlePasswordReset} disabled={resetLoading}>
                                {resetLoading && <Send className="mr-2 h-4 w-4 animate-spin" />}
                                {!resetLoading && <Send className="mr-2 h-4 w-4" />}
                                Bağlantı Gönder
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
                <div>
                    <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Tehlikeli Bölge</h3>
                    <p className="text-sm text-muted-foreground">
                        Bu işlemler geri alınamaz ve veri kaybına neden olabilir.
                    </p>
                </div>

                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium text-foreground">Hesabı Sil</h4>
                        <p className="text-sm text-muted-foreground">
                            Tüm verileriniz kalıcı olarak silinecektir.
                        </p>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={deleteLoading}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hesabı Sil
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bu işlem geri alınamaz. Hesabınız, kütüphaneniz ve yorumlarınız kalıcı olarak silinecektir.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                                    Evet, Hesabımı Sil
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}
