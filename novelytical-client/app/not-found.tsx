import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Home, Search } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-500">
            {/* Icon & Glow Effect */}
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/30 transition-all duration-500" />
                <div className="relative bg-background p-6 rounded-full border-2 border-muted border-dashed group-hover:border-primary/50 transition-colors duration-500">
                    <BookOpen className="h-16 w-16 text-muted-foreground group-hover:text-primary transition-colors duration-500" />
                </div>
            </div>

            {/* Text Content */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
                4<span className="text-primary">0</span>4
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold mb-3">
                Bu Hikaye Kayıp...
            </h2>
            <p className="text-muted-foreground max-w-[500px] mb-8 leading-relaxed">
                Aradığın sayfa kütüphanemizde bulunamadı. Belki de rafı değişmiştir veya hiç yazılmamıştır.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="gap-2 group">
                    <Link href="/">
                        <Home className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                        Kütüphaneye Dön
                    </Link>
                </Button>
            </div>
        </div>
    );
}
