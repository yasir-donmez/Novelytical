import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12">
            <div className="w-full">
                {/* Visual Anchor Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-sm shrink-0 ring-1 ring-white/5">
                        <Users className="h-6 w-6 text-purple-500 fill-purple-500/20" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/95">
                            Popüler Yazarlar
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground mt-1">
                            En yüksek etkileşim ve okunma oranına sahip yazarlar.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="p-4 md:p-5 rounded-xl border h-full relative overflow-hidden bg-card">
                            <div className="flex items-center gap-4">
                                {/* Avatar Skeleton */}
                                <Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-full shrink-0" />

                                <div className="flex-1 min-w-0 space-y-2">
                                    {/* Name Skeleton */}
                                    <Skeleton className="h-5 w-3/4" />

                                    {/* Stats Skeleton */}
                                    <div className="flex gap-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>

                                    {/* Rank Bar Skeleton */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Skeleton className="h-1.5 flex-1 rounded-full" />
                                        <Skeleton className="h-3 w-8" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination Skeleton */}
                <div className="mt-12 flex justify-center">
                    <Skeleton className="h-10 w-64 rounded-md" />
                </div>
            </div>
        </div>
    );
}
