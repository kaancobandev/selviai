import Link from "next/link";
import { site } from "@/lib/site";

/**
 * Altbilgi — koyu, sade, yalnızca gerçek bağlantılar.
 *
 * Kaldırılanlar ve sebepleri:
 *   · Bülten formu — hiçbir yere gönderim yapmıyordu.
 *   · "Takip" sütunu — çıplak instagram.com / pinterest.com / linkedin.com;
 *     gerçek hesap yok.
 *   · /#hizmetler ve /#studyo çıpaları — karşılıkları ana sayfadan kalktı,
 *     bırakılsa sessizce kırık bağlantı olurlardı.
 *   · Gizlilik / Şartlar — ikisi de `/#`'e gidiyordu. Gerçek metin yazılana
 *     kadar ölü bağlantı göstermemek daha dürüst.
 */

const sutunlar = [
  {
    baslik: "Ürün",
    baglantilar: [
      { etiket: "Ne yapıyor", href: "/#urun" },
      { etiket: "Kalite kapısı", href: "/#kalite-kapisi" },
      { etiket: "Sektörler", href: "/#sektorler" },
      { etiket: "Fiyatlandırma", href: "/fiyatlandirma" },
    ],
  },
  {
    baslik: "Stüdyo",
    baglantilar: [
      { etiket: "Kompozisyon", href: "/hizmetler/kompozisyon" },
      { etiket: "Galeri", href: "/hizmetler/kompozisyon/galeri" },
    ],
  },
  {
    baslik: "İletişim",
    baglantilar: [
      { etiket: "İletişim", href: "/iletisim" },
      { etiket: site.email, href: `mailto:${site.email}` },
      { etiket: "LinkedIn", href: site.linkedin, dis: true },
      { etiket: "Instagram", href: site.instagram, dis: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative isolate border-t border-hair">
      {/* Arka plan görseli ve ona göre hesaplanmış gradyan peçe.
          Değerlerin nereden geldiği globals.css'teki .selvi-footer-zemin
          yorumunda yazılı — görselin sol tarafı beyaza yakın ve altbilginin
          solunda devasa beyaz logo var. */}
      <div aria-hidden className="selvi-footer-zemin" />

      <div className="px-5 pb-10 pt-20 md:px-10 md:pt-28">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-display text-[17vw] leading-[0.85] tracking-[-0.02em] md:text-[7rem] lg:text-[8.5rem]">
              {site.name}
            </p>
            <p className="eyebrow mt-6 text-paper/90">{site.tagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7 md:pt-3">
            {sutunlar.map((sutun) => (
              <div key={sutun.baslik}>
                <p className="eyebrow text-paper/90">{sutun.baslik}</p>
                <ul className="mt-5 space-y-3">
                  {sutun.baglantilar.map((b) => (
                    <li key={b.etiket}>
                      {/* Dış bağlantılar düz <a>: yeni sekmede açılıyorlar ve
                          rel="noopener" olmadan açılan sayfa window.opener
                          üzerinden bu sekmeye erişebiliyor. */}
                      {"dis" in b && b.dis ? (
                        <a
                          href={b.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="u-line text-sm text-paper"
                        >
                          {b.etiket}
                        </a>
                      ) : (
                        <Link href={b.href} className="u-line text-sm text-paper">
                          {b.etiket}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-3 border-t border-hair pt-8 sm:flex-row sm:items-center sm:justify-between">
          <span className="eyebrow text-paper/90">© 2026 {site.name}. Tüm hakları saklıdır.</span>
          <span className="eyebrow text-paper/90">İstanbul</span>
        </div>
      </div>
    </footer>
  );
}
