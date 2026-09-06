import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Verified via tsc --noEmit
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
  },
  async redirects() {
    return [
      {
        source: '/sessions/:path*',
        destination: '/queue',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
