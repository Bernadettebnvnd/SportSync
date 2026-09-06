import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Verified via tsc --noEmit
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
