/**
 * Tek noktadan marka ve navigasyon ayarları.
 * Marka adını değiştirmek için yalnızca `name` alanını güncelleyin.
 */
export const site = {
  name: "Selvi",
  /** Yayındaki adres — mutlak URL üreten her yer bunu kullanır */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://selviai.com",
  /** İletişim adresleri — alan adıyla birlikte değişir */
  email: "studio@selviai.com",
  pressEmail: "press@selviai.com",
  tagline: "Moda Geliştirme Stüdyosu",
  description:
    "İlhamdan vitrine — moodboard'dan lookbook'a, bir koleksiyonun bütün yolculuğu tek çatı altında.",
  nav: [
    { href: "/hizmetler", label: "Hizmetler" },
    { href: "/market", label: "Market" },
    { href: "/akademi", label: "Akademi" },
  ],
  /**
   * Hero arka planı. `video` doldurulursa görsel yerine sessiz döngü video oynar.
   * Örn: video: "/hero.mp4"
   */
  hero: {
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2400&q=80",
    video: "" as string,
  },
} as const;
