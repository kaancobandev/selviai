/* ------------------------------------------------------------------
   Shooting — prodüksiyon masası verisi

   EKİP, LOKASYON VE CALL SHEET BURADAN KALDIRILDI. Gerekçe ürünün
   kendisi: Selvi tam da o insanlara ve o efora ihtiyaç kalmasın diye
   var. Rol listesi (aday portreleri, call saatleri, onay durumları),
   mekân adayları, gün planı ve gün ışığı verisi bu yüzden silindi.
   Geriye çekimin yaratıcı kısmı kaldı: ışık senaryosu, referans
   kareleri, look–model eşleştirme ve prop listesi.
   ------------------------------------------------------------------ */
const u = (id: string, w = 400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Tohum yokken başlıkta duran örnek iş adı — araç tek başına da anlaşılır olmalı. */
export const ORNEK_BASLIK = "SS26 Kampanya";

/* ---------------- ödünç rozeti — arayüzdeki tek pastel ton ----------------
   Eskiden üç durum vardı: onaylandı (adaçayı), bekliyor (kum), call sheet
   gönderildi (sis). İlki ve sonuncusu ekip kartlarına aitti, ekiple
   birlikte gittiler. Prop listesindeki "ödünç" rozeti ayakta olduğu için
   kum tonu duruyor; tek üyeli birlik bilerek bırakıldı, çağrı yerinin
   `tone` yazması etiketi hangi tonun boyadığını görünür tutuyor. */
export type Status = "pending";
export const statusMeta: Record<Status, { bg: string; fg: string }> = {
  pending: { bg: "#F2EBDD", fg: "#6E5A3A" },
};

/* ---------------- sanat yönetimi ve ışık ---------------- */
export type MoodId = "daylight" | "golden" | "night" | "studio";
export const moods: { id: MoodId; label: string; kelvin: string; note: string; window: string }[] = [
  { id: "daylight", label: "Gündüz · Doğal ışık", kelvin: "5600 K", note: "Kuzey penceresi, beyaz perdeyle yumuşatılmış. Gümüş reflektör, düşük kontrast.", window: "09:00 – 15:30" },
  { id: "golden", label: "Altın saat", kelvin: "3400 K", note: "Düşük güneş, sırt ışığı; kontrollü flare. Son 40 dakika için iki look.", window: "17:45 – 19:20" },
  { id: "night", label: "Gece", kelvin: "2800 K", note: "Tek flaş + ışık kılıcı, sokak lambası karışımı. Tripod, ISO 800.", window: "19:45 +" },
  { id: "studio", label: "Stüdyo", kelvin: "5600 K", note: "Çift softbox, nötr gri zemin, yumuşak gölge. Işık değişmez.", window: "Bağımsız" },
];

export type TearTag = "Mekân" | "Işık" | "Poz" | "Saç" | "Renk" | "Gardırop" | "Yeni";
export type Tearsheet = {
  id: string;
  image: string;
  caption: string;
  tag: TearTag;
  /** Blob URL — sokulunce serbest birakiliyor. */
  local?: boolean;
  /**
   * Ana sayfadaki akistan tohumlandi. `local` ile KARISTIRILMAMALI:
   * o blob URL demek ve revokeObjectURL cagriliyor. Tohum kareleri
   * kendi API ucumuzdan geliyor, serbest birakilacak bir sey yok —
   * ama Next'in gorsel iyilestiricisinden de gecirilmemeliler.
   */
  tohum?: boolean;
};
export const tearsheets: Tearsheet[] = [
  { id: "t1", image: u("1524504388940-b1c1722653e1", 600), caption: "Yan pencere, yumuşak geçiş", tag: "Işık" },
  { id: "t2", image: u("1496747611176-843222e1e57c", 600), caption: "Rüzgârda kumaş, geniş kadraj", tag: "Poz" },
  { id: "t3", image: u("1594633312681-425c7b97ccd1", 600), caption: "Detay: bel ve pantolon düşümü", tag: "Gardırop" },
  { id: "t4", image: u("1529139574466-a303027c1d8b", 600), caption: "Islak saç, toplu", tag: "Saç" },
  { id: "t5", image: u("1618221195710-dd6b41faaea6", 600), caption: "Kireç duvar, ahşap döşeme", tag: "Mekân" },
  { id: "t6", image: u("1617957718614-8c23f060c2d0", 600), caption: "Sıcak ton, gün batımı", tag: "Renk" },
];

/* ---------------- stilist çalışma alanı ---------------- */
export type Look = { id: string; no: string; name: string; pieces: number; accessories: string; image: string };
export const looks: Look[] = [
  { id: "l1", no: "01", name: "Keten takım", pieces: 3, accessories: "Gümüş halka küpe · deri sandalet", image: u("1515886657613-9f3515b0c78f", 300) },
  { id: "l2", no: "02", name: "Kül gömlek + pantolon", pieces: 2, accessories: "İnce deri kemer", image: u("1594633312681-425c7b97ccd1", 300) },
  { id: "l3", no: "03", name: "Siyah krep elbise", pieces: 1, accessories: "Topuklu bot 38", image: u("1469334031218-e382a71b716b", 300) },
  { id: "l4", no: "04", name: "Yün palto + triko", pieces: 2, accessories: "Keten bere", image: u("1539109136881-3be0616acf4b", 300) },
  { id: "l5", no: "05", name: "Denim set", pieces: 2, accessories: "Beyaz tişört · spor ayakkabı", image: u("1512436991641-6745cdb1723f", 300) },
  { id: "l6", no: "06", name: "Saten bluz + etek", pieces: 2, accessories: "İnci küpe", image: u("1581044777550-4cfa60707c03", 300) },
  { id: "l7", no: "07", name: "Trençkot", pieces: 1, accessories: "Güneş gözlüğü · eldiven", image: u("1483985988355-763728e1935b", 300) },
  { id: "l8", no: "08", name: "Triko elbise", pieces: 1, accessories: "Çorap · loafer", image: u("1529139574466-a303027c1d8b", 300) },
];

export type Assignment = Record<string, "model1" | "model2" | null>;
export const defaultAssignment: Assignment = {
  l1: "model1",
  l2: "model2",
  l3: "model1",
  l4: null,
  l5: "model2",
  l6: null,
  l7: null,
  l8: null,
};

export type Prop = {
  id: string;
  name: string;
  owner: string;
  done: boolean;
  borrowed?: { from: string; returnBy: string };
};
export const props: Prop[] = [
  { id: "p1", name: "Gümüş halka küpe (2 çift)", owner: "Stilist", done: true, borrowed: { from: "Monom", returnBy: "18 Eyl" } },
  { id: "p2", name: "İnce deri kemer, siyah", owner: "Stilist", done: true },
  { id: "p3", name: "Topuklu bot 38", owner: "Stilist", done: false, borrowed: { from: "Manu Atelier", returnBy: "17 Eyl" } },
  { id: "p4", name: "Keten bere, ham", owner: "Stilist", done: false },
  { id: "p5", name: "Eski film kamerası (prop)", owner: "Sanat yön.", done: true, borrowed: { from: "Arşiv", returnBy: "20 Eyl" } },
  { id: "p6", name: "Beyaz buket, 12 dal", owner: "Asistan", done: false },
  { id: "p7", name: "Steamer + yedek su", owner: "Asistan", done: true },
  { id: "p8", name: "Dikiş kiti, çift taraflı bant", owner: "Stilist", done: true },
];
