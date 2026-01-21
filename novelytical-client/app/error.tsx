"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to console
        console.error("Novelytical Application Error:", error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Icon & Glow Effect */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
                <div className="relative bg-background p-6 rounded-full border-2 border-red-500/20">
                    <AlertTriangle className="h-16 w-16 text-red-500" />
                </div>
            </div>

            {/* Text Content */}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Bir Şeyler Yanlış Gitti
            </h1>
            <p className="text-muted-foreground max-w-[500px] mb-8 leading-relaxed">
                Üzgünüz, beklenmedik bir hata oluştu. Mühendislerimiz konuyla ilgileniyor. Lütfen sayfayı yenilemeyi veya daha sonra tekrar gelmeyi deneyin.
            </p>

            {/* Error Details (Dev only) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg max-w-2xl w-full text-left overflow-auto max-h-40">
                    <p className="font-mono text-xs text-red-500 break-all">{error.message}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => reset()} size="lg" className="gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Tekrar Dene
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link href="/">
                        <Home className="h-4 w-4" />
                        Ana Sayfa
                    </Link>
                </Button>
            </div>
        </div>
    );
}
