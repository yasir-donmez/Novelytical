import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
    rating: number; // 0-5
    count?: number; // Toplam değerlendirme sayısı
    size?: 'sm' | 'md' | 'lg';
    showCount?: boolean;
}

export function RatingStars({
    rating,
    count,
    size = 'md',
    showCount = true
}: RatingStarsProps) {
    const sizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    };

    const textSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };

    // Round to nearest 0.5 for half-star display
    const roundedRating = Math.round(rating * 2) / 2;

    return (
        <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= Math.floor(roundedRating);
                    const isHalf = star === Math.ceil(roundedRating) && roundedRating % 1 !== 0;

                    return (
                        <div key={star} className="relative">
                            <Star
                                className={cn(
                                    sizes[size],
                                    isFilled
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-muted-foreground/20 text-muted-foreground/20'
                                )}
                            />
                            {isHalf && (
                                <div className="absolute inset-0 overflow-hidden w-1/2">
                                    <Star
                                        className={cn(
                                            sizes[size],
                                            'fill-yellow-400 text-yellow-400'
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showCount && count !== undefined && (
                <span className={cn(textSizes[size], 'text-muted-foreground font-medium')}>
                    ({count.toLocaleString('tr-TR')})
                </span>
            )}

            <span className={cn(textSizes[size], 'font-semibold text-foreground')}>
                {rating.toFixed(1)}
            </span>
        </div>
    );
}
