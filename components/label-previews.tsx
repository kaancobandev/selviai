import type { CSSProperties } from "react";
import {
  careMaterialHex,
  inkById,
  paperHex,
  parseSize,
  type CareConfig,
  type HangConfig,
  type LabelContent,
  type WovenConfig,
} from "@/lib/labels";
import { onColor } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { CareGlyph, WashSymbol } from "@/components/care-symbols";

/* Tüm ölçüler milimetre; --mm değişkeni px/mm ölçeğini belirler. */
const mm = (v: number) => `calc(${v} * var(--mm))`;

type Common = { content: LabelContent; className?: string };

/* ------------------------------------------------------------------
   Dokuma etiket
   ------------------------------------------------------------------ */
export function WovenLabel({ content, config, className }: Common & { config: WovenConfig }) {
  const { w, h } = parseSize(config.size);
  const ground = inkById(config.ground).hex;
  const thread = inkById(config.thread).hex;
  const brand = content.brand.trim() || "Marka";
  const centerFold = config.fold === "center";
  const endFold = config.fold === "end";

  const texture: CSSProperties = {
    backgroundImage:
      config.weave === "satin"
        ? "repeating-linear-gradient(0deg, currentColor 0 0.5px, transparent 0.5px 2px)"
        : "repeating-linear-gradient(45deg, currentColor 0 0.5px, transparent 0.5px 2.4px), repeating-linear-gradient(-45deg, currentColor 0 0.5px, transparent 0.5px 2.4px)",
    opacity: config.weave === "taffeta" ? 0.08 : 0.14,
  };

  return (
    <div
      className={cn("relative overflow-hidden border border-ink/15", className)}
      style={{ width: mm(w), height: mm(h), background: ground, color: thread }}
      aria-label={`Dokuma etiket ${w} × ${h} mm`}
    >
      <div aria-hidden className="absolute inset-0" style={texture} />

      {/* dikiş payı — düz kesimde dört kenar, katlamalıda yalnızca açık kenar */}
      {config.fold === "straight" && (
        <div aria-hidden className="absolute border border-dashed" style={{ inset: mm(2), borderColor: thread, opacity: 0.3 }} />
      )}
      {centerFold && (
        <div
          aria-hidden
          className="absolute inset-x-0 border-t border-dashed"
          style={{ top: "50%", borderColor: thread, opacity: 0.5 }}
        />
      )}
      {endFold && (
        <>
          <div aria-hidden className="absolute inset-y-0 border-l border-dashed" style={{ left: mm(5), borderColor: thread, opacity: 0.5 }} />
          <div aria-hidden className="absolute inset-y-0 border-l border-dashed" style={{ right: mm(5), borderColor: thread, opacity: 0.5 }} />
        </>
      )}

      {/* içerik — orta katlamada üst yarı */}
      <div
        className="absolute inset-x-0 flex flex-col items-center justify-center"
        style={{ top: 0, height: centerFold ? "50%" : "100%", gap: mm(h * 0.06) }}
      >
        <span
          className="font-display uppercase leading-none"
          style={{ fontSize: mm((centerFold ? h * 0.5 : h) * 0.34), letterSpacing: "0.18em" }}
        >
          {brand}
        </span>
        {config.showOrigin && !centerFold && (
          <span className="font-sans uppercase leading-none" style={{ fontSize: mm(h * 0.11), letterSpacing: "0.22em", opacity: 0.8 }}>
            {content.origin || "İstanbul"}
          </span>
        )}
      </div>
      {centerFold && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ height: "50%" }}>
          <span
            className="font-sans uppercase leading-none"
            style={{ fontSize: mm(h * 0.1), letterSpacing: "0.22em", opacity: 0.7 }}
          >
            {config.showOrigin ? content.origin || "İstanbul" : content.size}
            {config.showOrigin && content.size ? ` · ${content.size}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Asma etiket
   ------------------------------------------------------------------ */
export function HangTag({ content, config, className }: Common & { config: HangConfig }) {
  const { w, h } = parseSize(config.size);
  const paper = paperHex[config.paper];
  const ink = onColor(paper);
  const text =
    config.print === "foil" ? "#B08D57" : config.print === "emboss" ? (config.paper === "black" ? "#3A3A3A" : "#B9B1A3") : ink;
  const brand = content.brand.trim() || "Marka";
  const mono = brand[0]?.toLocaleUpperCase("tr-TR") ?? "M";
  const cordColor = config.cord === "satin" ? "#9A2B2B" : config.cord === "waxed" ? "#2B2A28" : "#D8CFC0";
  const cordW = config.cord === "satin" ? 1.4 : 0.5;

  return (
    <div className={cn("relative", className)} style={{ width: mm(w), paddingTop: mm(14) }} aria-label={`Asma etiket ${w} × ${h} mm`}>
      {/* ip */}
      <svg
        aria-hidden
        className="absolute left-0 top-0"
        style={{ width: mm(w), height: mm(20) }}
        viewBox={`0 0 ${w} 20`}
        fill="none"
      >
        <path d={`M${w / 2} 20C${w / 2 - 7} 9 ${w / 2 - 5} 1 ${w / 2} 1S${w / 2 + 7} 9 ${w / 2} 20`} stroke={cordColor} strokeWidth={cordW} />
      </svg>

      <div
        className="relative overflow-hidden border border-ink/15"
        style={{ width: mm(w), height: mm(h), background: paper, color: text, borderRadius: config.corner === "round" ? mm(3) : 0 }}
      >
        {/* delik */}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 rounded-full border bg-paper"
          style={{ top: mm(6), width: mm(3), height: mm(3), borderColor: "rgba(11,11,11,0.35)" }}
        />
        {/* gofre / yaldız dokusu ipucu */}
        {config.print === "emboss" && (
          <span aria-hidden className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.35)" }} />
        )}

        <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: mm(16), paddingInline: mm(5) }}>
          <span className="font-display leading-none" style={{ fontSize: mm(w * 0.2) }}>
            {mono}
          </span>
          <span className="mt-[0.4em] font-display uppercase leading-none" style={{ fontSize: mm(w * 0.07), letterSpacing: "0.2em", marginTop: mm(3) }}>
            {brand}
          </span>
          <span aria-hidden className="block" style={{ width: mm(w * 0.3), height: 1, background: text, opacity: 0.5, marginTop: mm(4) }} />
          <span className="font-display italic leading-tight" style={{ fontSize: mm(w * 0.075), marginTop: mm(4) }}>
            {content.product || "Ürün"}
          </span>
        </div>

        <div
          className="absolute inset-x-0 flex items-end justify-between font-sans uppercase leading-none"
          style={{ bottom: mm(5), paddingInline: mm(4), fontSize: mm(w * 0.045), letterSpacing: "0.18em", opacity: 0.9 }}
        >
          <span>{content.size ? `Beden ${content.size}` : ""}</span>
          <span>{config.showPrice ? content.price : ""}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Bakım etiketi
   ------------------------------------------------------------------ */
export function CareLabel({ content, config, className }: Common & { config: CareConfig }) {
  const { w, h } = parseSize(config.size);
  const bg = careMaterialHex[config.material];
  const glyph = mm(w * 0.16);
  const symbols = (Object.keys(config.symbols) as (keyof typeof config.symbols)[]).filter((k) => config.symbols[k]);

  return (
    <div
      className={cn("relative overflow-hidden border border-ink/15 font-sans text-[#1a1a1a]", className)}
      style={{ width: mm(w), height: mm(h), background: bg }}
      aria-label={`Bakım etiketi ${w} × ${h} mm`}
    >
      {/* dikiş kenarı */}
      <div aria-hidden className="absolute inset-x-0 border-t border-dashed border-ink/30" style={{ top: mm(2.5) }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: `${mm(6)} ${mm(3)} ${mm(3)}`, gap: mm(2.2) }}>
        <span className="font-display uppercase leading-none" style={{ fontSize: mm(w * 0.09), letterSpacing: "0.2em" }}>
          {content.brand.trim() || "Marka"}
        </span>
        <span aria-hidden className="block w-full bg-ink/20" style={{ height: 1 }} />
        <span className="leading-tight" style={{ fontSize: mm(w * 0.075) }}>
          {content.composition || "İçerik"}
        </span>

        <div className="flex flex-wrap items-center" style={{ gap: mm(1.4), marginTop: mm(0.5) }}>
          <WashSymbol temp={config.wash} style={{ width: glyph, height: glyph }} />
          {symbols.map((s) => (
            <CareGlyph key={s} symbol={s} style={{ width: glyph, height: glyph }} />
          ))}
        </div>

        <div className="mt-auto flex flex-col leading-tight" style={{ fontSize: mm(w * 0.062), gap: mm(0.8) }}>
          <span className="uppercase" style={{ letterSpacing: "0.14em" }}>
            Beden {content.size || "—"}
          </span>
          <span>Türkiye&apos;de üretildi</span>
          {config.lang === "tr-en" && <span style={{ opacity: 0.75 }}>Made in Türkiye</span>}
          <span className="tabular-nums" style={{ opacity: 0.6 }}>
            LOT 26-04
          </span>
        </div>
      </div>
    </div>
  );
}
