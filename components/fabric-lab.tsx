"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { fabrics, type Fabric } from "@/lib/fabrics";
import { cn, formatTRY } from "@/lib/utils";
import { Arrow, Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { Ruler } from "@/components/ui/ruler";
import { site } from "@/lib/site";

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

type Spec = { weight: number; stretch: number; drape: number };
const specOf = (f: Fabric): Spec => ({ weight: f.weight, stretch: f.stretch, drape: f.drape });

/* Makro görselin temsil ettiği gerçek ölçü (1:1) */
const SCALE_W_CM = 10;
const SCALE_H_CM = 7.5;

/**
 * Kumaş — dijital kartela ve ölçüm laboratuvarı.
 * Üstte yatay kaydırılan makro doku kütüphanesi; altta seçili kumaşın cetvelli
 * büyük görseli (tıkla: yakınlaştır) ve metraj / fiziksel özellik paneli.
 */
export function FabricLab() {
  const initial = fabrics[1];
  const [activeId, setActiveId] = useState(initial.id);
  const active = fabrics.find((f) => f.id === activeId) ?? fabrics[0];

  const [spec, setSpec] = useState<Spec>(() => specOf(initial));
  const [length, setLength] = useState("3");
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [kartela, setKartela] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  function select(f: Fabric) {
    setActiveId(f.id);
    setSpec(specOf(f));
    setZoom(false);
  }

  function scrollLibrary(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 380, behavior: "smooth" });
  }

  function onMacroMove(e: ReactMouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  const meters = Math.max(0, parseFloat(length.replace(",", ".")) || 0);
  const area = (active.width / 100) * meters;
  const grams = area * spec.weight;
  const cost = meters * active.price;
  const inKartela = kartela.includes(active.id);
  const specChanged =
    spec.weight !== active.weight || spec.stretch !== active.stretch || spec.drape !== active.drape;

  function toggleKartela() {
    if (inKartela) {
      setKartela((k) => k.filter((id) => id !== active.id));
      setToast(`Karteladan çıkarıldı: ${active.name}`);
    } else {
      setKartela((k) => [...k, active.id]);
      setToast(`Kartelaya eklendi: ${active.name}`);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Başlık */}
      <header className="flex flex-col gap-5 px-6 pt-8 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
        <div>
          <p className="eyebrow text-fog">Kumaş · Dijital kartela</p>
          <h1 className="mt-3 font-display text-2xl leading-none md:text-3xl">Kumaş kütüphanesi</h1>
        </div>
        <div className="flex items-center gap-6">
          <span className="eyebrow tabular-nums text-fog">
            {fabrics.length} kumaş · Kartela ({kartela.length})
          </span>
          <div className="hidden items-center gap-1.5 md:flex">
            <ScrollButton label="Kütüphaneyi geri kaydır" onClick={() => scrollLibrary(-1)} back />
            <ScrollButton label="Kütüphaneyi ileri kaydır" onClick={() => scrollLibrary(1)} />
          </div>
        </div>
      </header>

      {/* Kütüphane — yatay kaydırma */}
      <div
        ref={scroller}
        className="mt-6 flex snap-x gap-5 overflow-x-auto px-6 pb-7 pt-1 scroll-px-6 [scrollbar-width:none] md:px-10 md:scroll-px-10 [&::-webkit-scrollbar]:hidden"
      >
        {fabrics.map((f) => {
          const isActive = f.id === activeId;
          const marked = kartela.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => select(f)}
              aria-pressed={isActive}
              className="group w-[148px] shrink-0 snap-start text-left md:w-[168px]"
            >
              <span className="relative block">
                <span className="relative block aspect-square overflow-hidden bg-hair">
                  <Image
                    src={f.image}
                    alt=""
                    fill
                    sizes="168px"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                  />
                  {marked && <span aria-hidden className="absolute left-2 top-2 h-1.5 w-1.5 bg-kalem" />}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -inset-[3px] border border-kalem transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </span>
              <span
                className={cn(
                  "mt-3.5 block text-[13px] leading-4 transition-colors duration-300",
                  isActive ? "font-medium text-kalem" : "text-fog group-hover:text-kalem",
                )}
              >
                {f.name}
              </span>
              <span className="mt-1.5 block eyebrow text-fog">{f.composition}</span>
            </button>
          );
        })}
        <span aria-hidden className="w-1 shrink-0" />
      </div>

      <div aria-hidden className="mx-6 h-px bg-hair md:mx-10" />

      {/* Laboratuvar */}
      <div className="grid flex-1 lg:grid-cols-12">
        {/* Makro doku + cetvel */}
        <section
          aria-label="Makro doku"
          className="px-6 py-8 md:px-10 md:py-10 lg:col-span-7 lg:border-r lg:border-hair"
        >
          <div className="grid grid-cols-[20px_1fr] grid-rows-[20px_auto] gap-1.5">
            <span aria-hidden />
            <Ruler orientation="h" cm={SCALE_W_CM} className="h-5" />
            <Ruler orientation="v" cm={SCALE_H_CM} className="h-full w-5" />
            <div
              role="button"
              tabIndex={0}
              aria-pressed={zoom}
              aria-label={zoom ? "Yakınlaştırmayı kapat" : "Dokuyu yakınlaştır"}
              onMouseMove={onMacroMove}
              onClick={() => setZoom((z) => !z)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setZoom((z) => !z);
                }
              }}
              className={cn(
                "relative aspect-[4/3] overflow-hidden bg-hair outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-kalem",
                zoom ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
            >
              <Image
                key={active.id}
                src={active.image}
                alt={`${active.name} — makro doku`}
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)]"
                style={{
                  transform: zoom ? "scale(2.4)" : "scale(1)",
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                }}
              />
              <span className="absolute left-3 top-3 bg-paper/85 px-2.5 py-2 eyebrow text-ink backdrop-blur-sm">
                1:1 · <span className="normal-case">{SCALE_W_CM} × {nf.format(SCALE_H_CM)} cm</span>
              </span>
              <span
                aria-hidden
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border border-ink/10 bg-paper/80 text-ink backdrop-blur-sm"
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="M15.5 15.5 20 20" />
                  {zoom ? <path d="M8 10.5h5" /> : <path d="M10.5 8v5M8 10.5h5" />}
                </svg>
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pl-[26px] eyebrow text-fog">
            <span>
              Makro doku · {active.weave} · {active.color}
            </span>
            <span>Desen tekrarı · {active.repeat ? `${active.repeat} cm` : "Yok"}</span>
          </div>
          <p className="mt-2 pl-[26px] text-[11px] leading-4 text-fog">
            {zoom ? "İmleci gezdirerek dokuyu inceleyin; kapatmak için tıklayın." : "Yakınlaştırmak için dokuya tıklayın."}
          </p>
        </section>

        {/* Ölçüm paneli */}
        <aside aria-label="Ölçüm laboratuvarı" className="px-6 py-8 md:px-10 md:py-10 lg:col-span-5">
          <p className="eyebrow text-fog">Ölçüm laboratuvarı</p>
          <h2 className="mt-3 font-display text-3xl leading-none md:text-4xl">{active.name}</h2>
          <p className="mt-3 eyebrow text-fog">
            {active.composition} · {active.color}
          </p>

          <section className="mt-10 border-t border-hair pt-8">
            <div className="flex items-baseline justify-between">
              <h3 className="eyebrow">Metraj</h3>
              <span className="eyebrow tabular-nums text-fog">{formatTRY(active.price)} / m</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-8">
              <Field label="En" htmlFor="fabric-width" trailing="cm">
                <p id="fabric-width" className="border-b border-hair py-3 text-[15px] leading-6 tabular-nums">
                  {active.width}
                </p>
              </Field>
              <Field label="İstenen uzunluk" htmlFor="fabric-length" trailing="metre">
                <Input
                  id="fabric-length"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="tabular-nums"
                />
              </Field>
            </div>
            <dl className="mt-7 grid grid-cols-3 gap-4">
              <Stat label="Alan" value={`${nf.format(area)} m²`} />
              <Stat label="Ağırlık" value={grams >= 1000 ? `${nf.format(grams / 1000)} kg` : `${nf0.format(grams)} g`} />
              <Stat label="Tahmini tutar" value={formatTRY(cost)} />
            </dl>
          </section>

          <section className="mt-10 border-t border-hair pt-8">
            <div className="flex items-baseline justify-between">
              <h3 className="eyebrow">Fiziksel özellikler</h3>
              {specChanged && (
                <button
                  type="button"
                  onClick={() => setSpec(specOf(active))}
                  className="fade eyebrow text-fog u-line hover:text-kalem"
                >
                  Kumaşın değerlerine dön
                </button>
              )}
            </div>
            <div className="mt-7 space-y-8">
              <Slider
                id="spec-weight"
                label="Ağırlık"
                value={spec.weight}
                min={40}
                max={600}
                step={1}
                onChange={(v) => setSpec((s) => ({ ...s, weight: v }))}
                format={(v) => `${v} g/m²`}
                hints={["40 · İnce", "600 · Ağır"]}
              />
              <Slider
                id="spec-stretch"
                label="Esneklik"
                value={spec.stretch}
                min={0}
                max={40}
                onChange={(v) => setSpec((s) => ({ ...s, stretch: v }))}
                format={(v) => `%${v}`}
                hints={["Sabit", "Yüksek esneme"]}
              />
              <Slider
                id="spec-drape"
                label="Döküm"
                value={spec.drape}
                min={0}
                max={100}
                onChange={(v) => setSpec((s) => ({ ...s, drape: v }))}
                format={(v) => (v < 34 ? "Sert" : v < 67 ? "Orta" : "Akışkan")}
                hints={["Sert", "Akışkan"]}
              />
            </div>
          </section>

          <div className="mt-10 flex flex-col gap-5 border-t border-hair pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button variant={inKartela ? "ghost" : "solid"} onClick={toggleKartela}>
              {inKartela ? "Karteladan çıkar" : "Kartelaya ekle"}
            </Button>
            <a
              href={`mailto:${site.email}?subject=${encodeURIComponent(`Numune: ${active.name}`)}`}
              className="group inline-flex items-center gap-3 eyebrow u-line"
            >
              Numune iste
              <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
            </a>
          </div>
        </aside>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow text-fog">{label}</dt>
      <dd className="mt-2 font-display text-xl tabular-nums md:text-2xl">{value}</dd>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hints,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  hints: [string, string];
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="eyebrow text-fog">
          {label}
        </label>
        <span className="text-sm tabular-nums">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        className="slider mt-3"
        style={{ "--p": `${pct}%` } as CSSProperties}
      />
      <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[0.14em] text-fog/80">
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}

function ScrollButton({ label, onClick, back }: { label: string; onClick: () => void; back?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center border border-kalem/10 text-kalem/60 transition-colors duration-300 hover:border-kalem/40 hover:text-kalem"
    >
      <Arrow className={cn(back && "rotate-180")} />
    </button>
  );
}
