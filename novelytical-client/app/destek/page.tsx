"use client";

import { Metadata } from "next";
import { Mail, MessageSquare, HelpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export default function DestekPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        subject: "",
        message: ""
    });

    // Autofill when user loads
    useState(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                username: user.displayName || "",
                email: user.email || ""
            }));
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Send to backend API
            const api = (await import("@/lib/axios")).default;
            await api.post('/support', {
                ...formData,
                userId: user?.uid // Optional: link to user if logged in
            });

            toast.success("Mesajınız alındı! En kısa sürede dönüş yapacağız.");
            if (!user) {
                setFormData({ username: "", email: "", subject: "", message: "" });
            } else {
                setFormData(p => ({ ...p, subject: "", message: "" }));
            }
        } catch (error) {
            console.error(error);
            toast.error("Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container px-4 pb-12 min-h-[calc(100vh-80px)]">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-4 rounded-full bg-blue-500/10 mb-4">
                        <HelpCircle className="h-10 w-10 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Destek</h1>
                    <p className="text-muted-foreground">
                        Sorularınız veya önerileriniz için bizimle iletişime geçin.
                    </p>
                </div>

                {/* Quick Links */}
                <div className="grid gap-4 md:grid-cols-3 mb-12">
                    <div className="p-4 rounded-xl border bg-card text-center">
                        <HelpCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <h3 className="font-medium mb-1">SSS</h3>
                        <p className="text-xs text-muted-foreground">
                            Sıkça sorulan sorular
                        </p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <h3 className="font-medium mb-1">Topluluk</h3>
                        <p className="text-xs text-muted-foreground">
                            Diğer kullanıcılarla sohbet
                        </p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card text-center">
                        <Mail className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <h3 className="font-medium mb-1">E-posta</h3>
                        <p className="text-xs text-muted-foreground">
                            destek@novelytical.com
                        </p>
                    </div>
                </div>

                {/* Contact Form */}
                <section className="p-6 rounded-xl border bg-card">
                    <h2 className="text-xl font-semibold mb-6">Bize Ulaşın</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Kullanıcı Adı</label>
                                <Input
                                    placeholder="Kullanıcı Adınız"
                                    value={formData.username}
                                    onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                                    required
                                    readOnly={!!user}
                                    className={user ? "bg-muted" : ""}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">E-posta</label>
                                <Input
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={formData.email}
                                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                    required
                                    readOnly={!!user}
                                    className={user ? "bg-muted" : ""}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Konu</label>
                            <Input
                                placeholder="Mesajınızın konusu"
                                value={formData.subject}
                                onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Mesajınız</label>
                            <Textarea
                                placeholder="Detaylı açıklama..."
                                rows={5}
                                value={formData.message}
                                onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full md:w-auto">
                            {loading ? "Gönderiliyor..." : "Gönder"}
                        </Button>
                    </form>
                </section>
            </div>
        </div>
    );
}
