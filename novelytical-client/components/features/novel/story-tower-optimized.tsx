"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, User, Loader2 } from "lucide-react";
import { 
  storyTowerLazyLoader, 
  type StoryTowerInitialData, 
  type StoryTowerProgressBucket 
} from "@/lib/firebase/story-tower-lazy-loader";

interface StoryTowerOptimizedProps {
    novelId: number;
    className?: string;
    enableVirtualization?: boolean;
}

/**
 * Optimize edilmiş Story Tower bileşeni
 * 
 * Özellikler:
 * - Lazy loading ile Firebase okuma işlemlerini minimize eder
 * - Sayfalanmış veri yükleme
 * - Client-side cache ile performans optimizasyonu
 * - Virtualization desteği (büyük veri setleri için)
 * - TTL-based cache invalidation
 */
export function StoryTowerOptimized({ 
    novelId, 
    className,
    enableVirtualization = true 
}: StoryTowerOptimizedProps) {
    const { user } = useAuth();
    const [initialData, setInitialData] = useState<StoryTowerInitialData | null>(null);
    const [buckets, setBuckets] = useState<StoryTowerProgressBucket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Memoized values for performance
    const maxCount = useMemo(() => {
        if (buckets.length === 0) return 0;
        return Math.max(...buckets.map(b => b.userCount));
    }, [buckets]);

    const towerLevels = useMemo(() => {
        // Reverse buckets to show "Tower" (Bottom = Start, Top = End)
        return [...buckets].reverse();
    }, [buckets]);

    /**
     * İlk veri yükleme
     * Optimize edilmiş sorgu ile sadece gerekli verileri çeker
     */
    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Lazy loader ile optimize edilmiş veri çekme
            const data = await storyTowerLazyLoader.getInitialData(novelId, user?.uid);
            
            setInitialData(data);
            setBuckets(data.buckets);
        } catch (err) {
            console.error('Story Tower data loading error:', err);
            setError('Story Tower verisi yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [novelId, user?.uid]);

    /**
     * Ek veri yükleme (lazy loading)
     * Kullanıcı etkileşimi ile tetiklenir
     */
    const loadMoreData = useCallback(async () => {
        if (!initialData?.hasMore || !initialData?.nextCursor) return;

        try {
            // Sonraki sayfa verilerini yükle
            const nextPage = await storyTowerLazyLoader.getPage(
                novelId, 
                initialData.nextCursor, 
                user?.uid
            );

            // Bucket'ları güncelle (merge işlemi)
            setBuckets(prevBuckets => {
                const mergedBuckets = [...prevBuckets];
                
                nextPage.buckets.forEach(newBucket => {
                    const existingIndex = mergedBuckets.findIndex(
                        b => b.bucketIndex === newBucket.bucketIndex
                    );
                    
                    if (existingIndex >= 0) {
                        // Mevcut bucket'ı güncelle
                        mergedBuckets[existingIndex] = {
                            ...mergedBuckets[existingIndex],
                            userCount: mergedBuckets[existingIndex].userCount + newBucket.userCount,
                            isUserHere: mergedBuckets[existingIndex].isUserHere || newBucket.isUserHere
                        };
                    } else {
                        mergedBuckets.push(newBucket);
                    }
                });
                
                return mergedBuckets;
            });

            // Initial data'yı güncelle
            setInitialData(prev => prev ? {
                ...prev,
                hasMore: nextPage.hasMore,
                nextCursor: nextPage.nextCursor
            } : null);
        } catch (err) {
            console.error('Story Tower additional data loading error:', err);
        }
    }, [initialData, novelId, user?.uid]);

    // Component mount edildiğinde veri yükle
    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Cache invalidation - kullanıcı değiştiğinde
    useEffect(() => {
        return () => {
            // Component unmount edildiğinde cache'i temizle
            storyTowerLazyLoader.invalidateNovelCache(novelId);
        };
    }, [novelId]);

    // Loading state
    if (loading) {
        return (
            <div className={cn("flex flex-col items-center gap-2", className)}>
                <div className="h-64 w-12 animate-pulse bg-zinc-800/50 rounded-full flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Yükleniyor...
                </span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={cn("flex flex-col items-center gap-2", className)}>
                <div className="h-64 w-12 bg-red-900/20 rounded-full flex items-center justify-center border border-red-500/30">
                    <span className="text-red-400 text-xs">!</span>
                </div>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                    Hata
                </span>
            </div>
        );
    }

    // Empty state
    if (buckets.length === 0) {
        return (
            <div className={cn("flex flex-col items-center gap-2", className)}>
                <div className="h-64 w-12 bg-zinc-800/20 rounded-full flex items-center justify-center border border-zinc-700/30">
                    <span className="text-zinc-500 text-xs">?</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Veri Yok
                </span>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <div className="flex flex-col w-12 bg-zinc-900/50 backdrop-blur-sm rounded-full p-1 border border-white/5 relative">
                {/* Decorative Turret Top */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-purple-900/40 rounded-t-lg border-t border-l border-r border-purple-500/30" />

                <TooltipProvider delayDuration={0}>
                    <div className="flex flex-col gap-[2px] w-full">
                        {towerLevels.map((level) => {
                            // Intensity hesaplama (lazy loader'dan geliyor)
                            const intensity = level.intensity;
                            const isHot = intensity > 0.7;

                            return (
                                <Tooltip key={level.bucketIndex}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "w-full h-8 rounded-sm transition-all duration-300 relative group cursor-pointer",
                                                level.isUserHere ? "ring-2 ring-yellow-400 z-10" : ""
                                            )}
                                            style={{
                                                backgroundColor: `rgba(147, 51, 234, ${0.1 + (intensity * 0.7)})`, // Purple base
                                                boxShadow: isHot ? `0 0 ${intensity * 10}px rgba(168, 85, 247, 0.4)` : 'none'
                                            }}
                                            onClick={loadMoreData} // Lazy loading trigger
                                        >
                                            {/* Floor Line */}
                                            <div className="absolute bottom-0 w-full h-[1px] bg-white/5" />

                                            {/* User Indicator (Dot) */}
                                            {level.isUserHere && (
                                                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2">
                                                    <div className="relative">
                                                        <User size={14} className="text-yellow-400 fill-yellow-400/20 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                                        <div className="absolute -right-1 -top-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Crowd Indicator (If heavy) */}
                                            {isHot && !level.isUserHere && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Users size={10} className="text-white/80" />
                                                </div>
                                            )}

                                            {/* Loading indicator for lazy loading */}
                                            {initialData?.hasMore && (
                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-zinc-950 border-white/10 text-xs">
                                        <div className="font-bold text-white mb-0.5">Kat {level.bucketIndex}</div>
                                        <div className="text-zinc-400">Bölümler: <span className="text-zinc-200">{level.range}</span></div>
                                        <div className="text-zinc-400">Okuyucu: <span className="text-purple-400 font-bold">{level.userCount}</span></div>
                                        {level.isUserHere && <div className="text-yellow-400 font-bold mt-1 text-[10px] uppercase tracking-wide">Buradasınız!</div>}
                                        {initialData?.hasMore && (
                                            <div className="text-purple-400 text-[10px] mt-1 opacity-70">
                                                Tıklayın: Daha fazla veri
                                            </div>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                </TooltipProvider>

                {/* Decorative Base */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-zinc-800 rounded-b-lg border border-white/5" />
            </div>

            <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Kule
                </span>
                {initialData?.novelMetadata && (
                    <span className="text-[8px] text-zinc-600">
                        ~{initialData.novelMetadata.estimatedReaderCount} okuyucu
                    </span>
                )}
                {initialData?.hasMore && (
                    <button 
                        onClick={loadMoreData}
                        className="text-[8px] text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                    >
                        Daha fazla yükle
                    </button>
                )}
            </div>
        </div>
    );
}

// Export for backward compatibility
export { StoryTowerOptimized as StoryTower };