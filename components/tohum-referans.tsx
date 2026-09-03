"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StudyoTohum } from "@/lib/ai/tohum";
import type { TuretilmisTur } from "@/lib/ai/types";

/* ------------------------------------------------------------------
   TOHUM REFERANSI — ana sayfada üretilenin stüdyoda görünür kalması.

   NEDEN PANEL, NEDEN VERİ DEĞİL. Bazı araçlara üretilen çıktı YAPISAL
   olarak tohumlanabiliyor: ilham panosuna görsel, çekim masasına
   tearsheet. Ama kumaş kartelası (kompozisyon, gramaj, hex), marka
   sistemi (font, palet, monogram) ve etiket (dokuma/asma/bakım
   yapılandırması) alanlarını bir GÖRSELDEN türetemeyiz. Uydurmak,
   kullanıcıya ölçülmemiş veriyi ölçülmüş gibi göstermek olurdu.

   O yüzden bu araçlarda çıktı VERİ olarak değil REFERANS olarak
   duruyor: tasarımcı kendi seçimlerini yaparken ürettiği şeyi gözünün
   önünde tutuyor. Dürüst olan ve bugün yapılabilecek olan bu.

   Panel kapanabiliyor: tuvalin üstünde kalıcı bir şerit, dar ekranda
   çalışma alanını yiyor.
   ------------------------------------------------------------------ */

export type ReferansGorsel = { src: string; etiket: string };

/**
 * Tohumdan bu araca ait referansları çıkarır.
 *
 * Her zaman SEÇİLEN KARE de ekleniyor: kumaş ya da marka çalışması tek
 * başına havada duruyor, hangi tasarımdan türediği görünmezse referans
 * olmaktan çıkıp dekora dönüşüyor.
 */
export function referanslar(
  tohum: StudyoTohum | null | undefined,
  tur: TuretilmisTur,
  etiket: string,
): ReferansGorsel[] {
  if (!tohum) return [];
  const liste: ReferansGorsel[] = [{ src: tohum.secilen, etiket: "Seçilen" }];
  const turetilen = tohum.turetilmis[tur];
  if (turetilen) liste.push({ src: turetilen, etiket });
  return liste;
}

export function TohumReferans({
  baslik,
  gorseller,
  className,
}: {
  baslik: string;
  gorseller: ReferansGorsel[];
  className?: string;
}) {
  const [acik, setAcik] = useState(true);
  if (!gorseller.length) return null;

  return (
    <aside
      className={cn("border-b border-hair bg-zemin", className)}
      aria-label="Ana sayfada üretilen referans"
    >
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <p className="eyebrow text-fog">{baslik}</p>
        <button
          type="button"
          onClick={() => setAcik((v) => !v)}
          aria-expanded={acik}
          className="eyebrow text-fog transition-colors duration-200 hover:text-kalem"
        >
          {acik ? "Gizle" : "Göster"}
        </button>
      </div>

      {acik && (
        <div className="flex gap-px overflow-x-auto bg-hair px-6 pb-4 pt-px">
          {gorseller.map((g) => (
            <figure key={g.src} className="shrink-0 bg-zemin">
              <span className="relative block h-24 w-20 overflow-hidden bg-hair">
                {/* unoptimized: kareler özel kovadan, kendi ucumuzdan
                    geliyor; Next'in görsel iyileştiricisinden geçirmenin
                    faydası yok ve o uç yetkiyi ayrıca çözmek zorunda kalırdı. */}
                <Image src={g.src} alt={g.etiket} fill unoptimized sizes="80px" className="object-cover" />
              </span>
              <figcaption className="eyebrow px-1 pt-2 text-fog">{g.etiket}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </aside>
  );
}
