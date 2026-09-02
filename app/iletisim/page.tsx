import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  /* Kök layout `title.template = "%s — Selvi AI"` uyguluyor; marka adı burada
     tekrarlanmıyor. */
  title: "İletişim",
  description: "Selvi AI'ya ulaşın: e-posta, LinkedIn ve Instagram.",
  /* ZORUNLU: app/layout.tsx `alternates: { canonical: "/" }` tanımlıyor ve bu
     değer çocuk sayfalara MİRAS KALIYOR. Ezilmezse /iletisim kendini ana sayfa
     olarak canonical'lar ve arama motoru bu rotayı yok sayar. */
  alternates: { canonical: "/iletisim" },
};

/**
 * Sayfa bilerek yalnızca kanalları listeliyor: form yok, yanıt süresi
 * taahhüdü yok, "ne yazmalı" listesi yok. Form olmadığı için ziyaretçiden
 * veri toplanmıyor; bu yüzden KVKK aydınlatma metni de gerekmiyor.
 */
const KANALLAR = [
  {
    etiket: "E-posta",
    deger: site.email,
    href: `mailto:${site.email}`,
    dis: false,
  },
  {
    etiket: "LinkedIn",
    /* Görünen metin şemasız ve kısaltılmış: satırda okunması kolay olsun.
       Gidilen adres site.linkedin, yani tek kaynak. */
    deger: "linkedin.com/company/selviai",
    href: site.linkedin,
    dis: true,
  },
  {
    etiket: "Instagram",
    deger: "@selviai_",
    href: site.instagram,
    dis: true,
  },
];

export default function IletisimPage() {
  return (
    <div className="px-5 pb-28 pt-28 md:px-10 md:pt-40">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-6xl leading-[0.95] tracking-[-0.01em] md:text-8xl">
          İletişim
        </h1>

        <ul className="mt-16 border-t border-hair">
          {KANALLAR.map((k) => (
            <li key={k.etiket} className="border-b border-hair">
              {/* Dış bağlantılarda rel="noopener": target="_blank" ile açılan
                  sayfa aksi hâlde window.opener üzerinden bu sekmeye
                  erişebiliyor. */}
              <a
                href={k.href}
                {...(k.dis ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-6"
              >
                <span className="eyebrow text-fog">{k.etiket}</span>
                <span className="u-line font-display text-2xl md:text-3xl">{k.deger}</span>
              </a>
            </li>
          ))}
        </ul>

        <p className="eyebrow mt-16 text-fog">İstanbul · Londra</p>
      </div>
    </div>
  );
}
