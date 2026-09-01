/* ------------------------------------------------------------------
   Marka stüdyosu — yazı tipi seçenekleri, renk presetleri, yardımcılar
   ------------------------------------------------------------------ */

export type FontOption = {
  id: string;
  name: string;
  /** Kök ya da sayfa düzeyinde tanımlı CSS değişkeni */
  cssVar: string;
  weights: string;
  note: string;
};

export const displayFonts: FontOption[] = [
  {
    id: "bodoni",
    name: "Bodoni Moda",
    cssVar: "--font-bodoni",
    weights: "400–900 · İtalik",
    note: "Yüksek kontrast didone. Kampanya başlıkları, logotype.",
  },
  {
    id: "cormorant",
    name: "Cormorant Garamond",
    cssVar: "--font-cormorant",
    weights: "300–500 · İtalik",
    note: "Eski stil serif. Sakin, zarif, uzun metne dayanıklı.",
  },
  {
    id: "cinzel",
    name: "Cinzel",
    cssVar: "--font-cinzel",
    weights: "400–900 · Kapital",
    note: "Oymalı kapital. Logotype ve monogram için Roma yazıtı ciddiyeti.",
  },
];

export const bodyFonts: FontOption[] = [
  {
    id: "sistem",
    name: "Sistem Grotesk",
    cssVar: "--font-sans",
    weights: "Sistem",
    note: "Nötr grotesk. Gövde, etiket, teknik metin. İndirme gerektirmez.",
  },
  {
    id: "karla",
    name: "Karla",
    cssVar: "--font-karla",
    weights: "200–800",
    note: "Hümanist grotesk. Sıcak, okunaklı gövde.",
  },
  {
    id: "hanken",
    name: "Hanken Grotesk",
    cssVar: "--font-hanken",
    weights: "100–900",
    note: "Sessiz grotesk. Arayüz ve ambalaj metni.",
  },
];

export type SwatchRole = "primary" | "secondary" | "accent";

export type Swatch = {
  hex: string;
  name: string;
  /** Yakın Pantone eşleşmesi; özel renkte null */
  pantone: string | null;
};

export type BrandPalette = Record<SwatchRole, Swatch>;

export const swatchMeta: Record<SwatchRole, { label: string; share: number; usage: string }> = {
  primary: { label: "Ana", share: 60, usage: "Zemin, ambalaj, logotype" },
  secondary: { label: "İkincil", share: 30, usage: "Kâğıt, astar, etiket zemini" },
  accent: { label: "Vurgu", share: 10, usage: "Şerit, dikiş, tek kelime" },
};

export type PalettePreset = { id: string; name: string; palette: BrandPalette };

export const palettePresets: PalettePreset[] = [
  {
    id: "murekkep",
    name: "Kâğıt & Mürekkep",
    palette: {
      primary: { hex: "#121212", name: "Mürekkep", pantone: "Black 6 C" },
      secondary: { hex: "#EDE7DC", name: "Kemik", pantone: "7527 C" },
      accent: { hex: "#9A2B2B", name: "Nar", pantone: "7623 C" },
    },
  },
  {
    id: "kum",
    name: "Kum & Antrasit",
    palette: {
      primary: { hex: "#2B2A28", name: "Antrasit", pantone: "426 C" },
      secondary: { hex: "#D8CFC0", name: "Kum", pantone: "7528 C" },
      accent: { hex: "#8A6F5B", name: "Tütün", pantone: "7531 C" },
    },
  },
  {
    id: "kul",
    name: "Kül & Adaçayı",
    palette: {
      primary: { hex: "#1F2421", name: "Orman", pantone: "5467 C" },
      secondary: { hex: "#E4E6E1", name: "Kül", pantone: "Cool Gray 1 C" },
      accent: { hex: "#4F6B5A", name: "Adaçayı", pantone: "5615 C" },
    },
  },
  {
    id: "fildisi",
    name: "Fildişi & Gece",
    palette: {
      primary: { hex: "#0F1A2B", name: "Gece", pantone: "289 C" },
      secondary: { hex: "#F2EEE6", name: "Fildişi", pantone: "11-0602 TCX" },
      accent: { hex: "#B08D57", name: "Pirinç", pantone: "871 C" },
    },
  },
];

/* ---------------- renk yardımcıları ---------------- */

export function normalizeHex(input: string): string | null {
  const m = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(m)) return `#${m.toUpperCase()}`;
  if (/^[0-9a-f]{3}$/i.test(m)) return `#${m.split("").map((c) => c + c).join("").toUpperCase()}`;
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = normalizeHex(hex) ?? "#000000";
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

/** WCAG göreli parlaklık (0 koyu — 1 açık) */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export const isDark = (hex: string) => luminance(hex) < 0.35;

/** Zemin rengine göre okunaklı metin rengi (kemik / mürekkep) */
export const onColor = (hex: string) => (isDark(hex) ? "#F4F2ED" : "#0B0B0B");
