import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site → deploys to Cloudflare Pages as plain files (no Workers).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
