/**
 * Site-wide configuration
 */

export const siteConfig = {
    name: 'Novelytical',
    description: 'Yapay zeka destekli roman keşif ve analiz platformu',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    ogImage: '/og-image.png',
    links: {
        twitter: '#',
        github: '#',
        discord: '#',
    },
    author: {
        name: 'Novelytical Team',
        url: '#',
    },
} as const;

export type SiteConfig = typeof siteConfig;
