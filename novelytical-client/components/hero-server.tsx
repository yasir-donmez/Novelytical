import { HeroSection } from '@/components/hero-section';
import { fetchNovels } from '@/lib/data/novels';
import { STATIC_HERO_COVERS } from '@/lib/data/static-hero-covers';

export async function HeroServer() {
    let heroNovels = [];
    try {
        // Fetch featured/popular novels with 1 hour cache (ISR)
        // This ensures the background changes occasionally but serves instantly like static files
        const featuredRes = await fetchNovels({ pageSize: 24, sortOrder: 'views_desc', revalidate: 3600 });

        if (featuredRes.data && featuredRes.data.length > 0) {
            heroNovels = featuredRes.data;
        } else {
            // Fallback to static if API returns empty (e.g. fresh DB)
            heroNovels = STATIC_HERO_COVERS;
        }
    } catch (e) {
        console.error("Hero Fetch Failed, using static fallback", e);
        // Fallback to static data on error (e.g. API down) ensures no broken UI
        heroNovels = STATIC_HERO_COVERS;
    }

    return <HeroSection novels={heroNovels} />;
}
