"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
    value: number;
    onChange?: (val: number) => void;
    readOnly?: boolean;
    size?: number;
}

export function StarRating({ value, onChange, readOnly = false, size = 20 }: StarRatingProps) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => !readOnly && onChange?.(star)}
                    disabled={readOnly}
                    className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform focus:outline-none'}`}
                >
                    <Star
                        size={size}
                        className={`transition-colors ${star <= value
                                ? "fill-amber-400 text-amber-400 dark:fill-amber-500 dark:text-amber-500"
                                : "fill-muted/50 text-muted-foreground/30"
                            }`}
                    />
                </button>
            ))}
        </div>
    );
}
