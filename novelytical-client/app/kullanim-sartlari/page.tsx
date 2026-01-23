import { Metadata } from "next";
import { Scale, FileText, UserCog, AlertTriangle, Ban, RefreshCw, Mail, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
    title: "Kullanım Şartları | Novelytical",
    description: "Novelytical platformu kullanım şartları ve koşulları.",
};

export default function KullanimSartlariPage() {
    return (
        <div className="container px-4 pb-12 md:pb-20">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-4 rounded-full bg-blue-500/10 mb-4">
                        <Scale className="h-10 w-10 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Kullanım Şartları</h1>
                    <p className="text-muted-foreground">
                        Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
                    </p>
                </div>

                {/* Hizmet Tanımı - Hero Card */}
                <div className="p-6 rounded-2xl border bg-gradient-to-br from-blue-500/5 to-purple-500/5 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-semibold">Hizmet Tanımı</h2>
                    </div>
                    <p className="text-muted-foreground">
                        Novelytical, kullanıcıların çeşitli kaynaklardan derlenen romanları keşfetmesine,
                        takip etmesine ve değerlendirmesine olanak tanıyan yapay zeka destekli bir platformdur.
                        Platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-6 md:grid-cols-2 mb-8">
                    {/* Hesap Oluşturma */}
                    <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <UserCog className="h-5 w-5 text-green-500" />
                            </div>
                            <h2 className="text-lg font-semibold">Hesap Oluşturma</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                <span>13 yaşından büyük olmalısınız</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                <span>Doğru ve güncel bilgiler sağlamalısınız</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                <span>Hesap güvenliğinizden siz sorumlusunuz</span>
                            </li>
                        </ul>
                    </div>

                    {/* Yasaklar */}
                    <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <Ban className="h-5 w-5 text-red-500" />
                            </div>
                            <h2 className="text-lg font-semibold">Yasaklanan Davranışlar</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">✗</span>
                                <span>Yasalara aykırı içerik paylaşmak</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">✗</span>
                                <span>Diğer kullanıcılara saygısızlık</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">✗</span>
                                <span>Spam veya zararlı içerik yaymak</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">✗</span>
                                <span>Platformun altyapısına zarar vermek</span>
                            </li>
                        </ul>
                    </div>

                    {/* İçerik Hakları */}
                    <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <FileText className="h-5 w-5 text-purple-500" />
                            </div>
                            <h2 className="text-lg font-semibold">İçerik Hakları</h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground">
                            <p>
                                <strong className="text-foreground">Sizin içerikleriniz:</strong> Yorumlar ve değerlendirmeler size aittir.
                                Platformda yayınlayarak gösterim hakkı verirsiniz.
                            </p>
                            <p>
                                <strong className="text-foreground">Roman verileri:</strong> Üçüncü taraf kaynaklardan derlenmektedir.
                                Sahiplik iddia etmiyoruz.
                            </p>
                        </div>
                    </div>

                    {/* Sorumluluk Reddi */}
                    <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                            <h2 className="text-lg font-semibold">Sorumluluk Reddi</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Platform &quot;olduğu gibi&quot; sunulmaktadır. Roman bilgilerinin doğruluğu,
                            güncelliği veya eksiksizliği konusunda garanti verilmemektedir.
                            Kullanımdan doğan sorumluluk kullanıcıya aittir.
                        </p>
                    </div>
                </div>

                {/* Değişiklikler */}
                <div className="p-6 rounded-2xl border bg-card mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <RefreshCw className="h-5 w-5 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-semibold">Değişiklikler ve Güncellemeler</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <p>
                            Novelytical, hizmeti önceden bildirimde bulunmaksızın değiştirme,
                            askıya alma veya sonlandırma hakkını saklı tutar.
                        </p>
                        <p>
                            Kullanım şartları zaman zaman güncellenebilir.
                            Önemli değişiklikler platform üzerinden duyurulacaktır.
                        </p>
                    </div>
                </div>

                {/* Contact */}
                <div className="text-center p-6 rounded-2xl border bg-card">
                    <Mail className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                        Sorularınız için:
                    </p>
                    <a href="mailto:destek@novelytical.com" className="text-primary font-medium hover:underline">
                        destek@novelytical.com
                    </a>
                </div>
            </div>
        </div>
    );
}
