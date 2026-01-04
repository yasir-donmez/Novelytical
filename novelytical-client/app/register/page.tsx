"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, User, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    // useEffect for redirect result removed - handled in AuthProvider

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            if (result.user) {
                toast.success("Google ile kayıt başarılı!");
                router.push("/");
            }
        } catch (error: any) {
            console.error("Google login error:", error);
            let message = "Google servisine bağlanılamadı.";
            if (error.code === 'auth/popup-closed-by-user') message = "İşlem iptal edildi.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors: { name?: string; email?: string; password?: string } = {};
        if (!name) newErrors.name = "Ad Soyad gerekli";
        if (!email) newErrors.email = "E-posta gerekli";
        if (!password) newErrors.password = "Şifre gerekli";
        else if (password.length < 6) newErrors.password = "Şifre en az 6 karakter olmalı";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) {
                await updateProfile(userCredential.user, {
                    displayName: name
                });
            }
            toast.success("Hesap oluşturuldu! Hoş geldiniz.");
            router.push("/");
        } catch (error: any) {
            console.error("Register error:", error);
            let message = "Kayıt olurken bir hata oluştu.";
            if (error.code === 'auth/email-already-in-use') message = "Bu e-posta kullanımda.";
            if (error.code === 'auth/weak-password') message = "Şifre en az 6 karakter olmalı.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#030303] relative overflow-hidden p-4">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse delay-700" />

            {/* Glassmorph Card */}
            <div className="w-full max-w-[420px] z-10">
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-8 relative overflow-hidden group">

                    {/* Top colored border gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            Aramıza Katıl
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Kendi kütüphaneni oluşturmaya başla.
                        </p>
                    </div>

                    {/* Social Auth */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20 transition-all active:scale-95"
                        >
                            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Google
                        </Button>
                        <Button
                            variant="outline"
                            disabled={true}
                            className="bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20 opacity-50 cursor-not-allowed"
                            title="Yakında"
                        >
                            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            Facebook
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-transparent px-2 text-muted-foreground">
                                Veya form ile
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4" noValidate>
                        <div className="space-y-2">
                            <Label className="text-xs font-normal text-muted-foreground ml-1">Ad Soyad</Label>
                            <div className="relative group">
                                <User className={`absolute left-3 top-2.5 h-4 w-4 transition-colors ${errors.name ? 'text-red-500' : 'text-muted-foreground group-focus-within:text-purple-500'}`} />
                                <Input
                                    placeholder="Geralt of Rivia"
                                    className={`pl-9 bg-black/50 border-white/10 focus:border-purple-500/50 transition-all h-10 ${errors.name ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (errors.name) setErrors({ ...errors, name: undefined });
                                    }}
                                />
                            </div>
                            {errors.name && <p className="text-xs text-red-500 ml-1 mt-1">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-normal text-muted-foreground ml-1">E-posta</Label>
                            <div className="relative group">
                                <Mail className={`absolute left-3 top-2.5 h-4 w-4 transition-colors ${errors.email ? 'text-red-500' : 'text-muted-foreground group-focus-within:text-purple-500'}`} />
                                <Input
                                    type="email"
                                    placeholder="geralt@kaer-morhen.com"
                                    className={`pl-9 bg-black/50 border-white/10 focus:border-purple-500/50 transition-all h-10 ${errors.email ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errors.email) setErrors({ ...errors, email: undefined });
                                    }}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500 ml-1 mt-1">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-normal text-muted-foreground ml-1">Şifre</Label>
                            <div className="relative group">
                                <Lock className={`absolute left-3 top-2.5 h-4 w-4 transition-colors ${errors.password ? 'text-red-500' : 'text-muted-foreground group-focus-within:text-purple-500'}`} />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className={`pl-9 bg-black/50 border-white/10 focus:border-purple-500/50 transition-all h-10 ${errors.password ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors({ ...errors, password: undefined });
                                    }}
                                />
                            </div>
                            {errors.password && <p className="text-xs text-red-500 ml-1 mt-1">{errors.password}</p>}
                        </div>

                        <Button size="lg" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-900/20 transition-all group-hover:shadow-purple-900/40" type="submit" disabled={loading}>
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <span className="flex items-center">
                                    Hesap Oluştur <ArrowRight className="ml-2 h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>

                <div className="text-center text-sm text-muted-foreground mt-4">
                    Zaten bir hesabın var mı?{" "}
                    <Link href="/login" className="text-purple-500 hover:text-purple-400 font-medium hover:underline transition-all">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        </div>
    );
}
