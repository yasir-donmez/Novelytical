'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function ErrorToastHandler() {
    const searchParams = useSearchParams();

    useEffect(() => {
        // Check if there's an error in URL (we'll add this when error occurs)
        const error = searchParams.get('error');

        if (error === 'network') {
            toast.error('Bağlantı hatası', {
                description: 'Backend sunucusuna bağlanılamıyor. Lütfen backend\'in çalıştığından emin olun.',
                duration: 5000,
            });
        } else if (error === 'server') {
            toast.error('Sunucu hatası', {
                description: 'Lütfen daha sonra tekrar deneyin.',
                duration: 5000,
            });
        }
    }, [searchParams]);

    return null; // This component doesn't render anything
}
