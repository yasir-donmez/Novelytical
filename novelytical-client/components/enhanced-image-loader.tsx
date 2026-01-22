'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Error types for better error handling
export enum ImageErrorType {
  NETWORK_ERROR = 'network_error',
  INVALID_URL = 'invalid_url', 
  DOMAIN_NOT_ALLOWED = 'domain_not_allowed',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export interface ImageError extends Error {
  type: ImageErrorType;
  src: string;
  context?: string;
}

export interface ImageLoaderProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholder?: 'blur' | 'empty' | 'skeleton';
  priority?: boolean;
  sizes?: string;
  className?: string;
  onError?: (error: ImageError) => void;
  onLoad?: () => void;
  retryCount?: number;
  fill?: boolean;
  width?: number;
  height?: number;
  unoptimized?: boolean;
}

export function EnhancedImageLoader({
  src,
  alt,
  fallbackSrc,
  placeholder = 'skeleton',
  priority = false,
  sizes,
  className,
  onError,
  onLoad,
  retryCount = 3,
  fill = false,
  width,
  height,
  unoptimized = false,
  ...props
}: ImageLoaderProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const createImageError = (originalError: any, src: string): ImageError => {
    let errorType = ImageErrorType.UNKNOWN;
    let message = 'Unknown image loading error';

    if (originalError?.message) {
      const errorMsg = originalError.message.toLowerCase();
      if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        errorType = ImageErrorType.NETWORK_ERROR;
        message = 'Network error while loading image';
      } else if (errorMsg.includes('cors') || errorMsg.includes('domain')) {
        errorType = ImageErrorType.DOMAIN_NOT_ALLOWED;
        message = 'Domain not allowed for image loading';
      } else if (errorMsg.includes('timeout')) {
        errorType = ImageErrorType.TIMEOUT;
        message = 'Image loading timeout';
      } else if (errorMsg.includes('invalid') || errorMsg.includes('url')) {
        errorType = ImageErrorType.INVALID_URL;
        message = 'Invalid image URL';
      }
    }

    const error = new Error(message) as ImageError;
    error.type = errorType;
    error.src = src;
    return error;
  };

  const shouldRetry = (error: ImageError, currentAttempts: number): boolean => {
    if (currentAttempts >= retryCount) return false;
    
    // Retry for network errors and timeouts, but not for invalid URLs or domain issues
    return error.type === ImageErrorType.NETWORK_ERROR || 
           error.type === ImageErrorType.TIMEOUT ||
           error.type === ImageErrorType.UNKNOWN;
  };

  const handleImageError = useCallback((event: any) => {
    const error = createImageError(event, currentSrc);
    
    console.error('Enhanced Image Loader Error:', {
      src: currentSrc,
      type: error.type,
      message: error.message,
      attempts: attempts + 1
    });

    if (shouldRetry(error, attempts)) {
      // Retry with same URL
      setAttempts(prev => prev + 1);
      // Force re-render by updating src with cache buster
      const cacheBuster = `?retry=${attempts + 1}&t=${Date.now()}`;
      setCurrentSrc(currentSrc.includes('?') ? currentSrc + '&' + cacheBuster.slice(1) : currentSrc + cacheBuster);
      return;
    }

    // No more retries, try fallback
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      console.log('Trying fallback image:', fallbackSrc);
      setCurrentSrc(fallbackSrc);
      setAttempts(0); // Reset attempts for fallback
      return;
    }

    // Final fallback - show placeholder
    setHasError(true);
    setShowFallback(true);
    setIsLoading(false);
    
    if (onError) {
      onError(error);
    }
  }, [currentSrc, attempts, fallbackSrc, retryCount, onError]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    setShowFallback(false);
    
    console.log('Enhanced Image Loader: Image loaded successfully:', currentSrc);
    
    if (onLoad) {
      onLoad();
    }
  }, [currentSrc, onLoad]);

  // Show placeholder while loading or on error
  if (isLoading && placeholder === 'skeleton') {
    return (
      <div className={cn("animate-pulse bg-muted rounded", className)}>
        {fill ? (
          <div className="absolute inset-0 bg-muted/50 rounded" />
        ) : (
          <div 
            className="bg-muted/50 rounded"
            style={{ width: width || '100%', height: height || '100%' }}
          />
        )}
      </div>
    );
  }

  // Show fallback on final error
  if (showFallback) {
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

  // Render the actual image
  const imageProps = {
    src: currentSrc,
    alt,
    className: cn(className, isLoading && "opacity-0"),
    onError: handleImageError,
    onLoad: handleImageLoad,
    priority,
    sizes,
    unoptimized,
    ...props
  };

  if (fill) {
    return <Image {...imageProps} fill />;
  }

  return (
    <Image 
      {...imageProps} 
      width={width || 300} 
      height={height || 400}
    />
  );
}

// Default fallback URLs for different contexts
export const getDefaultFallback = (context: 'cover' | 'profile' | 'general' = 'general'): string => {
  switch (context) {
    case 'cover':
      return '/images/book-placeholder.svg';
    case 'profile':
      return '/images/profile-placeholder.svg';
    default:
      return '/images/default-placeholder.svg';
  }
};