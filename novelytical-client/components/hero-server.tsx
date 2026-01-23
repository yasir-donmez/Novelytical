import { HeroSection } from '@/components/hero-section';
import { fetchNovels } from '@/lib/data/novels';

export async function HeroServer() {
    let heroNovels = [];
    try {
        // Fetch featured/popular novels for the background
        const featuredRes = await fetchNovels({ pageSize: 15, sortOrder: 'views_desc', revalidate: 3600 });
        heroNovels = featuredRes.data || [];
    } catch (e) {
        console.error("Hero Fetch Failed", e);
    }

    return <HeroSection novels={heroNovels} />;
}
