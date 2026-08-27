import path from "node:path";
import type { NextConfig } from "next";

/**
 * Sunucu çalışma zamanı (Netlify + OpenNext adaptörü).
 * Statik export kapalı: /api/* uçları ve arka plan işleri sunucuda çalışır.
 */
const nextConfig: NextConfig = {
  // Üst dizinlerdeki lockfile'ların kökü kaydırmasını engeller
  turbopack: { root: path.resolve(process.cwd()) },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    qualities: [75, 90],
  },
};

export default nextConfig;
