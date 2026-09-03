"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import {
  DUZENLER,
  DUZEN_ADI,
  DUZEN_GORSEL,
  SAYFA_ORANI,
  ornekLookbook,
  tohumdanLookbook,
  type Lookbook,
  type Sayfa,
  type SayfaDuzen,
} from "@/lib/lookbook";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   LOOKBOOK STÜDYOSU

   Akıştan kurulmuş kitabı düzenlemek için. Diğer araçlardan farkı:
   burada üretilen şey bir çalışma değil ÇIKTI — alıcıya gönderilen
   dosya. Bu yüzden ekranın merkezinde araçlar değil SAYFA duruyor.

   Dışa aktarma yazdırma üzerinden (bkz. globals.css, "LOOKBOOK
   BASKISI"). Sayfaların tamamı görünmez bir baskı ağacında sürekli
   DOM'da duruyor: yazdırma anında üretilemez, görsellerin çoktan
   yüklenmiş olması gerekiyor.
   ------------------------------------------------------------------ */

export function LookbookStudio({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [kitap, setKitap] = useState<Lookbook>(() =>
    tohum ? tohumdanLookbook(tohum) : ornekLookbook,
  );
  const [aktif, setAktif] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  /* Havuz: sayfalara konabilecek görseller. Tohum yoksa boş ve kullanıcı
     yalnız metin sayfalarıyla çalışır — araç yine de çalışır durumda. */
  const havuz = tohum ? [...tohum.ilham, ...Object.values(tohum.turetilmis)] : [];

  const sayfa = kitap.sayfalar[aktif];

  function sayfayiDegistir(yama: Partial<Sayfa>) {
    setKitap((k) => ({
      ...k,
      sayfalar: k.sayfalar.map((s, i) => (i === aktif ? { ...s, ...yama } : s)),
    }));
  }

  function duzenDegistir(duzen: SayfaDuzen) {
    /* Düzen değişince görsel sayısı da değişiyor. Fazlası KIRPILIYOR,
       eksiği havuzdan tamamlanmıyor: kullanıcının koyduğu görseli
       sessizce başkasıyla değiştirmek, en sinir bozucu düzenleyici
       davranışı. */
    const kapasite = DUZEN_GORSEL[duzen];
    sayfayiDegistir({ duzen, gorseller: sayfa.gorseller.slice(0, kapasite) });
  }

  function gorselKoy(src: string) {
    const kapasite = DUZEN_GORSEL[sayfa.duzen];
    if (kapasite === 0) {
      setToast("Metin sayfası görsel taşımıyor. Önce düzeni değiştirin.");
      return;
    }
    const mevcut = sayfa.gorseller;
    /* Doluysa sondan iterek ekliyoruz: kullanıcı arka arkaya tıklayınca
       ikili sayfada iki görsel de değişebilsin. */
    const yeni = mevcut.length < kapasite ? [...mevcut, src] : [...mevcut.slice(1), src];
    sayfayiDegistir({ gorseller: yeni });
  }

  function sayfaEkle() {
    const yeni: Sayfa = {
      id: `s-${Date.now()}`,
      duzen: "tam",
      gorseller: [],
      altyazi: "",
    };
    setKitap((k) => ({ ...k, sayfalar: [...k.sayfalar, yeni] }));
    setAktif(kitap.sayfalar.length);
  }

  function sayfaSil(i: number) {
    if (kitap.sayfalar.length <= 1) {
      setToast("Kitapta en az bir sayfa kalmalı.");
      return;
    }
    setKitap((k) => ({ ...k, sayfalar: k.sayfalar.filter((_, j) => j !== i) }));
    setAktif((a) => Math.max(0, a >= i ? a - 1 : a));
  }

  function tasi(i: number, yon: -1 | 1) {
    const hedef = i + yon;
    if (hedef < 0 || hedef >= kitap.sayfalar.length) return;
    setKitap((k) => {
      const s = [...k.sayfalar];
      [s[i], s[hedef]] = [s[hedef], s[i]];
      return { ...k, sayfalar: s };
    });
    setAktif(hedef);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-5 px-6 pt-8 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
        <div>
          <p className="eyebrow text-fog">Lookbook · Sunum</p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl">{kitap.baslik || "Lookbook"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="eyebrow text-fog">{kitap.sayfalar.length} sayfa</p>
          <Button
            variant="solid"
            onClick={() => {
              /* Yazdırma diyaloğu tarayıcının; "PDF olarak kaydet" oradan
                 seçiliyor. Kendi PDF motorumuzu taşımamanın bedeli bu tek
                 cümlelik yönlendirme. */
              setToast("Yazdırma penceresinde “PDF olarak kaydet”’i seçin.");
              setTimeout(() => window.print(), 400);
            }}
          >
            PDF olarak dışa aktar
          </Button>
        </div>
      </header>

      <div className="mt-8 grid flex-1 gap-px border-t border-hair bg-hair lg:grid-cols-[300px_1fr]">
        {/* ── Sol: kitap künyesi + sayfa listesi ── */}
        <aside className="flex flex-col gap-8 bg-zemin px-6 py-8">
          <div className="flex flex-col gap-4">
            <Field label="Başlık" htmlFor="lb-baslik">
              <Input
                id="lb-baslik"
                value={kitap.baslik}
                onChange={(e) => setKitap((k) => ({ ...k, baslik: e.target.value }))}
              />
            </Field>
            <Field label="Alt başlık" htmlFor="lb-alt">
              <Input
                id="lb-alt"
                value={kitap.altBaslik}
                onChange={(e) => setKitap((k) => ({ ...k, altBaslik: e.target.value }))}
              />
            </Field>
            <Field label="Künye" htmlFor="lb-kunye">
              <Input
                id="lb-kunye"
                value={kitap.kunye}
                onChange={(e) => setKitap((k) => ({ ...k, kunye: e.target.value }))}
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="eyebrow text-fog">Sayfalar</p>
              <button
                type="button"
                onClick={sayfaEkle}
                className="eyebrow text-fog transition-colors duration-200 hover:text-kalem"
              >
                Ekle
              </button>
            </div>
            <ol className="mt-4 flex flex-col gap-2">
              {kitap.sayfalar.map((s, i) => (
                <li key={s.id}>
                  <div
                    className={cn(
                      "flex items-center gap-3 border px-3 py-2 transition-colors duration-200",
                      i === aktif ? "border-odak" : "border-hair hover:border-fog",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setAktif(i)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span className="eyebrow tabular-nums text-fog">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[13px] text-kalem">{DUZEN_ADI[s.duzen]}</span>
                    </button>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => tasi(i, -1)}
                        disabled={i === 0}
                        aria-label="Yukarı taşı"
                        className="eyebrow px-1 text-fog transition-colors duration-200 hover:text-kalem disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => tasi(i, 1)}
                        disabled={i === kitap.sayfalar.length - 1}
                        aria-label="Aşağı taşı"
                        className="eyebrow px-1 text-fog transition-colors duration-200 hover:text-kalem disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => sayfaSil(i)}
                        aria-label="Sayfayı sil"
                        className="eyebrow px-1 text-fog transition-colors duration-200 hover:text-kalem"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        {/* ── Sağ: seçili sayfanın düzenleyicisi ── */}
        <section className="flex flex-col gap-8 bg-zemin px-6 py-8 md:px-10">
          <div className="flex flex-wrap items-center gap-2">
            {DUZENLER.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => duzenDegistir(d)}
                className={cn(
                  "border px-3.5 py-1.5 text-[12px] transition-colors duration-200",
                  sayfa.duzen === d
                    ? "border-odak text-kalem"
                    : "border-hair text-fog hover:border-fog hover:text-kalem",
                )}
              >
                {DUZEN_ADI[d]}
              </button>
            ))}
          </div>

          {/* Sayfa önizlemesi — kâğıtla BİREBİR aynı oran. */}
          <div
            className="lookbook-tuval w-full max-w-3xl border border-hair"
            style={{ aspectRatio: String(SAYFA_ORANI) }}
          >
            <SayfaGovde sayfa={sayfa} kitap={kitap} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={sayfa.duzen === "metin" ? "Başlık" : "Üst yazı"} htmlFor="lb-sayfa-baslik">
              <Input
                id="lb-sayfa-baslik"
                value={sayfa.baslik ?? ""}
                onChange={(e) => sayfayiDegistir({ baslik: e.target.value })}
              />
            </Field>
            <Field label={sayfa.duzen === "metin" ? "Metin" : "Alt yazı"} htmlFor="lb-sayfa-alt">
              <Input
                id="lb-sayfa-alt"
                value={sayfa.altyazi ?? ""}
                onChange={(e) => sayfayiDegistir({ altyazi: e.target.value })}
              />
            </Field>
          </div>

          {havuz.length > 0 && (
            <div>
              <p className="eyebrow text-fog">
                Görsel havuzu · {DUZEN_GORSEL[sayfa.duzen]} görsellik sayfa
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {havuz.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => gorselKoy(src)}
                    className={cn(
                      "relative h-20 w-16 overflow-hidden border transition-colors duration-200",
                      sayfa.gorseller.includes(src)
                        ? "border-odak"
                        : "border-hair hover:border-fog",
                    )}
                  >
                    <Image src={src} alt="" fill unoptimized sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Baskı ağacı ── ekranda görünmez, DOM'da hep hazır. */}
      <div className="lookbook-baski-kok" aria-hidden>
        {kitap.sayfalar.map((s) => (
          <div key={s.id} className="lookbook-sayfa">
            <SayfaGovde sayfa={s} kitap={kitap} baski />
          </div>
        ))}
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/**
 * Sayfanın kendisi. Ekran önizlemesi ve baskı AYNI bileşeni kullanıyor —
 * ikisini ayrı yazmak, birinde düzeltilen dizginin ötekinde bozuk
 * kalması demekti. Tek fark ölçü birimi: ekranda oransal, baskıda
 * milimetre.
 */
function SayfaGovde({
  sayfa,
  kitap,
  baski = false,
}: {
  sayfa: Sayfa;
  kitap: Lookbook;
  baski?: boolean;
}) {
  const dolgu = baski ? "p-[14mm]" : "p-[4%]";

  if (sayfa.duzen === "kapak") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-ink text-paper">
        {sayfa.gorseller[0] && (
          <Image src={sayfa.gorseller[0]} alt="" fill unoptimized sizes="100vw" className="object-cover" />
        )}
        {/* Kapak yazısı fotoğrafın üstünde: peçe olmadan okunmaz. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className={cn("absolute inset-0 flex flex-col justify-end", dolgu)}>
          <p className="font-display text-[4.5cqw] leading-[1.05]">{sayfa.baslik || kitap.baslik}</p>
          {(sayfa.altyazi || kitap.altBaslik) && (
            <p className="mt-[1.5%] text-[1.4cqw] tracking-[0.18em] uppercase">
              {sayfa.altyazi || kitap.altBaslik}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (sayfa.duzen === "metin") {
    return (
      <div className={cn("flex h-full w-full flex-col justify-center bg-paper text-ink", dolgu)}>
        <p className="text-[1.2cqw] tracking-[0.18em] uppercase">{sayfa.baslik}</p>
        <p className="mt-[3%] max-w-[60%] font-display text-[2.6cqw] leading-[1.3]">
          {sayfa.altyazi}
        </p>
        <p className="mt-auto text-[1cqw] tracking-[0.18em] uppercase">{kitap.kunye}</p>
      </div>
    );
  }

  const kolon = sayfa.duzen === "ikili" ? 2 : 1;
  return (
    <div className={cn("flex h-full w-full flex-col bg-paper text-ink", dolgu)}>
      {sayfa.baslik && (
        <p className="mb-[2%] text-[1.1cqw] tracking-[0.18em] uppercase">{sayfa.baslik}</p>
      )}
      <div
        className="grid min-h-0 flex-1 gap-[2%]"
        style={{ gridTemplateColumns: `repeat(${kolon}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: kolon }).map((_, i) => (
          <div key={i} className="relative overflow-hidden bg-mist">
            {sayfa.gorseller[i] && (
              <Image
                src={sayfa.gorseller[i]}
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
      {sayfa.altyazi && (
        <p className="mt-[2%] text-[1.1cqw] tracking-[0.18em] uppercase">{sayfa.altyazi}</p>
      )}
    </div>
  );
}
