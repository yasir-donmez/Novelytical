/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: 'standalone',
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "same-origin-allow-popups",
                    },
                ],
            },
        ];
    },
    images: {
        // Production için daha geniş domain desteği
        remotePatterns: [
            {
                protocol: "https",
                hostname: "www.royalroadcdn.com",
            },
            {
                protocol: "https",
                hostname: "royalroadcdn.com",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "novelfire.net",
            },
            {
                protocol: "https",
                hostname: "novelfire.me",
            },
            {
                protocol: "https",
                hostname: "api.dicebear.com",
            },
            {
                protocol: "https",
                hostname: "firebasestorage.googleapis.com",
            },
            {
                protocol: "https",
                hostname: "storage.googleapis.com",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "cdn.jsdelivr.net",
            },
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com",
            }
        ],
        // Production için image optimization ayarları
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60,
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    async rewrites() {
        // 🌐 Dynamic API URL for Docker/Production
        const isProduction = process.env.NODE_ENV === 'production';
        const apiUrl = process.env.API_URL || (isProduction ? 'https://novelytical-api.onrender.com' : 'http://localhost:5050');

        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`, // Proxy to Backend
            },
        ];
    },
};

export default nextConfig;
