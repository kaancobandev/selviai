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
  tagline: "Yapay Zekâ Destekli Yaratıcı Tasarım Platformu",
  description:
    "Fikirden gerçek ürüne — tasarım öğrenme, üretme ve satma süreçlerini tek platformda birleştiren yapay zekâ altyapısı.",
  nav: [
    { href: "/hizmetler", label: "Hizmetler" },
    { href: "/market", label: "Market" },
    { href: "/akademi", label: "Akademi" },
  ],
} as const;
