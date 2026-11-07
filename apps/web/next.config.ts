import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [{ source: '/backend/:path*', destination: `${process.env.API_INTERNAL_URL || 'http://localhost:8000'}/:path*` }];
  },
};

export default nextConfig;
