"use client";

import { Metadata } from "next";
import { Mail, MessageSquare, HelpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export default function DestekPage() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate sending (you can integrate with email service later)
        await new Promise(r => setTimeout(r, 1000));

        toast.success("Mesajınız alındı! En kısa sürede dönüş yapacağız.");
        setFormData({ name: "", email: "", subject: "", message: "" });
        setLoading(false);
    };

    return (
        <main className="container px-4 pt-20 pb-12 min-h-screen">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Destek</h1>
                <p className="text-muted-foreground mb-12">
                    Sorularınız veya önerileriniz için bizimle iletişime geçin.
                </p>

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
                                <label className="text-sm font-medium mb-1 block">Adınız</label>
                                <Input
                                    placeholder="Adınız Soyadınız"
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    required
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
        </main>
    );
}
