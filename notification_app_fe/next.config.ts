import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['logging-middleware'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
};

export default nextConfig;
