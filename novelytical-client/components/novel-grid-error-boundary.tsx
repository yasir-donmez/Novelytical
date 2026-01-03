'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

interface NovelGridErrorBoundaryProps {
    error: Error | null;
    children: React.ReactNode;
}

export function NovelGridErrorBoundary({ error, children }: NovelGridErrorBoundaryProps) {
    useEffect(() => {
        if (error) {
            // Show toast notification for errors
            if (error.message.includes('fetch') || error.message.includes('network')) {
                toast.error('Bağlantı hatası', {
                    description: 'İnternet bağlantınızı kontrol edin.',
                    duration: 5000,
                });
            } else if (error.message.includes('500') || error.message.includes('server')) {
                toast.error('Sunucu hatası', {
                    description: 'Lütfen daha sonra tekrar deneyin.',
                    duration: 5000,
                });
            } else {
                toast.error('Bir hata oluştu', {
                    description: error.message,
                    duration: 5000,
                });
            }
        }
    }, [error]);

    return <>{children}</>;
}
