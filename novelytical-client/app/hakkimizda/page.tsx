import { Metadata } from "next";
import { BookOpen, Sparkles, GraduationCap, Lightbulb, Code2, Rocket } from "lucide-react";
import DeveloperCard from "@/components/about/developer-card";

export const metadata: Metadata = {
    title: "Hakkımızda | Novelytical",
    description: "Novelytical - Bir öğrenci projesi ve yapay zeka denemesi.",
};

export default function HakkimizdaPage() {
    return (
        <main className="container px-4 pt-20 pb-12 min-h-screen">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-4 rounded-full bg-purple-500/10 mb-4">
                        <Rocket className="h-10 w-10 text-purple-500" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Hakkımızda</h1>
                    <p className="text-muted-foreground">
                        Bir öğrenci projesi, bir yapay zeka deneyi.
                    </p>
                </div>

                {/* Hikaye */}
                <section className="p-6 rounded-2xl border bg-gradient-to-br from-purple-500/5 to-blue-500/5 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Lightbulb className="h-5 w-5 text-purple-500" />
                        </div>
                        <h2 className="text-xl font-semibold">Hikaye</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            Novelytical, aslında büyük bir misyonla değil, saf bir <strong className="text-foreground">merakla</strong> başladı.
                            &quot;Yapay zeka araçları ne yapabilir?&quot; sorusunun cevabını aramak istedim.
                        </p>
                        <p>
                            Bir <strong className="text-foreground">öğrenci</strong> olarak, teknolojinin nasıl geliştiğini sadece
                            okuyarak değil, <strong className="text-foreground">deneyerek</strong> anlamak istedim.
                            Ve roman okumayı sevdiğimden, bu iki ilgiyi birleştirmek mantıklı geldi.
                        </p>
                        <p>
                            Bu proje, mükemmel bir ürün yaratma iddiasında değil.
                            Daha çok modern web teknolojileri, yapay zeka araçları ve full-stack geliştirme süreçlerini
                            <strong className="text-foreground"> öğrenme yolculuğum</strong>un bir yansıması.
                        </p>
                    </div>
                </section>

                {/* Neden Bu Proje */}
                <section className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Sparkles className="h-5 w-5 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-semibold">Neden Bu Proje?</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 rounded-xl border bg-card">
                            <h3 className="font-medium mb-2">🤖 AI Araçlarını Denemek</h3>
                            <p className="text-sm text-muted-foreground">
                                LLM'ler, embedding modelleri, anlamsal arama... Bunların gerçek bir projede
                                nasıl çalıştığını görmek istedim.
                            </p>
                        </div>
                        <div className="p-4 rounded-xl border bg-card">
                            <h3 className="font-medium mb-2">📚 Teknoloji Takibi</h3>
                            <p className="text-sm text-muted-foreground">
                                Next.js, .NET Core, PostgreSQL, Firebase... Modern teknolojileri
                                hands-on öğrenmenin en iyi yolu kullanmak.
                            </p>
                        </div>
                        <div className="p-4 rounded-xl border bg-card">
                            <h3 className="font-medium mb-2">🎯 Portfolyo</h3>
                            <p className="text-sm text-muted-foreground">
                                Öğrenci olarak, gerçek dünya deneyimi kazanmak ve gösterebileceğim
                                bir proje oluşturmak önemliydi.
                            </p>
                        </div>
                        <div className="p-4 rounded-xl border bg-card">
                            <h3 className="font-medium mb-2">📖 Roman Sevgisi</h3>
                            <p className="text-sm text-muted-foreground">
                                Web novel&apos;lar okumayı seviyorum. Kendi okuma takip sistemimi yapmak
                                eğlenceli bir hedefti.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Geliştirici */}
                <section className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <GraduationCap className="h-5 w-5 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold">Geliştirici</h2>
                    </div>
                    <DeveloperCard />
                </section>

                {/* Teknolojiler */}
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <Code2 className="h-5 w-5 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-semibold">Kullanılan Teknolojiler</h2>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                        Bu projede öğrendiğim ve deneyimlediğim teknolojiler:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            "Next.js 15",
                            "React 19",
                            ".NET 9",
                            "PostgreSQL",
                            "pgvector",
                            "Firebase Auth",
                            "Firestore",
                            "Tailwind CSS",
                            "Framer Motion",
                            "Sentence Transformers",
                            "HtmlAgilityPack"
                        ].map(tech => (
                            <span key={tech} className="px-3 py-1.5 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors">
                                {tech}
                            </span>
                        ))}
                    </div>
                </section>

                {/* Disclaimer */}
                <div className="mt-12 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
                    <p className="text-sm text-muted-foreground">
                        ⚠️ Bu bir öğrenci projesidir. Ticari bir ürün değildir.
                        Roman verileri üçüncü taraf kaynaklardan derlenmektedir.
                    </p>
                </div>
            </div>
        </main>
    );
}
