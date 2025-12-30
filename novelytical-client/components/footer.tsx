import Link from "next/link"
import { Github, Twitter, Linkedin } from "lucide-react"

export function Footer() {
    return (
        <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container px-4 sm:px-12 lg:px-16 xl:px-24 py-12 md:py-16">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
                    <div className="col-span-3 md:col-span-1 space-y-4">
                        <div className="flex items-center gap-1">
                            <img src="/logo.png" alt="N" width={32} height={32} />
                            <span className="text-xl font-bold">ovelytical</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Yapay zeka destekli roman keşif ve analiz platformu. Okuma deneyiminizi bir sonraki seviyeye taşıyın.
                        </p>
                    </div>

                    <div className="col-span-1">
                        <h3 className="font-semibold mb-4">Platform</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">Keşfet</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Trendler</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Yazarlar</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Koleksiyonlar</Link></li>
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h3 className="font-semibold mb-4">Topluluk</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">Hakkımızda</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Discord</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Destek</Link></li>
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h3 className="font-semibold mb-4">Yasal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">Gizlilik Politikası</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Kullanım Şartları</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Çerez Politikası</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>© 2024 Novelytical. Tüm hakları saklıdır.</p>
                    <div className="flex items-center gap-4">
                        <Link href="#" className="hover:text-foreground transition-colors"><Twitter className="h-5 w-5" /></Link>
                        <Link href="#" className="hover:text-foreground transition-colors"><Github className="h-5 w-5" /></Link>
                        <Link href="#" className="hover:text-foreground transition-colors"><Linkedin className="h-5 w-5" /></Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
