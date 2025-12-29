import { Metadata } from 'next';
import NovelDetailClient from './novel-detail-client';
import { novelService } from '@/services/novelService';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    // Await params for Next.js 15 compatibility
    const { id } = await params;
    const novelId = parseInt(id);

    // Fetch data directly for metadata
    // Note: Next.js deduplicates requests, so if we use fetch() this would be efficient.
    // Since we use axios in library, we might double-fetch unless we cache.
    // Ideally, novelService should be server-side compatible.

    try {
        const novel = await novelService.getNovelById(novelId);

        return {
            title: `${novel.title} - Oku & İncele | Novelytical`,
            description: novel.description?.slice(0, 160) || `${novel.title} romanı hakkında detaylı bilgiler, analizler ve özet.`,
            openGraph: {
                title: `${novel.title} - Novelytical`,
                description: novel.description?.slice(0, 200),
                images: novel.coverUrl ? [{ url: novel.coverUrl }] : [],
                type: 'book',
                authors: [novel.author],
            },
            twitter: {
                card: 'summary_large_image',
                title: novel.title,
                description: novel.description?.slice(0, 200),
                images: novel.coverUrl ? [novel.coverUrl] : [],
            },
            alternates: {
                canonical: `/novel/${novelId}`,
            },
        };
    } catch (error) {
        // Fallback metadata in case of error (e.g. 404 or backend down)
        console.error('Metadata fetch error:', error);
        return {
            title: 'Roman Detayı - Novelytical',
            description: 'Roman detayları görüntülenemedi.',
        };
    }
}

export default async function NovelDetailPage({ params }: PageProps) {
    // Await params for Next.js 15 compatibility
    const { id } = await params;
    const novelId = parseInt(id);

    return <NovelDetailClient initialNovelId={novelId} />;
}
