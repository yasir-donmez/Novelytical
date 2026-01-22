'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface SimpleImageLoaderProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  onError?: (error: Error) => void;
  onLoad?: () => void;
  retryCount?: number;
}

export function SimpleImageLoader({
  src,
  alt,
  fallbackSrc = '/images/book-placeholder.svg',
  className,
  onError,
  onLoad,
  retryCount = 2,
  ...props
}: SimpleImageLoaderProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageError = useCallback(() => {
    console.error('Simple Image Loader Error:', {
      src: currentSrc,
      attempts: attempts + 1
    });

    if (attempts < retryCount) {
      // Retry with cache buster
      setAttempts(prev => prev + 1);
      const cacheBuster = `?retry=${attempts + 1}&t=${Date.now()}`;
      setCurrentSrc(currentSrc.includes('?') ? currentSrc + '&' + cacheBuster.slice(1) : currentSrc + cacheBuster);
      return;
    }

    // Try fallback
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      console.log('Trying fallback image:', fallbackSrc);
      setCurrentSrc(fallbackSrc);
      setAttempts(0);
      return;
    }

    // Final error
    setHasError(true);
    setIsLoading(false);
    
    if (onError) {
      onError(new Error(`Failed to load image: ${src}`));
    }
  }, [currentSrc, attempts, fallbackSrc, retryCount, onError, src]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    
    console.log('Simple Image Loader: Image loaded successfully:', currentSrc);
    
    if (onLoad) {
      onLoad();
    }
  }, [currentSrc, onLoad]);

  // Show placeholder on error
  if (hasError) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/20 text-muted-foreground rounded", className)}>
        <span className="text-4xl">📚</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={cn(className, isLoading && "opacity-50")}
      onError={handleImageError}
      onLoad={handleImageLoad}
      {...props}
    />
  );
}