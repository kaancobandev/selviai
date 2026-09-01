"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DotField } from "@/components/dot-field";
import { Arrow } from "@/components/ui/button";

/**
 * Hero — siyah zemin, arkada akan aurora, üstte imlece tepki veren nokta ızgarası.
 *
 * Katman sırası aşağıdan yukarı:
 *   1. siyah zemin
 *   2. aurora kütleleri (bulanık, yavaş hareketli — `aurora-*` animasyonları)
 *   3. nokta ızgarası (canvas, imleçle etkileşimli)
 *   4. okunurluk perdeleri
 *   5. içerik
 *
 * Aurora bilinçli olarak noktaların ALTINDA: nokta dokusu aurora parladıkça
 * ortaya çıkıyor, tek başına siyah zeminde neredeyse görünmüyor.
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
    <section className="relative isolate flex h-[100svh] min-h-[680px] flex-col overflow-hidden bg-ink text-paper">
      {/* ── 2. katman: aurora ─────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        <div
          className="aurora-sol absolute -bottom-[22%] -left-[12%] h-[72%] w-[54%] rounded-full blur-[80px]"
          style={{
            background:
              "radial-gradient(closest-side, #e2d3ff 0%, #a97cf0 22%, #6d3ec4 44%, #24308f 66%, transparent 84%)",
          }}
        />
        <div
          className="aurora-sag absolute -bottom-[24%] -right-[12%] h-[74%] w-[56%] rounded-full blur-[80px]"
          style={{
            background:
              "radial-gradient(closest-side, #d8e6ff 0%, #7aa2f0 20%, #8b5cf6 42%, #3b2a9c 66%, transparent 84%)",
          }}
        />
        {/* Alt kenarı iki kütle arasında bağlayan ince ışık sırtı */}
        <div
          className="aurora-orta absolute -bottom-[50%] left-1/2 h-[72%] w-[80%] -translate-x-1/2 rounded-[50%] blur-[70px]"
          style={{
            background:
              "radial-gradient(closest-side, transparent 62%, #7c3aed 72%, #c9a3ff 78%, #5b2ea8 86%, transparent 96%)",
          }}
        />
      </div>

      {/* ── 3. katman: nokta ızgarası ─────────────────────────────── */}
      <DotField className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />

      {/* ── 4. katman: okunurluk perdeleri ────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(95%_62%_at_50%_28%,rgba(11,11,11,0.94)_0%,rgba(11,11,11,0.72)_38%,rgba(11,11,11,0.25)_62%,transparent_80%)]"
      />

      {/* ── 5. katman: içerik ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pt-24 text-center md:px-10">
        <p className="rise rise-1 eyebrow text-lila-soft">
          Yapay zekâ destekli yaratıcı tasarım platformu
        </p>

        <h1 className="rise rise-2 mt-7 max-w-[16ch] font-display text-[14vw] leading-[0.95] tracking-[-0.02em] sm:text-[10vw] md:text-[6.5rem] lg:text-[7.5rem]">
          Yapay zekâ hızında tasarla
        </h1>

        <p className="rise rise-3 mt-7 max-w-[52ch] text-[15px] leading-7 text-paper/70 md:text-base">
          Öğrenme, tasarım, görselleştirme ve satış tek platformda.
          <span className="text-paper"> Learn → Create → Sell.</span>
        </p>

        {/* Prompt kutusu — gerçek bir giriş kapısı, sahte demo değil */}
        <form
          onSubmit={gonder}
          className="rise rise-3 mt-10 w-full max-w-2xl rounded-2xl border border-paper/15 bg-paper/[0.06] p-4 text-left backdrop-blur-xl transition-colors duration-300 focus-within:border-lila-soft/50 md:p-5"
        >
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
        </form>
      </div>

      {/* ── Alt şerit ─────────────────────────────────────────────── */}
      <div className="rise rise-3 px-5 pb-9 md:px-10 md:pb-11">
        <div className="flex flex-col gap-6 border-t border-paper/12 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <dt className="text-[15px] font-semibold leading-tight">Learn → Create → Sell</dt>
              <dd className="mt-1.5 eyebrow text-paper/45">Tek platform</dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold leading-tight">Moda</dt>
              <dd className="mt-1.5 eyebrow text-paper/45">İlk dikey</dd>
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
