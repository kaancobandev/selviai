import type { MetadataRoute } from "next";
import { services } from "@/lib/data";
import { site } from "@/lib/site";

/** Kendi çalışma alanı olan hizmetler ayrı rota; kalanlar [slug] altında. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    "/",
    "/fiyatlandirma",
    "/iletisim",
    "/hizmetler",
    "/hizmetler/kompozisyon",
    ...services.map((s) => `/hizmetler/${s.slug}`),
    "/market",
    "/market/yukle",
    "/akademi",
    "/akademi/odeme",
  ];

  return paths.map((path) => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/fiyatlandirma" ? 0.9 : 0.7,
  }));
}
