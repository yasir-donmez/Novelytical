/**
 * URL-based Chapter Progress Parser
 * 
 * Desteklenen Siteler / Supported Sites:
 * - NovelFire (novelfire.net)
 * - Royal Road (royalroad.com)
 * - Webnovel (webnovel.com)
 * - Wuxiaworld (wuxiaworld.com)
 * - LightNovelWorld (lightnovelworld.com)
 */

export interface ParseResult {
    success: boolean;
    chapterNumber?: number;
    novelSlug?: string;
    siteName?: string;
    error?: string;
}

interface SitePattern {
    name: string;
    domains: string[];
    // Regex to extract chapter number from URL
    chapterPatterns: RegExp[];
    // Regex to extract novel slug/identifier from URL
    slugPatterns: RegExp[];
}

const SUPPORTED_SITES: SitePattern[] = [
    {
        name: "NovelFire",
        domains: ["novelfire.net", "novelfire.id"],
        chapterPatterns: [
            /chapter[-_]?(\d+)/i,           // chapter-123, chapter_123, chapter123
            /\/c(\d+)/i,                     // /c123
        ],
        slugPatterns: [
            /\/book\/([^/]+)/i
        ]
    },
    {
        name: "Royal Road",
        domains: ["royalroad.com", "www.royalroad.com"],
        chapterPatterns: [
            // RR uses IDs in /chapter/ID. We CANNOT use that as chapter number.
            // We must look for explicit numbering in the slug part if available, e.g. "chapter-5"
            // or purely numeric parts at the end that are NOT the ID.
            // But honestly, RR URLs are usually /fiction/ID/slug/chapter/ID/slug
            // The second ID is the chapter ID, not number.
            // Matches ".../chapter-1354..." or "...-chapter-1354..."
            /[/-]chapter-(\d+)/i,
            /book-\d+-chapter-(\d+)/i,
            // Fallback: If we can't find a pattern, we might return nothing rather than a wrong number.
        ],
        slugPatterns: [
            /\/fiction\/\d+\/([^/]+)/i
        ]
    },
    {
        name: "Webnovel",
        domains: ["webnovel.com", "www.webnovel.com", "m.webnovel.com"],
        chapterPatterns: [
            /chapter[-_]?(\d+)/i,
            /_(\d+)$/,                       // ends with _123
        ],
        slugPatterns: [
            /\/book\/([^/]+)/i
        ]
    },
    {
        name: "WuxiaWorld",
        domains: ["wuxiaworld.com", "www.wuxiaworld.com"],
        chapterPatterns: [
            /chapter[-_]?(\d+)/i,
            /c(\d+)/i,
        ],
        slugPatterns: [
            /\/novel\/([^/]+)/i
        ]
    },
    // ... others kept simple for brevity or can be expanded
];

/**
 * Parse a chapter URL and extract the chapter number and novel slug
 */
export function parseChapterUrl(url: string): ParseResult {
    if (!url || typeof url !== 'string') {
        return { success: false, error: "Geçersiz URL" };
    }

    // Normalize URL
    let normalizedUrl = url.trim().toLowerCase();

    // Try to extract hostname
    let hostname: string;
    try {
        const urlObj = new URL(normalizedUrl.startsWith('http') ? normalizedUrl : `https://${normalizedUrl}`);
        hostname = urlObj.hostname.replace(/^www\./, '');
        // normalizedUrl = urlObj.pathname + urlObj.search; // Keep full path for regex
    } catch {
        return { success: false, error: "URL formatı geçersiz" };
    }

    // Find matching site
    const matchedSite = SUPPORTED_SITES.find(site =>
        site.domains.some(domain => hostname.includes(domain.replace(/^www\./, '')))
    );

    if (!matchedSite) {
        return {
            success: false,
            error: `Bu site desteklenmiyor. Desteklenen siteler: ...`
        };
    }

    let chapterNumber: number | undefined;
    let novelSlug: string | undefined;

    // 1. Extract Chapter Number
    for (const pattern of matchedSite.chapterPatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            // Safety check: specific to RR or generic? 
            // If number is > 100000, it's likely an ID, ignore it.
            if (!isNaN(num) && num > 0 && num < 100000) {
                chapterNumber = num;
                break;
            }
        }
    }

    // 2. Extract Slug
    if (matchedSite.slugPatterns) {
        for (const pattern of matchedSite.slugPatterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                novelSlug = match[1];
                break;
            }
        }
    }

    if (chapterNumber || novelSlug) {
        return {
            success: true,
            chapterNumber,
            novelSlug,
            siteName: matchedSite.name
        };
    }

    return {
        success: false,
        error: `URL'den bilgi çıkarılamadı.`
    };
}

/**
 * Get list of supported site names for display
 */
export function getSupportedSites(): string[] {
    return SUPPORTED_SITES.map(site => site.name);
}

/**
 * Check if a URL is from a supported site
 */
export function isSupportedUrl(url: string): boolean {
    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        return SUPPORTED_SITES.some(site =>
            site.domains.some(domain => hostname.includes(domain.replace(/^www\./, '')))
        );
    } catch {
        return false;
    }
}
