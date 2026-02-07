'use client';

import { Twitter, Facebook, Link as LinkIcon, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface SocialShareProps {
    title: string;
    url: string;
}

export function SocialShare({ title, url }: SocialShareProps) {
    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link kopyalandı!', {
                description: 'Bağlantı panoya kopyalandı',
                duration: 2000,
            });
        } catch (err) {
            toast.error('Link kopyalanamadı', {
                description: 'Lütfen tekrar deneyin',
                duration: 2000,
            });
        }
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium mr-1">
                Paylaş:
            </span>

            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:text-blue-400 transition-colors"
                asChild
            >
                <a
                    href={shareUrls.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter'da paylaş"
                >
                    <Twitter className="h-4 w-4" />
                </a>
            </Button>

            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-blue-700 transition-colors"
                asChild
            >
                <a
                    href={shareUrls.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook'ta paylaş"
                >
                    <Facebook className="h-4 w-4" />
                </a>
            </Button>

            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                onClick={copyLink}
                aria-label="Linki kopyala"
            >
                <LinkIcon className="h-4 w-4" />
            </Button>
        </div>
    );
}
