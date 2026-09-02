/**
 * Tek noktadan marka ve navigasyon ayarları.
 * Marka adını değiştirmek için yalnızca `name` alanını güncelleyin.
 */
export const site = {
  name: "Selvi AI",
  /** Yayındaki adres — mutlak URL üreten her yer bunu kullanır */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://selviai.com",
  /** İletişim adresleri — alan adıyla birlikte değişir */
  email: "info@selviai.com",
  /* Sosyal hesaplar. Tek kaynak: hem /iletisim sayfası hem altbilgi buradan
     besleniyor. Bu oturumda altbilgideki "Takip" sütunu çıplak
     instagram.com / linkedin.com bağlantıları olduğu için silinmişti;
     buradakiler gerçek hesaplar. */
  linkedin: "https://www.linkedin.com/company/selviai/",
  instagram: "https://www.instagram.com/selviai_/",
  tagline: "Tasarım için yapay zekâ görsel üretimi",
  description:
    "Fikirden gerçek ürüne — tasarım öğrenme, üretme ve satma süreçlerini tek platformda birleştiren yapay zekâ altyapısı.",
  /* Üçü ana sayfada bölüm çıpası, fiyatlandırma ise kendi rotası.
     Gerçek rota olduğu için site-header'daki isActive artık bu maddede
     çalışıyor ve menüde aktif alt çizgi çiziliyor. */
  nav: [
    { href: "/#urun", label: "Ürün" },
    { href: "/#sektorler", label: "Sektörler" },
    { href: "/fiyatlandirma", label: "Fiyatlandırma" },
    { href: "/#karsilastirma", label: "Karşılaştırma" },
  ],
} as const;
