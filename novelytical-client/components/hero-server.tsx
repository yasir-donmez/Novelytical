import { HeroSection } from '@/components/hero-section';
import { fetchNovels } from '@/lib/data/novels';

export async function HeroServer() {
    let heroNovels = [];
    try {
        const featuredRes = await fetchNovels({ pageSize: 24, sortOrder: 'views_desc', revalidate: 3600 });
        heroNovels = featuredRes.data || [];
    } catch (e) {
        console.error("Hero Fetch Failed", e);
    }

    if (heroNovels.length === 0) return null;

    return <HeroSection novels={heroNovels} />;
}
