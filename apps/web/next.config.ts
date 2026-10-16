import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    distDir: process.env.NEXT_DIST_DIR ?? '.next',
    agentRules: false,
    transpilePackages: ['@marketplace/api-client', '@marketplace/contracts', '@marketplace/ui'],
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/assets/**' },
            { protocol: 'http', hostname: '127.0.0.1', port: '3000', pathname: '/assets/**' },
            { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
        ],
    },
};

export default nextConfig;
