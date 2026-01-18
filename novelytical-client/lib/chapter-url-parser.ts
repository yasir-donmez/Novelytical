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
    siteName?: string;
    error?: string;
}

interface SitePattern {
    name: string;
    domains: string[];
    // Regex to extract chapter number from URL
    patterns: RegExp[];
}

const SUPPORTED_SITES: SitePattern[] = [
    {
        name: "NovelFire",
        domains: ["novelfire.net", "novelfire.id"],
        patterns: [
            /chapter[-_]?(\d+)/i,           // chapter-123, chapter_123, chapter123
            /\/c(\d+)/i,                     // /c123
        ]
    },
    {
        name: "Royal Road",
        domains: ["royalroad.com", "www.royalroad.com"],
        patterns: [
            /chapter[-_/]?(\d+)/i,          // chapter-45, chapter/45
            /\/(\d+)$/,                      // ends with /123
        ]
    },
    {
        name: "Webnovel",
        domains: ["webnovel.com", "www.webnovel.com", "m.webnovel.com"],
        patterns: [
            /chapter[-_]?(\d+)/i,
            /_(\d+)$/,                       // ends with _123
        ]
    },
    {
        name: "WuxiaWorld",
        domains: ["wuxiaworld.com", "www.wuxiaworld.com"],
        patterns: [
            /chapter[-_]?(\d+)/i,
            /c(\d+)/i,
        ]
    },
    {
        name: "LightNovelWorld",
        domains: ["lightnovelworld.com", "www.lightnovelworld.com"],
        patterns: [
            /chapter[-_]?(\d+)/i,
        ]
    },
    {
        name: "ScribbleHub",
        domains: ["scribblehub.com", "www.scribblehub.com"],
        patterns: [
            /chapter[-_]?(\d+)/i,
            /\/read\/(\d+)/i,               // /read/123456
        ]
    },
    {
        name: "NovelUpdates",
        domains: ["novelupdates.com", "www.novelupdates.com"],
        patterns: [
            /chapter[-_]?(\d+)/i,
            /c(\d+)/i,
        ]
    },
    {
        name: "TapRead",
        domains: ["tapread.com", "www.tapread.com"],
        patterns: [
            /chapter[-_]?(\d+)/i,
        ]
    },
];

/**
 * Parse a chapter URL and extract the chapter number
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
        normalizedUrl = urlObj.pathname + urlObj.search;
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
            error: `Bu site desteklenmiyor. Desteklenen siteler: ${SUPPORTED_SITES.map(s => s.name).join(', ')}`
        };
    }

    // Try each pattern to extract chapter number
    for (const pattern of matchedSite.patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            const chapterNumber = parseInt(match[1], 10);
            if (!isNaN(chapterNumber) && chapterNumber > 0) {
                return {
                    success: true,
                    chapterNumber,
                    siteName: matchedSite.name
                };
            }
        }
    }

    return {
        success: false,
        error: `URL'den bölüm numarası çıkarılamadı. Lütfen doğru bir bölüm sayfası linki yapıştırın.`
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
