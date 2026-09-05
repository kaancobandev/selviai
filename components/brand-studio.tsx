"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  bodyFonts,
  displayFonts,
  hexToRgb,
  normalizeHex,
  onColor,
  palettePresets,
  swatchMeta,
  type BrandPalette,
  type Swatch,
  type SwatchRole,
} from "@/lib/brand";
import { cn } from "@/lib/utils";
import { TohumReferans, referanslar } from "@/components/tohum-referans";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { Arrow, Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { BagMockup, BoxMockup, ScarfMockup } from "@/components/brand-mockups";
import { site } from "@/lib/site";

type MonoShape = "circle" | "square" | "none";

const ROLES: SwatchRole[] = ["primary", "secondary", "accent"];

const MARKA_ANAHTARI = "selvi-marka-v1";

type MarkaKayit = {
  name: string;
  manifesto: string;
  monoEdit: string | null;
  monoShape: MonoShape;
  displayId: string;
  bodyId: string;
  presetId: string | null;
  palette: BrandPalette;
};

/* Açılış durumu TEK YERDE. Hem başlangıç değerleri hem "kullanıcı bir şey
   yaptı mı" ölçütü buradan okunuyor; iki ayrı yerde yazılsaydı biri
   değişince öteki sessizce yanlış cevap verirdi. */
const VARSAYILAN_MARKA: MarkaKayit = {
  name: "Nar",
  manifesto: "Sessizliğin de bir kesimi vardır.",
  monoEdit: null,
  monoShape: "circle",
  displayId: displayFonts[0].id,
  bodyId: bodyFonts[0].id,
  presetId: palettePresets[0].id,
  palette: palettePresets[0].palette,
};

/**
 * Marka sistemi stüdyosu — dört bölüm: 01 Logo, 02 Tipografi, 03 Renk, 04 Uygulama.
 * Solda bölüm başlığı ve kontroller (yapışkan), sağda canlı önizleme.
 */
export function BrandStudio({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [name, setName] = useState(VARSAYILAN_MARKA.name);
  const [manifesto, setManifesto] = useState(VARSAYILAN_MARKA.manifesto);
  const [logo, setLogo] = useState<{ url: string; file: string } | null>(null);
  const [monoEdit, setMonoEdit] = useState<string | null>(VARSAYILAN_MARKA.monoEdit);
  const [monoShape, setMonoShape] = useState<MonoShape>(VARSAYILAN_MARKA.monoShape);
  const [displayId, setDisplayId] = useState(VARSAYILAN_MARKA.displayId);
  const [bodyId, setBodyId] = useState(VARSAYILAN_MARKA.bodyId);
  const [presetId, setPresetId] = useState<string | null>(VARSAYILAN_MARKA.presetId);
  const [palette, setPalette] = useState<BrandPalette>(VARSAYILAN_MARKA.palette);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef(logo);

  useEffect(() => {
    logoRef.current = logo;
  }, [logo]);
  useEffect(
    () => () => {
      if (logoRef.current) URL.revokeObjectURL(logoRef.current.url);
    },
    [],
  );

  /* "İŞ VAR MI" SORUSU DURUMA BAKIYOR, ZAMANLAMAYA DEĞİL.
     Önce bir "ilk geçişi atla" bayrağı denendi ve ÇALIŞMADI: geliştirme
     kipindeki StrictMode etkileri iki kez çalıştırıyor, bayrak ikinci
     geçişte delinip etiket kullanıcı hiçbir şeye dokunmadan
     "kaydedildi" diyordu. Açılış durumuyla karşılaştırmak etkilerin
     kaç kez çalıştığından bağımsız. */
  const markaDurumu: MarkaKayit = { name, manifesto, monoEdit, monoShape, displayId, bodyId, presetId, palette };
  const isVar = JSON.stringify(markaDurumu) !== JSON.stringify(VARSAYILAN_MARKA);

  /* ---------- kayıt ----------

     Başlıktaki "Taslak · Otomatik kaydedildi" yazısı DÜPEDÜZ YANLIŞTI:
     bu bileşende tek bir `fetch` ya da `localStorage` çağrısı yoktu,
     yani hiçbir şey kaydedilmiyordu ve sayfa yenilenince marka adı,
     yazı tipleri ve palet gidiyordu. Yazıyı silmek de bir seçenekti;
     kaydı gerçekten kurmak daha iyisi ve teknik çizimdeki desenin aynısı.

     LOGO DOSYASI KAYDEDİLMİYOR: `URL.createObjectURL` ile üretilen adres
     sayfa kapanınca ölüyor, saklamak "yüklediğim logo kayboldu" diyen
     bozuk bir kayıt üretirdi. Sunucuya yükleme ayrı bir karar (Faz 5).
     ------------------------------------------------------------------ */
  const hazirRef = useRef(false);
  useEffect(() => {
    try {
      const ham = window.localStorage.getItem(MARKA_ANAHTARI);
      if (ham) {
        const k = JSON.parse(ham) as Partial<MarkaKayit>;
        /* eslint-disable-next-line react-hooks/set-state-in-effect --
           Tek seferlik geri yükleme; `useState` başlatıcısında okumak
           sunucuda `localStorage` olmadığı için hidrasyon uyuşmazlığı
           verirdi. Aynı gerekçe flat-sketch.tsx ve tema-anahtari.tsx'te
           de yazılı. */
        if (k.name !== undefined) setName(k.name);
        if (k.manifesto !== undefined) setManifesto(k.manifesto);
        if (k.monoEdit !== undefined) setMonoEdit(k.monoEdit);
        if (k.monoShape) setMonoShape(k.monoShape);
        if (k.displayId) setDisplayId(k.displayId);
        if (k.bodyId) setBodyId(k.bodyId);
        if (k.presetId !== undefined) setPresetId(k.presetId);
        if (k.palette) setPalette(k.palette);
      }
    } catch {
      /* Gizli sekmede erişimin kendisi fırlatıyor. */
    }
    hazirRef.current = true;
  }, []);

  useEffect(() => {
    if (!hazirRef.current) return;
    const zaman = window.setTimeout(() => {
      try {
        window.localStorage.setItem(MARKA_ANAHTARI, JSON.stringify(markaDurumu));
      } catch {
        /* Kota dolu ya da depolama kapalı — sessiz geçiyoruz. */
      }
    }, 400);
    return () => window.clearTimeout(zaman);
    /* eslint-disable-next-line react-hooks/exhaustive-deps --
       `markaDurumu` bu sekiz alandan TÜRETİLİYOR ve her render'da yeniden
       kuruluyor. Bağımlılığa eklemek etkiyi her render'da çalıştırır;
       alanları tek tek saymak hem doğru hem daha dar. */
  }, [name, manifesto, monoEdit, monoShape, displayId, bodyId, presetId, palette]);

  const display = displayFonts.find((f) => f.id === displayId) ?? displayFonts[0];
  const body = bodyFonts.find((f) => f.id === bodyId) ?? bodyFonts[0];
  const wordmark = name.trim() || "Marka";
  const autoMono =
    wordmark
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase("tr-TR") || "A";
  const monogram = (monoEdit ?? autoMono).toLocaleUpperCase("tr-TR");

  const displayFamily = `var(${display.cssVar})`;
  const bodyFamily = `var(${body.cssVar})`;
  const onPrimary = onColor(palette.primary.hex);
  const onSecondary = onColor(palette.secondary.hex);

  const brandVars = {
    "--b-display": displayFamily,
    "--b-body": bodyFamily,
  } as CSSProperties;

  function pickPreset(id: string) {
    const p = palettePresets.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setPalette(p.palette);
  }

  function updateSwatch(role: SwatchRole, next: Swatch) {
    setPalette((p) => ({ ...p, [role]: next }));
    setPresetId(null);
  }

  function onLogoFile(list: FileList | null) {
    const f = list?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    if (logo) URL.revokeObjectURL(logo.url);
    setLogo({ url: URL.createObjectURL(f), file: f.name });
  }

  function removeLogo() {
    if (logo) URL.revokeObjectURL(logo.url);
    setLogo(null);
  }

  return (
    <div className="flex flex-1 flex-col bg-zemin px-6 pb-24 pt-8 md:px-10 md:pt-10 lg:px-14" style={brandVars}>
      <TohumReferans
        baslik="Ana sayfada ürettiğiniz marka çalışması"
        gorseller={referanslar(tohum, "branding", "Marka")}
      />
      {/* Başlık + temel girdiler */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-fog">Branding · Marka kimliği stüdyosu</p>
          <h1 className="mt-3 font-display text-2xl leading-none md:text-3xl">Marka sistemi</h1>
        </div>
        <div className="flex items-center gap-6">
          {/* Kayıt TARAYICIYA ait; düz "kaydedildi" başka cihazda da
              duracağını ima ederdi. Aynı ifade teknik çizimde de var. */}
          <span className="hidden eyebrow text-fog sm:inline">
            {isVar ? "Bu tarayıcıya kaydedildi" : "Taslak"}
          </span>
          <Button variant="ghost" onClick={() => window.print()}>
            Kılavuzu yazdır · PDF
          </Button>
        </div>
      </header>

      <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2 lg:max-w-3xl">
        <Field label="Marka adı" htmlFor="brand-name" hint="Logotype ve monogram buradan türetilir.">
          <Input
            id="brand-name"
            value={name}
            maxLength={28}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Nar"
            className="font-display text-2xl leading-8"
          />
        </Field>
        <Field label="Manifesto" htmlFor="brand-manifesto" hint="Tipografi örneklerinde kullanılır.">
          <Input
            id="brand-manifesto"
            value={manifesto}
            maxLength={80}
            onChange={(e) => setManifesto(e.target.value)}
            placeholder="Tek cümle."
          />
        </Field>
      </div>

      {/* 01 — Logo */}
      <Module
        index="01"
        title="Logo ve monogram"
        lede="Ana logotype, ikincil monogram ve negatif kullanım. Kılavuz çizgileri koruma alanını (x) gösterir."
        aside={
          <div className="space-y-7">
            <div>
              <p className="eyebrow text-fog">Ana logo</p>
              <div className="mt-3 flex items-center gap-5">
                <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                  {logo ? "Değiştir" : "Logo yükle"}
                </Button>
                {logo ? (
                  <span className="flex items-center gap-4 text-[11px] text-fog">
                    <span className="max-w-[14ch] truncate">{logo.file}</span>
                    <button type="button" onClick={removeLogo} className="eyebrow text-fog u-line hover:text-kalem">
                      Kaldır
                    </button>
                  </span>
                ) : (
                  <span className="text-[11px] leading-4 text-fog">SVG ya da PNG. Yoksa logotype kullanılır.</span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    onLogoFile(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
            <Field
              label="Monogram"
              htmlFor="brand-mono"
              trailing={
                monoEdit !== null ? (
                  <button type="button" onClick={() => setMonoEdit(null)} className="u-line">
                    Otomatik
                  </button>
                ) : (
                  "Otomatik"
                )
              }
            >
              <Input
                id="brand-mono"
                value={monogram}
                maxLength={3}
                onChange={(e) => setMonoEdit(e.target.value.slice(0, 3))}
                className="font-display text-2xl uppercase leading-8 tracking-[0.05em]"
              />
            </Field>
            <div>
              <p className="eyebrow text-fog">Monogram biçimi</p>
              <Segmented
                value={monoShape}
                onChange={setMonoShape}
                options={[
                  { value: "circle", label: "Daire" },
                  { value: "square", label: "Kare" },
                  { value: "none", label: "Serbest" },
                ]}
              />
            </div>
          </div>
        }
      >
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          <GuideTile label="Ana logo" note="Min. 24 mm · Boşluk 1x">
            <LogoMark wordmark={wordmark} logo={logo?.url ?? null} />
          </GuideTile>
          <GuideTile label="Monogram" note="İkincil sembol · 1:1">
            <Monogram letters={monogram} shape={monoShape} />
          </GuideTile>
          <GuideTile label="Negatif" note="Koyu zemin · Açık logotype" dark>
            <LogoMark wordmark={wordmark} logo={logo?.url ?? null} invert />
          </GuideTile>
        </div>
      </Module>

      {/* 02 — Tipografi */}
      <Module
        index="02"
        title="Tipografi hiyerarşisi"
        lede="Bir serif display, bir grotesk gövde. Eşleşme tüm markada — etiketten kampanyaya — aynı kalır."
        aside={
          <div className="space-y-8">
            <FontPicker label="Display · Serif" options={displayFonts} value={displayId} onChange={setDisplayId} />
            <FontPicker label="Gövde · Grotesk" options={bodyFonts} value={bodyId} onChange={setBodyId} />
          </div>
        }
      >
        <div>
          <p className="font-[family-name:var(--b-display)] text-[clamp(6rem,13vw,10.5rem)] leading-[0.85] tracking-[-0.01em]">
            Aa
          </p>
          <p className="mt-6 font-[family-name:var(--b-display)] text-2xl leading-snug md:text-3xl">
            Aa Bb Cc Dd Ee Ff Gg Hh Iİ Jj Kk Ll Mm Nn Oo Öö Pp Rr Ss Şş Tt Uu Üü Vv Yy Zz
          </p>
          <p className="mt-2 font-[family-name:var(--b-display)] text-2xl tabular-nums text-fog md:text-3xl">0123456789</p>
          <p className="mt-8 max-w-[28ch] font-[family-name:var(--b-display)] text-3xl italic leading-[1.15] md:text-4xl">
            {manifesto || "Manifesto cümlesi."}
          </p>
          <TechLabel>
            {display.name} · {display.weights} — {display.note}
          </TechLabel>

          <div className="my-12 h-px bg-hair" />

          <div className="grid gap-10 md:grid-cols-12">
            <p className="font-[family-name:var(--b-body)] text-7xl leading-none md:col-span-3 md:text-8xl">Aa</p>
            <div className="md:col-span-9">
              <p className="font-[family-name:var(--b-body)] text-lg leading-relaxed text-kalem">
                Aa Bb Cc Dd Ee Ff Gg Hh Iİ Jj Kk Ll Mm Nn Oo Öö Pp Rr Ss Şş Tt Uu Üü Vv Yy Zz · 0123456789
              </p>
              <p className="mt-5 max-w-[58ch] font-[family-name:var(--b-body)] text-[15px] leading-7 text-fog">
                {wordmark}, koleksiyonlarını az sayıda parça ve uzun ömürlü kumaşlarla kurar. Her ürün, etiketinden
                kutusuna aynı dille konuşur: düşük ses, yüksek kalite, hiçbir fazlalık yok.
              </p>
              <TechLabel>
                {body.name} · {body.weights} — {body.note}
              </TechLabel>
            </div>
          </div>

          <div className="mt-14 border-t border-hair">
            <p className="pt-6 eyebrow text-fog">Ölçek</p>
            <ul className="mt-2 divide-y divide-hair">
              <ScaleRow label="Display" spec="96 / 0.95" family="display" style={{ fontSize: "clamp(2.75rem, 6vw, 5rem)", lineHeight: 0.95 }}>
                {wordmark}
              </ScaleRow>
              <ScaleRow label="Başlık" spec="32 / 1.05" family="display" style={{ fontSize: "2rem", lineHeight: 1.05 }}>
                {manifesto || "Başlık"}
              </ScaleRow>
              <ScaleRow label="Alt başlık" spec="22 / 1.3 · İtalik" family="display" style={{ fontSize: "1.375rem", lineHeight: 1.3, fontStyle: "italic" }}>
                Sonbahar–Kış 2026 koleksiyonu
              </ScaleRow>
              <ScaleRow label="Gövde" spec="15 / 1.7" family="body" style={{ fontSize: "0.9375rem", lineHeight: 1.7 }}>
                Doğal boyalı keten, elde dikilmiş kenarlar. Soğuk suda yıkayın, gölgede kurutun.
              </ScaleRow>
              <ScaleRow label="Etiket" spec="10 / 1 · %22 aralık" family="body" style={{ fontSize: "0.625rem", lineHeight: 1, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                %100 Organik Keten · İstanbul&apos;da üretildi
              </ScaleRow>
            </ul>
          </div>
        </div>
      </Module>

      {/* 03 — Renk */}
      <Module
        index="03"
        title="Renk paleti"
        lede="Üç renk, sabit oran: %60 ana, %30 ikincil, %10 vurgu. Renge tıklayarak değiştirin; HEX alanı elle düzenlenebilir."
        aside={
          <div>
            <p className="eyebrow text-fog">Hazır paletler</p>
            <ul className="mt-4 divide-y divide-hair border-y border-hair">
              {palettePresets.map((p) => {
                const active = presetId === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pickPreset(p.id)}
                      aria-pressed={active}
                      className="group flex w-full items-center justify-between gap-4 py-3 text-left"
                    >
                      <span className={cn("text-[13.5px] transition-colors", active ? "font-medium text-kalem" : "text-fog group-hover:text-kalem")}>
                        {p.name}
                      </span>
                      <span className="flex gap-1.5">
                        {ROLES.map((r) => (
                          <span key={r} className="h-3.5 w-3.5 border border-kalem/10" style={{ background: p.palette[r].hex }} />
                        ))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {presetId === null && <p className="mt-3 text-[11px] leading-4 text-fog">Özel palet — presetlerden ayrıldınız.</p>}
          </div>
        }
      >
        <div className="grid gap-8 sm:grid-cols-3">
          {ROLES.map((role) => (
            <SwatchCard key={role} role={role} swatch={palette[role]} onChange={(s) => updateSwatch(role, s)} />
          ))}
        </div>

        <div className="mt-12">
          <div className="flex h-1.5 w-full overflow-hidden">
            {ROLES.map((r) => (
              <span
                key={r}
                style={{ width: `${swatchMeta[r].share}%`, background: palette[r].hex }}
                className="border-r border-paper last:border-r-0"
              />
            ))}
          </div>
          <div className="mt-3 flex">
            {ROLES.map((r) => (
              <span
                key={r}
                style={{ width: `${swatchMeta[r].share}%` }}
                className={cn("whitespace-nowrap eyebrow tabular-nums text-fog", r === "accent" && "text-right")}
              >
                %{swatchMeta[r].share} {swatchMeta[r].label}
              </span>
            ))}
          </div>
        </div>
      </Module>

      {/* 04 — Uygulama */}
      <Module
        index="04"
        title="Canlı uygulama"
        lede="Kimliğin üç temas noktasında anlık önizlemesi. Yukarıdaki her karar buraya yansır."
        aside={
          <dl className="space-y-3 text-[11px] leading-4 text-fog">
            <div className="flex justify-between border-b border-hair pb-2">
              <dt className="eyebrow text-fog">Logotype</dt>
              <dd>{display.name}</dd>
            </div>
            <div className="flex justify-between border-b border-hair pb-2">
              <dt className="eyebrow text-fog">Ana</dt>
              <dd className="tabular-nums">{palette.primary.hex}</dd>
            </div>
            <div className="flex justify-between border-b border-hair pb-2">
              <dt className="eyebrow text-fog">İkincil</dt>
              <dd className="tabular-nums">{palette.secondary.hex}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="eyebrow text-fog">Vurgu</dt>
              <dd className="tabular-nums">{palette.accent.hex}</dd>
            </div>
          </dl>
        }
      >
        <div className="grid gap-8 sm:grid-cols-3">
          {(
            [
              { key: "bag", Comp: BagMockup, label: "Alışveriş çantası", note: "Ana renk · Logotype · Vurgu etiket" },
              { key: "scarf", Comp: ScarfMockup, label: "İpek fular", note: "İkincil renk · Monogram · Vurgu dikiş" },
              { key: "box", Comp: BoxMockup, label: "Kutu", note: "Ana renk · Logotype · Vurgu şerit" },
            ] as const
          ).map(({ key, Comp, label, note }) => (
            <figure key={key}>
              <div className="tuval aspect-[5/6] border border-hair bg-paper p-4">
                <Comp
                  wordmark={wordmark}
                  monogram={monogram}
                  display={displayFamily}
                  primary={palette.primary.hex}
                  secondary={palette.secondary.hex}
                  accent={palette.accent.hex}
                  onPrimary={onPrimary}
                  onSecondary={onSecondary}
                />
              </div>
              <figcaption className="mt-3 flex flex-col gap-1">
                <span className="text-[13px]">{label}</span>
                <span className="eyebrow text-fog">{note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Module>

      <div className="flex flex-col gap-5 border-t border-hair pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[44ch] text-[15px] leading-7 text-fog">
          Kılavuz; logo dosyaları, yazı tipi lisansları, renk değerleri ve uygulama örnekleriyle tek bir PDF olarak
          paylaşılır.
        </p>
        <div className="flex items-center gap-8">
          <Button onClick={() => window.print()}>Kılavuzu yazdır · PDF</Button>
          <a
            href={`mailto:${site.email}?subject=${encodeURIComponent(`Branding: ${wordmark}`)}`}
            className="group inline-flex items-center gap-3 eyebrow u-line"
          >
            Stüdyoyla paylaş
            <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      {/* KİMLİK KILAVUZU — baskı ağacı.

          Bu sayfa "prototip" toast'ının yerini alıyor. İçindeki her şey
          zaten ekranda üretiliyordu; eksik olan, markayı teslim edilebilir
          tek bir belgede toplamaktı. Kılavuzun asgari işi üç soruyu
          cevaplamak: marka nasıl yazılır, hangi yazıyla konuşur, hangi
          renklerle görünür.

          MAKETLER BASKIYA GİRMİYOR: onlar bir uygulama ÖRNEĞİ, kural
          değil. Kılavuzun kural sayfası olması gerekiyor; örnek koymak
          sayfayı şişirip asıl kuralı geri plana atardı. */}
      <div className="lookbook-baski-kok" aria-hidden>
        <div
          className="lookbook-sayfa tuval"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "7mm",
            padding: "14mm",
            background: "#fff",
            color: "#1a1a1a",
            ...brandVars,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "2.8mm", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6a6870" }}>
              Kimlik kılavuzu
            </span>
            <span suppressHydrationWarning style={{ fontSize: "2.8mm", letterSpacing: "0.1em", color: "#6a6870" }}>
              {new Date().toLocaleDateString("tr-TR")}
            </span>
          </div>

          {/* 01 — Logotype ve monogram */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12mm", borderBottom: "0.2mm solid #1a1a1a", paddingBottom: "6mm" }}>
            <span style={{ fontFamily: displayFamily, fontSize: "22mm", lineHeight: 1, letterSpacing: "-0.01em" }}>{wordmark}</span>
            <div style={{ width: "22mm", height: "22mm", flexShrink: 0 }}>
              <Monogram letters={monogram} shape={monoShape} />
            </div>
            <span style={{ fontFamily: bodyFamily, fontSize: "3.6mm", lineHeight: 1.5, marginLeft: "auto", maxWidth: "70mm", textAlign: "right" }}>
              {manifesto}
            </span>
          </div>

          {/* 02 — Tipografi */}
          <div style={{ display: "flex", gap: "12mm" }}>
            {[
              { rol: "Başlık", f: display, aile: displayFamily, ornek: "Sessiz Siluet" },
              { rol: "Metin", f: body, aile: bodyFamily, ornek: "Koleksiyon anlatısı, etiket ve künye metinleri." },
            ].map((x) => (
              <div key={x.rol} style={{ flex: 1 }}>
                <p style={{ fontSize: "2.6mm", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a6870" }}>
                  {x.rol} · {x.f.name}
                </p>
                <p style={{ fontFamily: x.aile, fontSize: x.rol === "Başlık" ? "9mm" : "4.4mm", lineHeight: 1.25, marginTop: "2mm" }}>
                  {x.ornek}
                </p>
              </div>
            ))}
          </div>

          {/* 03 — Palet */}
          <div style={{ display: "flex", gap: "6mm", marginTop: "auto" }}>
            {ROLES.map((rol) => {
              const sw = palette[rol];
              return (
                <div key={rol} style={{ flex: 1 }}>
                  <div style={{ height: "26mm", background: sw.hex, border: "0.15mm solid #d8d6dc" }} />
                  <p style={{ fontSize: "2.6mm", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a6870", marginTop: "2mm" }}>
                    {swatchMeta[rol].label}
                  </p>
                  <p style={{ fontFamily: bodyFamily, fontSize: "3.4mm", marginTop: "0.8mm" }}>{sw.name}</p>
                  {/* Pantone eşleşmesi YAKIN, birebir değil — kılavuzda
                      bunu yazmak zorunlu, yoksa boyahaneye kesin kod diye
                      gider. */}
                  <p style={{ fontSize: "2.8mm", color: "#55525c", marginTop: "0.6mm" }}>
                    {sw.hex.toUpperCase()}
                    {sw.pantone ? ` · ${sw.pantone} (yakın eşleşme)` : " · Pantone eşleşmesi yok"}
                  </p>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: "2.6mm", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6a6870" }}>
            Selvi AI · marka sistemi
          </p>
        </div>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function Module({
  index,
  title,
  lede,
  aside,
  children,
}: {
  index: string;
  title: string;
  lede: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-16 border-t border-hair pt-14 md:mt-24 md:pt-20">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow tabular-nums text-fog">{index}</p>
            <h2 className="mt-4 font-display text-3xl leading-none md:text-4xl">{title}</h2>
            <p className="mt-5 max-w-[36ch] text-[15px] leading-7 text-fog">{lede}</p>
            {aside && <div className="mt-9">{aside}</div>}
          </div>
        </div>
        <div className="lg:col-span-8">{children}</div>
      </div>
    </section>
  );
}

function TechLabel({ children }: { children: ReactNode }) {
  return <p className="mt-5 eyebrow text-fog">{children}</p>;
}

function ScaleRow({
  label,
  spec,
  family,
  style,
  children,
}: {
  label: string;
  spec: string;
  family: "display" | "body";
  style: CSSProperties;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[5.5rem_1fr] items-baseline gap-6 py-5 md:grid-cols-[6.5rem_1fr_8rem]">
      <span className="eyebrow text-fog">{label}</span>
      <span
        className="min-w-0 truncate"
        style={{ fontFamily: family === "display" ? "var(--b-display)" : "var(--b-body)", ...style }}
      >
        {children}
      </span>
      <span className="hidden text-right eyebrow tabular-nums text-fog md:block">{spec}</span>
    </li>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" className="mt-3 flex gap-6">
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
            className={cn("eyebrow u-line transition-colors duration-300", active ? "text-kalem" : "text-fog hover:text-kalem")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function FontPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; name: string; cssVar: string; weights: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <p className="eyebrow text-fog">{label}</p>
      <ul className="mt-4 divide-y divide-hair border-y border-hair">
        {options.map((f) => {
          const active = f.id === value;
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onChange(f.id)}
                aria-pressed={active}
                className="group flex w-full items-center justify-between gap-4 py-3 text-left"
              >
                <span className="flex items-baseline gap-3">
                  <span
                    style={{ fontFamily: `var(${f.cssVar})` }}
                    className={cn("text-xl leading-none transition-colors", active ? "text-kalem" : "text-fog group-hover:text-kalem")}
                  >
                    {f.name}
                  </span>
                  <span className="hidden eyebrow text-fog xl:inline">{f.weights}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full border border-kalem transition-colors duration-300",
                    active ? "bg-kalem" : "bg-transparent",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Koruma alanı kılavuzlu teknik karo */
function GuideTile({ label, note, dark, children }: { label: string; note: string; dark?: boolean; children: ReactNode }) {
  return (
    <figure>
      <div
        className={cn(
          "relative aspect-square border",
          /* Koyu karonun kenarlığı `border-ink`ti, yani #0b0b0b — koyu
             temada sayfa zemini de #0b0b0b olduğu için karo tamamen
             kayboluyordu (1,00:1). Açık kardeşleri beyaz DOLGULARIYLA
             ayrışıyor; koyu karonun dolgusu ayrışamaz, o yüzden ayıran
             şey kenar olmak zorunda. `border-hair` sitenin ayraç
             token'ı: koyu sayfada saç çizgisi, açık sayfada belirgin. */
          dark ? "border-hair bg-ink text-bone" : "border-mist bg-paper text-ink",
        )}
      >
        {/* İnşa çizgileri */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-[18%] w-px bg-current opacity-10" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-[18%] w-px bg-current opacity-10" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-[18%] h-px bg-current opacity-10" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[18%] h-px bg-current opacity-10" />
        {/* Koruma alanı */}
        <span aria-hidden className="pointer-events-none absolute inset-[18%] border border-current opacity-30" />
        {/* x işaretleri */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-[6%] -translate-x-1/2 font-display text-[11px] italic leading-none opacity-50">
          x
        </span>
        <span aria-hidden className="pointer-events-none absolute left-[6%] top-1/2 -translate-y-1/2 font-display text-[11px] italic leading-none opacity-50">
          x
        </span>
        <div className="absolute inset-[18%] flex items-center justify-center overflow-hidden">{children}</div>
      </div>
      <figcaption className="mt-3 flex flex-col gap-1.5">
        <span className="text-[13px]">{label}</span>
        <span className="eyebrow text-fog">{note}</span>
      </figcaption>
    </figure>
  );
}

function LogoMark({ wordmark, logo, invert }: { wordmark: string; logo: string | null; invert?: boolean }) {
  if (logo) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={logo}
          alt="Yüklenen logo"
          fill
          unoptimized
          className="object-contain"
          style={invert ? { filter: "invert(1)" } : undefined}
        />
      </div>
    );
  }
  return (
    <span className="px-2 text-center font-[family-name:var(--b-display)] text-[clamp(1.25rem,2.4vw,2rem)] uppercase leading-[1.1] tracking-[0.18em]">
      {wordmark}
    </span>
  );
}

function Monogram({ letters, shape }: { letters: string; shape: MonoShape }) {
  return (
    <span
      className={cn(
        "flex aspect-square w-[78%] items-center justify-center font-[family-name:var(--b-display)] leading-none",
        shape === "circle" && "rounded-full border border-current",
        shape === "square" && "border border-current",
      )}
      style={{ fontSize: letters.length > 1 ? "clamp(1.75rem,3.2vw,2.75rem)" : "clamp(2.25rem,4vw,3.5rem)", letterSpacing: "-0.02em" }}
    >
      {letters}
    </span>
  );
}

function SwatchCard({ role, swatch, onChange }: { role: SwatchRole; swatch: Swatch; onChange: (s: Swatch) => void }) {
  const meta = swatchMeta[role];
  const { r, g, b } = hexToRgb(swatch.hex);
  const text = onColor(swatch.hex);

  // HEX taslağı: dışarıdan renk değişince senkronlanır (render sırasında türetilir)
  const [draft, setDraft] = useState(swatch.hex);
  const [prevHex, setPrevHex] = useState(swatch.hex);
  if (swatch.hex !== prevHex) {
    setPrevHex(swatch.hex);
    setDraft(swatch.hex);
  }

  function commitDraft(v: string) {
    setDraft(v);
    const n = normalizeHex(v);
    if (n && n !== swatch.hex) onChange({ ...swatch, hex: n, pantone: null });
  }

  return (
    <div>
      <label
        /* ODAK HALKASI ETİKETTE, GİRİŞTE DEĞİL. İçerideki
           `<input type="color">` `sr-only` ile 1px'e kırpılıyor ve
           `clip-path` öğenin ANA HATTINI da kırpıyor — yani halka
           çiziliyor ama görünür alanı sıfır. Giriş odaklanabilir KALMAK
           zorunda (rengi klavyeyle değiştirmenin tek yolu o), bu yüzden
           çözüm halkayı görünür sarmalayıcıya taşımak. */
        className="relative block aspect-[4/3] cursor-pointer border border-kalem/10 transition-transform duration-500 ease-[var(--ease-out-expo)] hover:scale-[1.01] has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-odak has-[:focus-visible]:outline-offset-4"
        style={{ background: swatch.hex }}
        title="Rengi değiştir"
      >
        <input
          type="color"
          value={normalizeHex(swatch.hex) ?? "#000000"}
          onChange={(e) => onChange({ ...swatch, hex: e.target.value.toUpperCase(), pantone: null })}
          className="sr-only"
          aria-label={`${meta.label} rengini değiştir`}
        />
        <span className="absolute right-3 top-3 eyebrow tabular-nums" style={{ color: text }}>
          %{meta.share}
        </span>
      </label>
      <p className="mt-4 eyebrow text-fog">{meta.label}</p>
      <p className="mt-2 font-display text-xl leading-tight">{swatch.name}</p>
      <p className="mt-1.5 text-[11px] leading-4 text-fog">{meta.usage}</p>
      <dl className="mt-4 space-y-2 text-[11px] leading-4 tabular-nums text-fog">
        <div className="flex items-baseline justify-between border-b border-hair pb-2">
          <dt className="eyebrow text-fog">HEX</dt>
          <dd>
            <input
              value={draft}
              onChange={(e) => commitDraft(e.target.value)}
              onBlur={() => setDraft(swatch.hex)}
              spellCheck={false}
              aria-label={`${meta.label} HEX değeri`}
              className="w-[9ch] bg-transparent text-right uppercase outline-none"
            />
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-hair pb-2">
          <dt className="eyebrow text-fog">RGB</dt>
          <dd>
            {r} · {g} · {b}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="eyebrow text-fog">Pantone</dt>
          <dd>{swatch.pantone ?? "Özel · eşleşme yok"}</dd>
        </div>
      </dl>
    </div>
  );
}
