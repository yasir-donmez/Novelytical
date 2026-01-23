'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface ProductionImageLoaderProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  onError?: (error: Error) => void;
  onLoad?: () => void;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}

export function ProductionImageLoader({
  src,
  alt,
  fallbackSrc = '/images/book-placeholder.svg',
  className,
  onError,
  onLoad,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  ...props
}: ProductionImageLoaderProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = useCallback(() => {
    console.error('Production Image Loader Error:', currentSrc);

    // Try fallback if not already using it
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      console.log('Trying fallback image:', fallbackSrc);
      setCurrentSrc(fallbackSrc);
      return;
    }

    // Final error state
    setHasError(true);
    setIsLoading(false);

    if (onError) {
      onError(new Error(`Failed to load image: ${src}`));
    }
  }, [currentSrc, fallbackSrc, onError, src]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);

    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  // Show placeholder on final error
  if (hasError) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/20 text-muted-foreground rounded", className)}>
        {fill ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">📚</span>
          </div>
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ width: width || '100%', height: height || '100%' }}
          >
            <span className="text-4xl">📚</span>
          </div>
        )}
      </div>
    );
  }

  // Use native img tag instead of Next.js Image
  return (
    <img
      src={currentSrc}
      alt={alt}
      className={cn(className, isLoading && "opacity-50")}
      onError={handleImageError}
      onLoad={handleImageLoad}
      style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined}
      {...props}
    />
  );
}
