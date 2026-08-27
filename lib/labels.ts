/* ------------------------------------------------------------------
   Etiket stüdyosu — türler, seçenekler, varsayılanlar, tahmini fiyat
   Tüm ölçüler milimetre.
   ------------------------------------------------------------------ */

export type LabelType = "woven" | "hang" | "care";

export type Option<T extends string> = { value: T; label: string; note?: string };

export const labelTypes: { id: LabelType; name: string; sub: string }[] = [
  { id: "woven", name: "Dokuma etiket", sub: "Yaka içi · marka" },
  { id: "hang", name: "Asma etiket", sub: "Kâğıt · ip" },
  { id: "care", name: "Bakım etiketi", sub: "Yan dikiş · baskı" },
];

/* ---------------- ortak içerik ---------------- */
export type LabelContent = {
  brand: string;
  product: string;
  size: string;
  price: string;
  composition: string;
  origin: string;
};

export const defaultContent: LabelContent = {
  brand: "Nar",
  product: "Keten gömlek",
  size: "M",
  price: "₺4.800",
  composition: "%100 Organik Keten",
  origin: "İstanbul",
};

/* ---------------- renkler (zemin / iplik / kâğıt) ---------------- */
export type Ink = { id: string; name: string; hex: string };
export const inks: Ink[] = [
  { id: "ink", name: "Mürekkep", hex: "#121212" },
  { id: "bone", name: "Kemik", hex: "#EDE7DC" },
  { id: "sand", name: "Kum", hex: "#D8CFC0" },
  { id: "brass", name: "Pirinç", hex: "#B08D57" },
  { id: "nar", name: "Nar", hex: "#9A2B2B" },
];
export const inkById = (id: string) => inks.find((i) => i.id === id) ?? inks[0];

/* ---------------- dokuma etiket ---------------- */
export type WovenSize = "50x15" | "60x20" | "70x25";
export type Weave = "damask" | "taffeta" | "satin";
export type Fold = "straight" | "center" | "end";

export type WovenConfig = {
  size: WovenSize;
  weave: Weave;
  fold: Fold;
  ground: string;
  thread: string;
  showOrigin: boolean;
};

export const wovenSizes: Option<WovenSize>[] = [
  { value: "50x15", label: "50 × 15" },
  { value: "60x20", label: "60 × 20" },
  { value: "70x25", label: "70 × 25" },
];
export const weaves: Option<Weave>[] = [
  { value: "damask", label: "Damask", note: "Yüksek çözünürlük, yumuşak tuşe" },
  { value: "taffeta", label: "Tafta", note: "Ekonomik, net kenar" },
  { value: "satin", label: "Saten", note: "Parlak zemin, lüks his" },
];
export const folds: Option<Fold>[] = [
  { value: "straight", label: "Düz kesim" },
  { value: "center", label: "Orta katlama" },
  { value: "end", label: "Uç katlama" },
];

export const defaultWoven: WovenConfig = {
  size: "60x20",
  weave: "damask",
  fold: "center",
  ground: "ink",
  thread: "bone",
  showOrigin: true,
};

/* ---------------- asma etiket ---------------- */
export type HangSize = "50x90" | "60x100" | "70x120";
export type Paper = "kraft" | "ivory" | "black";
export type Corner = "square" | "round";
export type Cord = "cotton" | "satin" | "waxed";
export type Print = "mono" | "emboss" | "foil";

export type HangConfig = {
  size: HangSize;
  paper: Paper;
  corner: Corner;
  cord: Cord;
  print: Print;
  showPrice: boolean;
};

export const hangSizes: Option<HangSize>[] = [
  { value: "50x90", label: "50 × 90" },
  { value: "60x100", label: "60 × 100" },
  { value: "70x120", label: "70 × 120" },
];
export const papers: Option<Paper>[] = [
  { value: "kraft", label: "Kraft 300 g" },
  { value: "ivory", label: "Fildişi 350 g" },
  { value: "black", label: "Siyah 400 g" },
];
export const corners: Option<Corner>[] = [
  { value: "square", label: "Köşeli" },
  { value: "round", label: "Yuvarlatılmış" },
];
export const cords: Option<Cord>[] = [
  { value: "cotton", label: "Pamuk ip" },
  { value: "satin", label: "Saten kurdele" },
  { value: "waxed", label: "Vakslı ip" },
];
export const prints: Option<Print>[] = [
  { value: "mono", label: "Tek renk" },
  { value: "emboss", label: "Gofre" },
  { value: "foil", label: "Sıcak yaldız" },
];

export const paperHex: Record<Paper, string> = { kraft: "#C9B48F", ivory: "#F3EEE4", black: "#161616" };

export const defaultHang: HangConfig = {
  size: "60x100",
  paper: "ivory",
  corner: "square",
  cord: "cotton",
  print: "mono",
  showPrice: true,
};

/* ---------------- bakım etiketi ---------------- */
export type CareSize = "30x60" | "35x80" | "40x100";
export type CareMaterial = "satin" | "cotton" | "rpes";
export type WashTemp = 30 | 40;
export type CareSymbol = "bleach" | "iron" | "tumble" | "dryclean";
export type Lang = "tr" | "tr-en";

export type CareConfig = {
  size: CareSize;
  material: CareMaterial;
  wash: WashTemp;
  symbols: Record<CareSymbol, boolean>;
  lang: Lang;
};

export const careSizes: Option<CareSize>[] = [
  { value: "30x60", label: "30 × 60" },
  { value: "35x80", label: "35 × 80" },
  { value: "40x100", label: "40 × 100" },
];
export const careMaterials: Option<CareMaterial>[] = [
  { value: "satin", label: "Saten" },
  { value: "cotton", label: "Pamuk bant" },
  { value: "rpes", label: "Geri dönüşümlü PES" },
];
export const careSymbolLabels: Record<CareSymbol, string> = {
  bleach: "Ağartıcı kullanmayın",
  iron: "Düşük ısıda ütüleyin",
  tumble: "Kurutma makinesine atmayın",
  dryclean: "Kuru temizleme (P)",
};
export const careMaterialHex: Record<CareMaterial, string> = { satin: "#F6F3EC", cotton: "#FFFFFF", rpes: "#EFEFEA" };

export const defaultCare: CareConfig = {
  size: "35x80",
  material: "satin",
  wash: 30,
  symbols: { bleach: true, iron: true, tumble: true, dryclean: true },
  lang: "tr-en",
};

/* ---------------- yardımcılar ---------------- */
export function parseSize(s: string): { w: number; h: number } {
  const [w, h] = s.split("x").map(Number);
  return { w, h };
}

/** Adet kademesi indirimi */
export function tierFactor(qty: number) {
  if (qty >= 2500) return 0.72;
  if (qty >= 1000) return 0.85;
  return 1;
}

const sizeFactor = (index: number) => [1, 1.25, 1.5][index] ?? 1;

export function unitPriceWoven(c: WovenConfig) {
  const base = { damask: 2.4, taffeta: 1.6, satin: 2.1 }[c.weave];
  const i = wovenSizes.findIndex((s) => s.value === c.size);
  return base * sizeFactor(i) + (c.fold === "straight" ? 0 : 0.3);
}

export function unitPriceHang(c: HangConfig) {
  const base = { kraft: 1.1, ivory: 1.4, black: 1.6 }[c.paper];
  const i = hangSizes.findIndex((s) => s.value === c.size);
  const cord = { cotton: 0.3, satin: 0.6, waxed: 0.45 }[c.cord];
  const print = { mono: 0, emboss: 0.8, foil: 1.2 }[c.print];
  return base * sizeFactor(i) + cord + print;
}

export function unitPriceCare(c: CareConfig) {
  const base = { satin: 0.9, cotton: 1.2, rpes: 0.7 }[c.material];
  const i = careSizes.findIndex((s) => s.value === c.size);
  return base * sizeFactor(i) + (c.lang === "tr-en" ? 0.1 : 0);
}
