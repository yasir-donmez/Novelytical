import { Metadata } from "next";
import { Shield, Eye, Lock, Cookie, UserCheck, Mail, Database, Server } from "lucide-react";

export const metadata: Metadata = {
    title: "Gizlilik Politikası | Novelytical",
    description: "Novelytical gizlilik politikası ve veri koruma bilgileri.",
};

export default function GizlilikPage() {
    return (
        <div className="container px-4 pb-12 md:pb-20">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
                        <Shield className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Gizlilik Politikası</h1>
                    <p className="text-muted-foreground">
                        Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-6 md:grid-cols-2 mb-8">
                    {/* Toplanan Bilgiler */}
                    <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Database className="h-5 w-5 text-blue-500" />
                            </div>
                            <h2 className="text-lg font-semibold">Toplanan Bilgiler</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span><strong className="text-foreground">Hesap:</strong> E-posta, kullanıcı adı, profil fotoğrafı</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span><strong className="text-foreground">Kullanım:</strong> Okunan romanlar, değerlendirmeler</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span><strong className="text-foreground">Teknik:</strong> IP, tarayıcı bilgileri (analitik)</span>
                            </li>
                        </ul>
                    </div>

                    {/* Kullanım Amaçları */}
                    <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <Eye className="h-5 w-5 text-green-500" />
                            </div>
                            <h2 className="text-lg font-semibold">Kullanım Amaçları</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-1">✓</span>
                                <span>Hesap oluşturma ve yönetimi</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-1">✓</span>
                                <span>Kişiselleştirilmiş roman önerileri</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-1">✓</span>
                                <span>Platform performansını iyileştirme</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-1">✓</span>
                                <span>Güvenlik ve dolandırıcılık önleme</span>
                            </li>
                        </ul>
                    </div>

                    {/* Veri Güvenliği */}
                    <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Lock className="h-5 w-5 text-purple-500" />
                            </div>
                            <h2 className="text-lg font-semibold">Veri Güvenliği</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                            Verilerinizi korumak için endüstri standardı güvenlik önlemleri kullanıyoruz:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400">HTTPS</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400">Firebase Auth</span>
                            <span className="px-3 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400">Şifreli Depolama</span>
                        </div>
                    </div>

                    {/* Çerezler */}
                    <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Cookie className="h-5 w-5 text-amber-500" />
                            </div>
                            <h2 className="text-lg font-semibold">Çerezler</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Oturum yönetimi ve tercihlerinizi hatırlamak için çerezler kullanıyoruz.
                            Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz, ancak bu bazı
                            özelliklerin çalışmamasına neden olabilir.
                        </p>
                    </div>
                </div>

                {/* KVKK Hakları - Full Width */}
                <div className="p-6 rounded-2xl border bg-gradient-to-br from-primary/5 to-purple-500/5 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <UserCheck className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold">KVKK Kapsamındaki Haklarınız</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>Verilerinize erişim talep etme</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>Verilerin düzeltilmesini isteme</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>Verilerin silinmesini talep etme</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>Veri işlemeye itiraz etme</span>
                        </div>
                    </div>
                </div>

                {/* Contact */}
                <div className="text-center p-6 rounded-2xl border bg-card">
                    <Mail className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                        Gizlilik ile ilgili sorularınız için:
                    </p>
                    <a href="mailto:destek@novelytical.com" className="text-primary font-medium hover:underline">
                        destek@novelytical.com
                    </a>
                </div>
            </div>
        </div>
    );
}
