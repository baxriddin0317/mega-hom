import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { domains: ["firebasestorage.googleapis.com", "cdn-icons-png.flaticon.com"] },
  crossOrigin: 'anonymous',
};

export default nextConfig;
