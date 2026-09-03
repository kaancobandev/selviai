"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { paletBirlestir } from "@/lib/palet";
import {
  KALIPLAR,
  KALIP_ADI,
  KALIP_GORSEL,
  MOODBOARD_ORANI,
  ornekMoodboard,
  tohumdanMoodboard,
  type Kalip,
  type Moodboard,
} from "@/lib/moodboard";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   MOODBOARD STÜDYOSU

   İlham panosuyla karıştırılmamalı: orası TOPLAMA alanı (serbest,
   dağınık, kişisel), burası İLETİŞİM ARTEFAKTI (sabit tuval, ızgara,
   adlandırılmış palet, yön cümlesi). Serbest yerleştirme isteyen panoda
   çalışır.

   Araca asıl değerini veren şey palet: sabit listeden seçilmiyor,
   kullanıcının KENDİ karelerinden çıkarılıyor (bkz. lib/palet.ts).
   ------------------------------------------------------------------ */

export function MoodboardStudio({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [pano, setPano] = useState<Moodboard>(() =>
    tohum ? tohumdanMoodboard(tohum) : ornekMoodboard,
  );
  const [paletDurum, setPaletDurum] = useState<"bos" | "cikariliyor" | "hazir">("bos");
  const [toast, setToast] = useState<string | null>(null);

  const havuz = tohum ? [...tohum.ilham, ...Object.values(tohum.turetilmis)] : [];

  /* Palet çıkarımı tarayıcıda: canvas gerekiyor. Görsel kümesi başına
     BİR KEZ çalışıyor; kullanıcı sonra elle düzenleyebiliyor.

     İKİ TUZAK ÜST ÜSTE GELDİ, ikisi de sessizdi:

     (1) İlk yazımda `paletDurum` hem efektin bağımlılığındaydı hem
         efektin İÇİNDE yazılıyordu. "cikariliyor"a dönünce efekt
         yeniden koşuyor, önceki koşumun temizliği uçuştaki çıkarımı
         iptal ediyordu.

     (2) Nöbeti ref'e taşıyınca bu sefer STRICT MODE vurdu: geliştirmede
         React efekti mount → cleanup → mount diye iki kez koşuyor. İlk
         koşum ref'i işaretleyip başlatıyor, temizlik iptal ediyor,
         ikinci koşum ref işaretli olduğu için erken dönüyor. Tek
         uçuştaki iş iptal edilip bir daha denenmiyordu.

     Çözüm iptal etmeyi tamamen bırakmak: çıkarım saf ve ucuz, sonucu
     geç uygulamanın zararı yok. Bunun yerine sonuç dönünce ANAHTARIN
     hâlâ güncel olup olmadığına bakılıyor — görsel kümesi değiştiyse
     eski sonuç kendiliğinden düşüyor. */
  const cikarilan = useRef<string>("");
  useEffect(() => {
    const anahtar = pano.gorseller.join("|");
    if (!pano.gorseller.length || cikarilan.current === anahtar) return;
    cikarilan.current = anahtar;
    setPaletDurum("cikariliyor");
    void paletBirlestir(pano.gorseller, 6).then((renkler) => {
      if (cikarilan.current !== anahtar) return; // küme değişti, sonuç bayat
      setPano((p) => ({ ...p, palet: renkler }));
      setPaletDurum("hazir");
    });
  }, [pano.gorseller]);

  function kalipDegistir(kalip: Kalip) {
    const kapasite = KALIP_GORSEL[kalip];
    setPano((p) => ({
      ...p,
      kalip,
      /* Eksikse havuzdan tamamlanıyor — moodboard'da boş kutu, panoda
         olduğu gibi "henüz koymadım" değil, "eksik" demek. */
      gorseller:
        p.gorseller.length >= kapasite
          ? p.gorseller.slice(0, kapasite)
          : [...p.gorseller, ...havuz.filter((h) => !p.gorseller.includes(h))].slice(0, kapasite),
    }));
  }

  function gorselDegistir(i: number, src: string) {
    setPano((p) => {
      const g = [...p.gorseller];
      /* Zaten başka kutuda varsa YER DEĞİŞTİRİYOR, kopyalanmıyor: aynı
         kare iki kutuda görünürse moodboard bozuk okunur. */
      const eskiYer = g.indexOf(src);
      if (eskiYer >= 0 && eskiYer !== i) g[eskiYer] = g[i];
      g[i] = src;
      return { ...p, gorseller: g };
    });
  }

  async function paletiYenile() {
    if (!pano.gorseller.length) return;
    setPaletDurum("cikariliyor");
    const renkler = await paletBirlestir(pano.gorseller, 6);
    setPano((p) => ({ ...p, palet: renkler }));
    setPaletDurum("hazir");
    setToast(renkler.length ? `${renkler.length} renk çıkarıldı.` : "Renk çıkarılamadı.");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-5 px-6 pt-8 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
        <div>
          <p className="eyebrow text-fog">Moodboard · Sunum</p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl">{pano.baslik || "Moodboard"}</h1>
        </div>
        <Button
          variant="solid"
          onClick={() => {
            setToast("Yazdırma penceresinde “PDF olarak kaydet”’i seçin.");
            setTimeout(() => window.print(), 400);
          }}
        >
          PDF olarak dışa aktar
        </Button>
      </header>

      <div className="mt-8 grid flex-1 gap-px border-t border-hair bg-hair lg:grid-cols-[300px_1fr]">
        <aside className="flex flex-col gap-8 bg-zemin px-6 py-8">
          <div className="flex flex-col gap-4">
            <Field label="Başlık" htmlFor="mb-baslik">
              <Input
                id="mb-baslik"
                value={pano.baslik}
                onChange={(e) => setPano((p) => ({ ...p, baslik: e.target.value }))}
              />
            </Field>
            <Field label="Yön" htmlFor="mb-yon">
              <Textarea
                id="mb-yon"
                value={pano.yon}
                onChange={(e) => setPano((p) => ({ ...p, yon: e.target.value }))}
              />
            </Field>
            <Field label="Künye" htmlFor="mb-kunye">
              <Input
                id="mb-kunye"
                value={pano.kunye}
                onChange={(e) => setPano((p) => ({ ...p, kunye: e.target.value }))}
              />
            </Field>
          </div>

          <div>
            <p className="eyebrow text-fog">Düzen</p>
            <div className="mt-4 flex flex-col gap-2">
              {KALIPLAR.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => kalipDegistir(k)}
                  className={cn(
                    "border px-3 py-2 text-left text-[13px] transition-colors duration-200",
                    pano.kalip === k
                      ? "border-odak text-kalem"
                      : "border-hair text-fog hover:border-fog hover:text-kalem",
                  )}
                >
                  {KALIP_ADI[k]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="eyebrow text-fog">Palet</p>
              <button
                type="button"
                onClick={paletiYenile}
                className="eyebrow text-fog transition-colors duration-200 hover:text-kalem"
              >
                {paletDurum === "cikariliyor" ? "Çıkarılıyor" : "Yeniden çıkar"}
              </button>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-fog">
              Renkler seçtiğiniz görsellerden örneklendi.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {pano.palet.map((renk, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-7 w-7 shrink-0 border border-hair"
                    style={{ background: renk }}
                  />
                  <input
                    aria-label={`Renk ${i + 1}`}
                    value={renk}
                    onChange={(e) =>
                      setPano((p) => ({
                        ...p,
                        palet: p.palet.map((r, j) => (j === i ? e.target.value : r)),
                      }))
                    }
                    className="w-full border-b border-hair bg-transparent py-1 text-[13px] tabular-nums text-kalem outline-none focus-visible:border-odak"
                  />
                </div>
              ))}
              {!pano.palet.length && paletDurum !== "cikariliyor" && (
                <p className="text-[13px] leading-6 text-fog">Henüz renk çıkarılmadı.</p>
              )}
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-8 bg-zemin px-6 py-8 md:px-10">
          <div
            className="lookbook-tuval w-full max-w-3xl border border-hair"
            style={{ aspectRatio: String(MOODBOARD_ORANI) }}
          >
            <PanoGovde pano={pano} />
          </div>

          {havuz.length > 0 && (
            <div>
              <p className="eyebrow text-fog">
                Görsel havuzu · {KALIP_GORSEL[pano.kalip]} kutu
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {pano.gorseller.map((src, i) => (
                  <div key={i}>
                    <p className="eyebrow text-fog">Kutu {i + 1}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {havuz.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => gorselDegistir(i, h)}
                          className={cn(
                            "relative h-14 w-12 overflow-hidden border transition-colors duration-200",
                            h === src ? "border-odak" : "border-hair hover:border-fog",
                          )}
                        >
                          <Image src={h} alt="" fill unoptimized sizes="48px" className="object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Baskı ağacı — lookbook ile AYNI altyapı, ikinci bir çıktı yolu yok. */}
      <div className="lookbook-baski-kok" aria-hidden>
        <div className="lookbook-sayfa">
          <PanoGovde pano={pano} baski />
        </div>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/** Ekran ve baskı aynı gövdeyi kullanıyor; ölçüler kapsayıcıya oranlı. */
function PanoGovde({ pano, baski = false }: { pano: Moodboard; baski?: boolean }) {
  const dolgu = baski ? "p-[13mm]" : "p-[3.6%]";
  const kutu = KALIP_GORSEL[pano.kalip];

  return (
    <div className={cn("flex h-full w-full flex-col bg-paper text-ink", dolgu)}>
      <div className="flex items-baseline justify-between gap-6">
        <p className="font-display text-[2.6cqw] leading-none">{pano.baslik}</p>
        <p className="text-[1cqw] tracking-[0.18em] uppercase">{pano.kunye}</p>
      </div>

      <div className="mt-[2.4%] grid min-h-0 flex-1 gap-[1.6%]" style={izgara(pano.kalip)}>
        {Array.from({ length: kutu }).map((_, i) => (
          <div key={i} className="relative overflow-hidden bg-mist" style={alan(pano.kalip, i)}>
            {pano.gorseller[i] && (
              <Image
                src={pano.gorseller[i]}
                alt=""
                fill
                unoptimized
                sizes="50vw"
                className="object-cover"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-[2.4%] flex items-end justify-between gap-[4%]">
        <p className="max-w-[58%] text-[1.15cqw] leading-[1.7]">{pano.yon}</p>
        {pano.palet.length > 0 && (
          <div className="flex gap-[0.5cqw]">
            {pano.palet.map((renk, i) => (
              <span key={i} className="flex flex-col items-center gap-[0.4cqw]">
                <span
                  aria-hidden
                  className="h-[3cqw] w-[3cqw] border border-ink/10"
                  style={{ background: renk }}
                />
                <span className="text-[0.72cqw] tabular-nums tracking-[0.1em] uppercase">
                  {renk}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Izgara kalıpları CSS'te değil burada: kalıp sayısı üç ve her biri
   kendi alan haritasını taşıyor. Tailwind sınıfıyla yazmak üç ayrı
   koşullu sınıf demekti ve `grid-area` zaten satır içi değer istiyor. */
function izgara(kalip: Kalip) {
  if (kalip === "uclu") {
    return { gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr" } as const;
  }
  if (kalip === "ikili-genis") {
    return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr" } as const;
  }
  return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" } as const;
}

function alan(kalip: Kalip, i: number) {
  if (kalip === "uclu" && i === 0) return { gridRow: "span 2" } as const;
  return undefined;
}
