"use client"

import Link from "next/link"
import Image from "next/image"
import { Github, Twitter } from "lucide-react"
import { cn } from "@/lib/utils"

export function Footer() {
    return (
        <footer
            className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
            <div className="container px-4 sm:px-12 lg:px-16 xl:px-24 py-12 md:py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1 space-y-4">
                        <div className="flex items-center gap-1">
                            <Image src="/logo.png" alt="N" width={32} height={32} />
                            <span className="text-xl font-bold">ovelytical</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Yapay zeka destekli roman keşif ve analiz platformu. Okuma deneyiminizi bir sonraki seviyeye taşıyın.
                        </p>
                    </div>

                    {/* Platform */}
                    <div className="col-span-1">
                        <h3 className="font-semibold mb-4">Platform</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/romanlar" className="hover:text-primary transition-colors">Keşfet</Link></li>
                            <li><Link href="/romanlar?sort=views_desc" className="hover:text-primary transition-colors">Trendler</Link></li>
                            <li><Link href="/yazarlar" className="hover:text-primary transition-colors">Yazarlar</Link></li>
                        </ul>
                    </div>

                    {/* Topluluk */}
                    <div className="col-span-1">
                        <h3 className="font-semibold mb-4">Topluluk</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/hakkimizda" className="hover:text-primary transition-colors">Hakkımızda</Link></li>
                            <li><Link href="/destek" className="hover:text-primary transition-colors">Destek</Link></li>
                        </ul>
                    </div>

                    {/* Yasal */}
                    <div className="col-span-1">
                        <h3 className="font-semibold mb-4">Yasal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/gizlilik" className="hover:text-primary transition-colors">Gizlilik Politikası</Link></li>
                            <li><Link href="/kullanim-sartlari" className="hover:text-primary transition-colors">Kullanım Şartları</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} Novelytical. Tüm hakları saklıdır.</p>
                    <div className="flex items-center gap-4">
                        <Link href="https://twitter.com" target="_blank" className="hover:text-foreground transition-colors">
                            <Twitter className="h-5 w-5" />
                        </Link>
                        <Link href="https://github.com" target="_blank" className="hover:text-foreground transition-colors">
                            <Github className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
