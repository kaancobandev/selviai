import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Üretim uçları ve hesap ekranı dizinlenmez
        disallow: ["/api/", "/giris"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
