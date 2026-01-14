import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Config updated for Vercel deployment
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'p.qrsim.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.qrsim.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
