"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DotField } from "@/components/dot-field";
import { PromptAurora } from "@/components/prompt-aurora";
import { Arrow } from "@/components/ui/button";

/**
 * Hero — siyah zemin, sabit lila yıkama, imlece tepki veren nokta ızgarası ve
 * prompt kutusunun dönen ışık halkası.
 *
 * Katman sırası aşağıdan yukarı:
 *   1. siyah zemin
 *   2. sabit lila yıkama (animasyonsuz)
 *   3. nokta ızgarası (canvas, imleçle etkileşimli)
 *   4. okunurluk perdeleri
 *   5. içerik + prompt kutusu halkası
 *
 * Hero'da hareket eden TEK şey prompt kutusunun halkası. Zemin bilerek sabit:
 * hareketli bulanık kütleler şeklin kendisini yok ediyordu ve kutunun
 * backdrop-blur'ünü her karede yeniden hesaplatıyordu.
 */

const ipuclari = ["Koleksiyon", "Ürün", "Lookbook", "Teknik çizim"];

export function Hero() {
  const router = useRouter();
  const [istek, setIstek] = useState("");

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    // Girdiyi stüdyoya taşı; stüdyo kendi akışında karşılıyor.
    const q = istek.trim();
    router.push(q ? `/hizmetler/kompozisyon?fikir=${encodeURIComponent(q)}` : "/hizmetler/kompozisyon");
  }

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-paper">
      {/* ── 2. katman: zemin yıkaması ve kavisler ─────────────────
          Kavisler hero'nun asıl hareketi: dev bir dairenin kenar bandı,
          maskeyle kesilmiş, yavaşça dönüyor. Zemin yıkaması altlarında
          sadece rengi tutuyor. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <div className="selvi-zemin absolute inset-0" />
        <div className="selvi-kavis selvi-kavis-2" />
        <div className="selvi-kavis selvi-kavis-1" />
      </div>

      {/* ── 3. katman: nokta ızgarası ─────────────────────────────── */}
      <DotField className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />

      {/* ── 4. katman: okunurluk perdesi ───────────────────────────
          Eskiden merkezde %94'e çıkıyordu; o zaman arkada parlak aurora
          kütleleri vardı. Artık zemin sabit ve sönük, ızgaranın da tam
          burada görünmesi gerekiyor — perde hafifletildi. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(88%_58%_at_50%_30%,rgba(11,11,11,0.62)_0%,rgba(11,11,11,0.4)_40%,rgba(11,11,11,0.12)_66%,transparent_84%)]"
      />

      {/* ── 5. katman: içerik ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pt-24 text-center md:px-10 [@media(max-height:820px)]:pt-16">
        <h1 className="rise rise-2 mt-7 max-w-[16ch] [@media(max-height:820px)]:mt-4 font-sans font-medium text-[13vw] leading-[0.98] tracking-[-0.035em] sm:text-[9.5vw] md:text-[6rem] lg:text-[6.8rem]">
          Yapay zekâ hızında tasarla
        </h1>

        <p className="rise rise-3 mt-7 max-w-[52ch] [@media(max-height:820px)]:mt-4 text-[15px] leading-7 text-paper/70 md:text-base">
          Öğrenme, tasarım, görselleştirme ve satış tek platformda.
          <span className="text-paper"> Learn → Create → Sell.</span>
        </p>

        {/* Prompt kutusu — gerçek bir giriş kapısı, sahte demo değil */}
        <form
          onSubmit={gonder}
          className="selvi-kutu rise rise-3 mt-10 w-full max-w-2xl [@media(max-height:820px)]:mt-6 bg-ink/35 text-left backdrop-blur-xl"
        >
          <PromptAurora />
          {/* Konumlanmış kardeşler akış içeriğinden SONRA boyanır; içeriği kendi
              yığın seviyesine almazsak hâle metnin üstüne yayılır. */}
          <div className="relative z-10 p-4 md:p-5">
          <label htmlFor="hero-fikir" className="sr-only">
            Ne tasarlamak istiyorsun?
          </label>
          <input
            id="hero-fikir"
            value={istek}
            onChange={(e) => setIstek(e.target.value)}
            placeholder="Ne tasarlamak istiyorsun?"
            className="w-full bg-transparent text-[15px] leading-7 text-paper outline-none placeholder:text-paper/45 md:text-base"
          />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {ipuclari.map((ip) => (
              <button
                key={ip}
                type="button"
                onClick={() => setIstek(ip)}
                className="rounded-full border border-paper/15 px-3.5 py-1.5 text-[12px] text-paper/70 transition-colors duration-200 hover:border-paper/35 hover:text-paper"
              >
                {ip}
              </button>
            ))}
            <button
              type="submit"
              aria-label="Stüdyoya git"
              className="group ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink transition-colors duration-300 hover:bg-lila-soft"
            >
              <Arrow className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-0.5" />
            </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Alt şerit ─────────────────────────────────────────────── */}
      <div className="rise rise-3 px-5 pb-9 md:px-10 md:pb-11 [@media(max-height:820px)]:pb-5">
        <div className="flex flex-col gap-6 border-t border-paper/12 pt-6 sm:flex-row sm:items-start sm:justify-between [@media(max-height:820px)]:gap-4 [@media(max-height:820px)]:pt-4">
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <dt className="text-[15px] font-semibold leading-tight">Learn → Create → Sell</dt>
              <dd className="mt-1.5 eyebrow text-paper/45">Tek platform</dd>
            </div>
          </dl>
          <p className="max-w-[36ch] text-[15px] leading-7 text-paper/65 sm:text-right">
            Fashion is where we start. <span className="text-paper">Design is where we go.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
