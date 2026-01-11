import { Metadata } from 'next';
import { Suspense } from 'react';
import NovelDetailClient from './novel-detail-client';
import { getNovelById } from '@/lib/data/novels';
import { NovelDetailSkeleton } from '@/components/novel-detail-skeleton';
import { AuthorNovelsServer } from '@/components/author-novels-server';
import { SimilarNovelsServer } from '@/components/similar-novels-server';
import { Skeleton } from '@/components/ui/skeleton';
import InteractionTabs from '@/components/interaction-tabs';

export const experimental_ppr = true;

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    // Await params for Next.js 15 compatibility
    const { id } = await params;
    const novelId = parseInt(id);

    try {
        const novel = await getNovelById(novelId);

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
        console.error('Metadata fetch error:', error);
        return {
            title: 'Roman Detayı - Novelytical',
            description: 'Roman detayları görüntülenemedi.',
        };
    }
}


function AuthorNovelsFallback() {
    return (
        <div className="mt-12 border-t pt-8">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="flex gap-4 overflow-hidden h-[350px] md:h-auto py-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="w-40 flex-shrink-0">
                        <Skeleton className="w-full aspect-[2/3] rounded-xl mb-3" />
                        <Skeleton className="h-4 w-3/4 mb-1" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function SimilarNovelsFallback() {
    return (
        <div className="mt-12 border-t pt-8 pb-8">
            <div className="flex items-center gap-3 mb-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="flex gap-4 overflow-hidden h-[350px] md:h-auto py-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="w-40 flex-shrink-0">
                        <Skeleton className="w-full aspect-[2/3] rounded-xl mb-3" />
                        <Skeleton className="h-4 w-3/4 mb-1" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default async function NovelDetailPage({ params }: PageProps) {
    // Await params for Next.js 15 compatibility
    const { id } = await params;
    const novelId = parseInt(id);

    // Fetch main content on server (blocking for main detail)
    // We could invoke this inside a Suspense component too if we wanted the shell to be even faster,
    // but typically main content is part of the shell or critical path.
    // Let's keep it blocking for now (Streaming happens for other parts OR if we wrap this in Suspense)
    // Actually, to make "shell" load instantly (Navbar, etc), this component needs to suspend?
    // page.tsx is a Server Component.

    // We can fetch data here:
    let novel;
    try {
        novel = await getNovelById(novelId);
    } catch (e) {
        // If error (e.g. 404), Next.js error boundary handles it or we can return notFound() if we catch 404
        throw e; // Let error.tsx handle it
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: novel.title,
        author: {
            '@type': 'Person',
            name: novel.author,
        },
        description: novel.description,
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: novel.averageRating || novel.rating || 0,
            ratingCount: novel.ratingCount || 0,
            bestRating: "5",
            worstRating: "1"
        },
        datePublished: novel.year?.toString(),
        image: novel.coverUrl,
        genre: novel.category,
        url: `https://novelytical.com/novel/${novelId}` // Assuming domain, optional but good
    };

    return (
        <div className="min-h-screen bg-background pb-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <NovelDetailClient novel={novel} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Suspense fallback={<AuthorNovelsFallback />}>
                    <AuthorNovelsServer author={novel.author} currentNovelId={novelId} />
                </Suspense>

                <Suspense fallback={<SimilarNovelsFallback />}>
                    <SimilarNovelsServer id={novelId} />
                </Suspense>

                <div className="border-t border-gray-100 pb-12">
                    <InteractionTabs novelId={novelId} coverImage={novel.coverUrl} />
                </div>
            </div>
        </div>
    );
}
