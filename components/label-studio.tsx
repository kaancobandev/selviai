"use client";

import { useState, type ReactNode } from "react";
import {
  careMaterials,
  careSizes,
  careSymbolLabels,
  cords,
  corners,
  defaultCare,
  defaultContent,
  defaultHang,
  defaultWoven,
  folds,
  hangSizes,
  inkById,
  inks,
  labelTypes,
  papers,
  parseSize,
  prints,
  tierFactor,
  unitPriceCare,
  unitPriceHang,
  unitPriceWoven,
  weaves,
  wovenSizes,
  type CareConfig,
  type CareSymbol,
  type HangConfig,
  type LabelContent,
  type LabelType,
  type Option,
  type WovenConfig,
} from "@/lib/labels";
import { cn, formatTRY } from "@/lib/utils";
import { Arrow, Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Ruler } from "@/components/ui/ruler";
import { Toast } from "@/components/ui/toast";
import { CareLabel, HangTag, WovenLabel } from "@/components/label-previews";
import { site } from "@/lib/site";

const STAGE_W_CM = 14;
const STAGE_H_CM: Record<LabelType, number> = { woven: 7, hang: 14, care: 12 };
const mm = (v: number) => `calc(${v} * var(--mm))`;
const unitFmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lab = <T extends string>(opts: Option<T>[], v: T) => opts.find((o) => o.value === v)?.label ?? v;

/**
 * Etiket stüdyosu — üstte üç etiket türü, solda cetvelli 1:1 sahne,
 * sağda şartname paneli; altta set özeti ve üretim şartnamesi.
 */
export function LabelStudio() {
  const [type, setType] = useState<LabelType>("woven");
  const [content, setContent] = useState<LabelContent>(defaultContent);
  const [woven, setWoven] = useState<WovenConfig>(defaultWoven);
  const [hang, setHang] = useState<HangConfig>(defaultHang);
  const [care, setCare] = useState<CareConfig>(defaultCare);
  const [qty, setQty] = useState<Record<LabelType, string>>({ woven: "500", hang: "500", care: "500" });
  const [added, setAdded] = useState<Record<LabelType, boolean>>({ woven: false, hang: false, care: false });
  const [toast, setToast] = useState<string | null>(null);

  const setC = (k: keyof LabelContent) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setContent((c) => ({ ...c, [k]: e.target.value }));

  const basePrice: Record<LabelType, number> = {
    woven: unitPriceWoven(woven),
    hang: unitPriceHang(hang),
    care: unitPriceCare(care),
  };
  const q = (t: LabelType) => Math.max(0, parseInt(qty[t], 10) || 0);
  const unit = (t: LabelType) => basePrice[t] * tierFactor(q(t));
  const total = (t: LabelType) => unit(t) * q(t);
  const setTotal = (Object.keys(added) as LabelType[]).filter((t) => added[t]).reduce((s, t) => s + total(t), 0);
  const addedCount = Object.values(added).filter(Boolean).length;

  const sizeOf: Record<LabelType, { w: number; h: number }> = {
    woven: parseSize(woven.size),
    hang: parseSize(hang.size),
    care: parseSize(care.size),
  };
  const typeMeta = labelTypes.find((t) => t.id === type) ?? labelTypes[0];
  const stageNote: Record<LabelType, string> = {
    woven: `${lab(weaves, woven.weave)} · ${lab(folds, woven.fold)}`,
    hang: `${lab(papers, hang.paper)} · ${lab(cords, hang.cord)}`,
    care: `${lab(careMaterials, care.material)} · ${care.wash}°`,
  };

  function toggleAdded(t: LabelType) {
    const next = !added[t];
    setAdded((a) => ({ ...a, [t]: next }));
    const name = labelTypes.find((x) => x.id === t)?.name ?? "Etiket";
    setToast(next ? `Şartnameye eklendi: ${name}` : `Şartnameden çıkarıldı: ${name}`);
  }

  const preview = (t: LabelType) =>
    t === "woven" ? (
      <WovenLabel content={content} config={woven} />
    ) : t === "hang" ? (
      <HangTag content={content} config={hang} />
    ) : (
      <CareLabel content={content} config={care} />
    );

  return (
    <div className="flex flex-1 flex-col">
      {/* Başlık */}
      <header className="flex flex-col gap-5 px-6 pt-8 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
        <div>
          <p className="eyebrow text-ash">Etiket · Etiket stüdyosu</p>
          <h1 className="mt-3 font-display text-2xl leading-none md:text-3xl">Etiket seti</h1>
        </div>
        <div className="flex items-center gap-6">
          <span className="eyebrow tabular-nums text-ash">
            3 etiket · Şartnamede {addedCount}
          </span>
          <a href="#sartname" className="hidden eyebrow u-line sm:inline-flex items-center gap-3">
            Şartname
            <Arrow className="rotate-90" />
          </a>
        </div>
      </header>

      {/* Tür sekmeleri */}
      <div role="tablist" aria-label="Etiket türleri" className="mt-8 grid grid-cols-3 border-b border-mist px-6 md:px-10">
        {labelTypes.map((t) => {
          const active = t.id === type;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setType(t.id)}
              className={cn(
                "-mb-px flex flex-col items-start gap-1.5 border-b py-4 pr-4 text-left transition-colors duration-300",
                active ? "border-ink text-ink" : "border-transparent text-smoke hover:text-ink",
              )}
            >
              <span className={cn("text-[13.5px] leading-5", active && "font-medium")}>{t.name}</span>
              <span className="hidden eyebrow text-ash sm:block">{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Tezgâh */}
      <div className="grid flex-1 lg:grid-cols-12">
        {/* Sahne */}
        <section aria-label="Önizleme sahnesi" className="px-6 py-8 md:px-10 md:py-10 lg:col-span-7 lg:border-r lg:border-mist">
          <div className="[--mm:2.2px] sm:[--mm:3.4px] lg:[--mm:4px]">
            <div className="grid grid-cols-[20px_auto] grid-rows-[20px_auto] gap-1.5">
              <span aria-hidden />
              <Ruler orientation="h" cm={STAGE_W_CM} className="h-5" />
              <Ruler orientation="v" cm={STAGE_H_CM[type]} className="h-full w-5" />
              <div
                className="relative border border-mist bg-paper"
                style={{ width: mm(STAGE_W_CM * 10), height: mm(STAGE_H_CM[type] * 10) }}
              >
                <div className="absolute left-0 top-0">{preview(type)}</div>
                <span className="absolute bottom-3 left-3 bg-bone/90 px-2.5 py-2 eyebrow text-ink">
                  1:1 · <span className="normal-case">{sizeOf[type].w} × {sizeOf[type].h} mm</span>
                </span>
                <span className="absolute bottom-3 right-3 eyebrow text-ash">{stageNote[type]}</span>
              </div>
            </div>
          </div>
          <p className="mt-5 pl-[26px] text-[11px] leading-4 text-ash">
            Sahne gerçek ölçekte; kesikli çizgiler dikiş payı ve katlama hattıdır. Metinler sağdaki içerik alanlarından gelir.
          </p>
        </section>

        {/* Şartname paneli */}
        <aside aria-label="Şartname" className="px-6 py-8 md:px-10 md:py-10 lg:col-span-5">
          <p className="eyebrow text-ash">Şartname</p>
          <h2 className="mt-3 font-display text-3xl leading-none md:text-4xl">{typeMeta.name}</h2>
          <p className="mt-3 eyebrow text-ash">
            <span className="normal-case">{sizeOf[type].w} × {sizeOf[type].h} mm</span> · {stageNote[type]}
          </p>

          {/* İçerik */}
          <section className="mt-10 border-t border-mist pt-8">
            <h3 className="eyebrow">İçerik</h3>
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-7">
              <Field label="Marka" htmlFor="lbl-brand">
                <Input id="lbl-brand" value={content.brand} maxLength={24} onChange={setC("brand")} className="font-display text-xl" />
              </Field>
              <Field label="Ürün" htmlFor="lbl-product">
                <Input id="lbl-product" value={content.product} maxLength={32} onChange={setC("product")} />
              </Field>
              <Field label="Beden" htmlFor="lbl-size">
                <Input id="lbl-size" value={content.size} maxLength={6} onChange={setC("size")} />
              </Field>
              <Field label="Fiyat" htmlFor="lbl-price">
                <Input id="lbl-price" value={content.price} maxLength={12} onChange={setC("price")} className="tabular-nums" />
              </Field>
              <Field label="İçerik" htmlFor="lbl-comp">
                <Input id="lbl-comp" value={content.composition} maxLength={40} onChange={setC("composition")} />
              </Field>
              <Field label="Menşei" htmlFor="lbl-origin">
                <Input id="lbl-origin" value={content.origin} maxLength={20} onChange={setC("origin")} />
              </Field>
            </div>
          </section>

          {/* Yapı — türe özel */}
          <section className="mt-10 border-t border-mist pt-8">
            <h3 className="eyebrow">Yapı</h3>
            <div className="mt-6 space-y-7">
              {type === "woven" && (
                <>
                  <Choices label="Boyut" hint={<span className="normal-case">mm</span>} options={wovenSizes} value={woven.size} onChange={(v) => setWoven((c) => ({ ...c, size: v }))} />
                  <Choices label="Dokuma" options={weaves} value={woven.weave} onChange={(v) => setWoven((c) => ({ ...c, weave: v }))} note={weaves.find((w) => w.value === woven.weave)?.note} />
                  <Choices label="Katlama" options={folds} value={woven.fold} onChange={(v) => setWoven((c) => ({ ...c, fold: v }))} />
                  <div className="grid grid-cols-2 gap-8">
                    <InkChoices label="Zemin" value={woven.ground} onChange={(v) => setWoven((c) => ({ ...c, ground: v, thread: c.thread === v ? (v === "ink" ? "bone" : "ink") : c.thread }))} />
                    <InkChoices label="İplik" value={woven.thread} onChange={(v) => setWoven((c) => ({ ...c, thread: v, ground: c.ground === v ? (v === "ink" ? "bone" : "ink") : c.ground }))} />
                  </div>
                  <Checkbox id="woven-origin" checked={woven.showOrigin} onChange={(e) => setWoven((c) => ({ ...c, showOrigin: e.target.checked }))} label="Menşei satırı" />
                </>
              )}
              {type === "hang" && (
                <>
                  <Choices label="Boyut" hint={<span className="normal-case">mm</span>} options={hangSizes} value={hang.size} onChange={(v) => setHang((c) => ({ ...c, size: v }))} />
                  <Choices label="Kâğıt" options={papers} value={hang.paper} onChange={(v) => setHang((c) => ({ ...c, paper: v }))} />
                  <Choices label="Köşe" options={corners} value={hang.corner} onChange={(v) => setHang((c) => ({ ...c, corner: v }))} />
                  <Choices label="İp" options={cords} value={hang.cord} onChange={(v) => setHang((c) => ({ ...c, cord: v }))} />
                  <Choices label="Baskı" options={prints} value={hang.print} onChange={(v) => setHang((c) => ({ ...c, print: v }))} />
                  <Checkbox id="hang-price" checked={hang.showPrice} onChange={(e) => setHang((c) => ({ ...c, showPrice: e.target.checked }))} label="Fiyat göster" />
                </>
              )}
              {type === "care" && (
                <>
                  <Choices label="Boyut" hint={<span className="normal-case">mm</span>} options={careSizes} value={care.size} onChange={(v) => setCare((c) => ({ ...c, size: v }))} />
                  <Choices label="Malzeme" options={careMaterials} value={care.material} onChange={(v) => setCare((c) => ({ ...c, material: v }))} />
                  <Choices
                    label="Yıkama"
                    options={[
                      { value: "30", label: "30°" },
                      { value: "40", label: "40°" },
                    ]}
                    value={String(care.wash)}
                    onChange={(v) => setCare((c) => ({ ...c, wash: Number(v) as 30 | 40 }))}
                  />
                  <div>
                    <p className="eyebrow text-ash">Semboller</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(Object.keys(careSymbolLabels) as CareSymbol[]).map((s) => (
                        <Checkbox
                          key={s}
                          id={`care-${s}`}
                          checked={care.symbols[s]}
                          onChange={(e) => setCare((c) => ({ ...c, symbols: { ...c.symbols, [s]: e.target.checked } }))}
                          label={careSymbolLabels[s]}
                        />
                      ))}
                    </div>
                  </div>
                  <Choices
                    label="Dil"
                    options={[
                      { value: "tr", label: "Türkçe" },
                      { value: "tr-en", label: "Türkçe + İngilizce" },
                    ]}
                    value={care.lang}
                    onChange={(v) => setCare((c) => ({ ...c, lang: v }))}
                  />
                </>
              )}
            </div>
          </section>

          {/* Adet ve tahmin */}
          <section className="mt-10 border-t border-mist pt-8">
            <div className="flex items-baseline justify-between">
              <h3 className="eyebrow">Adet</h3>
              <span className="eyebrow text-ash">1.000+ %15 · 2.500+ %28 indirim</span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-6">
              <Field label="Adet" htmlFor={`qty-${type}`} trailing="min. 100">
                <Input
                  id={`qty-${type}`}
                  type="number"
                  inputMode="numeric"
                  min={100}
                  step={100}
                  value={qty[type]}
                  onChange={(e) => setQty((s) => ({ ...s, [type]: e.target.value }))}
                  className="tabular-nums"
                />
              </Field>
              <Stat label="Tahmini birim" value={unitFmt.format(unit(type))} />
              <Stat label="Toplam" value={formatTRY(total(type))} />
            </div>
          </section>

          <div className="mt-10 flex flex-col gap-5 border-t border-mist pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button variant={added[type] ? "ghost" : "solid"} onClick={() => toggleAdded(type)}>
              {added[type] ? "Şartnameden çıkar" : "Şartnameye ekle"}
            </Button>
            <a
              href={`mailto:${site.email}?subject=${encodeURIComponent(`Numune: ${typeMeta.name}`)}`}
              className="group inline-flex items-center gap-3 eyebrow u-line"
            >
              Numune iste
              <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
            </a>
          </div>
        </aside>
      </div>

      {/* Set ve şartname */}
      <section id="sartname" className="scroll-mt-24 border-t border-mist px-6 py-12 md:px-10 md:py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-ash">Şartname</p>
            <h2 className="mt-3 font-display text-2xl leading-none md:text-3xl">Etiket seti</h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="eyebrow text-ash">Şartname toplamı</p>
              <p className="mt-1.5 font-display text-2xl tabular-nums">{formatTRY(setTotal)}</p>
            </div>
            <Button variant="ghost" disabled={addedCount === 0} onClick={() => setToast("Üretim şartnamesi PDF olarak hazırlanıyor (prototip).")}>
              Şartnameyi dışa aktar
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-px border border-mist bg-mist md:grid-cols-3">
          {labelTypes.map((t) => {
            const isActive = t.id === type;
            const spec = specLines(t.id, { woven, hang, care });
            return (
              <div key={t.id} className="flex flex-col bg-bone p-6 md:p-8">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13.5px] font-medium">{t.name}</p>
                  <span className={cn("eyebrow", added[t.id] ? "text-ink" : "text-ash")}>{added[t.id] ? "Eklendi" : "Eklenmedi"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setType(t.id)}
                  aria-label={`${t.name} düzenle`}
                  className={cn(
                    "mt-5 flex h-[190px] items-center justify-center overflow-hidden border bg-paper p-4 transition-colors duration-300 [--mm:1.6px]",
                    isActive ? "border-ink" : "border-mist hover:border-ink/40",
                  )}
                >
                  {preview(t.id)}
                </button>
                <dl className="mt-5 space-y-2 text-[11px] leading-4 text-smoke">
                  {spec.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-mist pb-2 last:border-b-0">
                      <dt className="eyebrow text-ash">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 pt-1">
                    <dt className="eyebrow text-ash">Adet · birim</dt>
                    <dd className="tabular-nums">
                      {q(t.id).toLocaleString("tr-TR")} · {unitFmt.format(unit(t.id))}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-center justify-between pt-6">
                  <span className="font-display text-xl tabular-nums">{formatTRY(total(t.id))}</span>
                  <button type="button" onClick={() => toggleAdded(t.id)} className="eyebrow u-line">
                    {added[t.id] ? "Çıkar" : "Ekle"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function specLines(
  t: LabelType,
  c: { woven: WovenConfig; hang: HangConfig; care: CareConfig },
): [string, string][] {
  if (t === "woven") {
    return [
      ["Boyut", `${lab(wovenSizes, c.woven.size)} mm`],
      ["Dokuma", lab(weaves, c.woven.weave)],
      ["Katlama", lab(folds, c.woven.fold)],
      ["Renk", `${inkById(c.woven.ground).name} / ${inkById(c.woven.thread).name}`],
    ];
  }
  if (t === "hang") {
    return [
      ["Boyut", `${lab(hangSizes, c.hang.size)} mm`],
      ["Kâğıt", lab(papers, c.hang.paper)],
      ["Köşe · İp", `${lab(corners, c.hang.corner)} · ${lab(cords, c.hang.cord)}`],
      ["Baskı", lab(prints, c.hang.print)],
    ];
  }
  const n = Object.values(c.care.symbols).filter(Boolean).length + 1;
  return [
    ["Boyut", `${lab(careSizes, c.care.size)} mm`],
    ["Malzeme", lab(careMaterials, c.care.material)],
    ["Yıkama", `${c.care.wash}° · ${n} sembol`],
    ["Dil", c.care.lang === "tr-en" ? "TR + EN" : "TR"],
  ];
}

function Choices<T extends string>({
  label,
  hint,
  note,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  note?: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-ash">{label}</p>
        {hint && <span className="eyebrow text-ash">{hint}</span>}
      </div>
      <div role="radiogroup" aria-label={label} className="mt-3 flex flex-wrap gap-x-6 gap-y-2.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              data-active={active}
              className={cn("eyebrow u-line transition-colors duration-300", active ? "text-ink" : "text-ash hover:text-ink")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {note && <p className="mt-2.5 text-[11px] leading-4 text-ash">{note}</p>}
    </div>
  );
}

function InkChoices({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) {
  const current = inkById(value);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-ash">{label}</p>
        <span className="text-[11px] text-ash">{current.name}</span>
      </div>
      <div role="radiogroup" aria-label={label} className="mt-3 flex gap-3.5">
        {inks.map((i) => {
          const active = i.id === value;
          return (
            <button
              key={i.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={i.name}
              title={i.name}
              onClick={() => onChange(i.id)}
              className={cn(
                "h-4 w-4 border border-ink/15 transition-[outline-color] duration-300 outline outline-1 outline-offset-[3px]",
                active ? "outline-ink" : "outline-transparent hover:outline-ink/40",
              )}
              style={{ background: i.hex }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-ash">{label}</p>
      <p className="mt-3 font-display text-xl tabular-nums leading-none md:text-2xl">{value}</p>
    </div>
  );
}
