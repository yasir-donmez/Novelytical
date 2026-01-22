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
        remotePatterns: [
            {
                protocol: "https",
                hostname: "www.royalroadcdn.com",
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
                hostname: "*.novelfire.net",
            },
            {
                protocol: "https",
                hostname: "api.dicebear.com",
            },
            {
                protocol: "https",
                hostname: "firebasestorage.googleapis.com",
            }
        ],
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
