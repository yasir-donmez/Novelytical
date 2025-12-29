import { MetadataRoute } from 'next';

// This would ideally be dynamic based on your actual novel data
export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://novelytical.com';

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        // Add more static routes here if needed
    ];
}
