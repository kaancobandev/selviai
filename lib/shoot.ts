/* ------------------------------------------------------------------
   Shooting — prodüksiyon masası verisi
   ------------------------------------------------------------------ */
const u = (id: string, w = 400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const shootMeta = {
  title: "SS26 Kampanya",
  date: "14 Eylül 2026",
  weekday: "Pazartesi",
  call: "07:00",
  wrap: "19:30",
  location: "Cihangir, İstanbul",
  address: "Sıraselviler Cd. No: 41, Daire 4",
  weather: "24° · Az bulutlu · Rüzgâr 12 km/s",
  sunrise: "06:46",
  sunset: "19:23",
  /** dakika cinsinden (gün başından) altın saat pencereleri */
  golden: [
    { start: 6 * 60 + 46, end: 7 * 60 + 30 },
    { start: 18 * 60 + 35, end: 19 * 60 + 23 },
  ],
  /** "şimdi" işareti — prototip */
  now: 10 * 60 + 52,
};

/* ---------------- durumlar — yalnızca burada pastel ton ---------------- */
export type Status = "confirmed" | "pending" | "sent";
export const statusMeta: Record<Status, { label: string; bg: string; fg: string }> = {
  confirmed: { label: "Onaylandı", bg: "#E6EEE7", fg: "#37513F" },
  pending: { label: "Bekliyor", bg: "#F2EBDD", fg: "#6E5A3A" },
  sent: { label: "Call sheet gönderildi", bg: "#E6EAEF", fg: "#46556A" },
};

/* ---------------- ekip ve lokasyon ---------------- */
export type Person = {
  id: string;
  name: string;
  meta: string;
  image: string;
  status: Status;
  call: string;
};

export type RoleId = "photo" | "stylist" | "hmu" | "model1" | "model2" | "location";

export type Role = {
  id: RoleId;
  label: string;
  shape: "round" | "square";
  candidates: Person[];
};

export const roles: Role[] = [
  {
    id: "photo",
    label: "Fotoğrafçı",
    shape: "round",
    candidates: [
      { id: "deniz", name: "Deniz Arslan", meta: "Editoryal · 35mm & orta format", image: u("1521572267360-ee0c2909d518"), status: "confirmed", call: "07:00" },
      { id: "selin", name: "Selin Kaya", meta: "Kampanya · stüdyo ağırlıklı", image: u("1517677129300-07b130802f46"), status: "pending", call: "07:00" },
    ],
  },
  {
    id: "stylist",
    label: "Stilist",
    shape: "round",
    candidates: [
      { id: "ece", name: "Ece Demir", meta: "Sessiz lüks · arşiv parçalar", image: u("1487412720507-e7ab37603c6f"), status: "confirmed", call: "06:30" },
      { id: "mert", name: "Mert Uz", meta: "Sokak · katmanlı stil", image: u("1600180758890-6b94519a8ba6"), status: "sent", call: "06:30" },
    ],
  },
  {
    id: "hmu",
    label: "Saç & Makyaj",
    shape: "round",
    candidates: [
      { id: "lale", name: "Lale Aydın", meta: "Doğal ten · ıslak saç", image: u("1524504388940-b1c1722653e1"), status: "pending", call: "06:45" },
      { id: "nil", name: "Nil Koç", meta: "Grafik göz · sıkı topuz", image: u("1512436991641-6745cdb1723f"), status: "confirmed", call: "06:45" },
    ],
  },
  {
    id: "model1",
    label: "Model I",
    shape: "round",
    candidates: [
      { id: "elif", name: "Elif", meta: "Fa Models · 178 · 36", image: u("1515886657613-9f3515b0c78f"), status: "confirmed", call: "07:15" },
      { id: "zeynep", name: "Zeynep", meta: "Ice Models · 176 · 36", image: u("1539109136881-3be0616acf4b"), status: "pending", call: "07:15" },
    ],
  },
  {
    id: "model2",
    label: "Model II",
    shape: "round",
    candidates: [
      { id: "derin", name: "Derin", meta: "Fa Models · 180 · 38", image: u("1469334031218-e382a71b716b"), status: "sent", call: "08:30" },
      { id: "mina", name: "Mina", meta: "Neon · 177 · 36", image: u("1529139574466-a303027c1d8b"), status: "pending", call: "08:30" },
    ],
  },
  {
    id: "location",
    label: "Mekân",
    shape: "square",
    candidates: [
      { id: "cihangir", name: "Cihangir daire", meta: "Kuzey pencere · 3. kat · asansör yok", image: u("1618221195710-dd6b41faaea6"), status: "confirmed", call: "06:30" },
      { id: "karakoy", name: "Stüdyo Karaköy", meta: "160 m² · cyclorama · otopark", image: u("1578683010236-d716f9a3f461"), status: "pending", call: "07:00" },
      { id: "kumkapi", name: "Kumkapı sahil", meta: "Dış mekân · altın saat · izin alındı", image: u("1496747611176-843222e1e57c"), status: "confirmed", call: "16:30" },
    ],
  },
];

export const defaultSelection: Record<RoleId, string> = {
  photo: "deniz",
  stylist: "ece",
  hmu: "lale",
  model1: "elif",
  model2: "derin",
  location: "cihangir",
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

/* ---------------- call sheet ---------------- */
export type SlotKind = "crew" | "hmu" | "light" | "look" | "break" | "move" | "wrap";
export type Slot = {
  id: string;
  start: number; // dakika
  end: number;
  kind: SlotKind;
  title: string;
  detail?: string;
  lookId?: string;
  outdoor?: boolean;
  done?: boolean;
};

const t = (h: number, m = 0) => h * 60 + m;
export const schedule: Slot[] = [
  { id: "s1", start: t(7), end: t(7, 30), kind: "crew", title: "Ekip call · kahvaltı", detail: "Tüm ekip · mekân anahtarı stilistte", done: true },
  { id: "s2", start: t(7, 30), end: t(8, 45), kind: "hmu", title: "Saç & makyaj — Model I", detail: "Doğal ten, ıslak saç", done: true },
  { id: "s3", start: t(8, 15), end: t(9), kind: "light", title: "Işık kurulumu", detail: "Salon, kuzey penceresi; reflektör", done: true },
  { id: "s4", start: t(9), end: t(9, 45), kind: "look", title: "Look 01", lookId: "l1", done: true },
  { id: "s5", start: t(9, 45), end: t(10, 30), kind: "look", title: "Look 02", lookId: "l2", done: true },
  { id: "s6", start: t(10, 30), end: t(11, 15), kind: "look", title: "Look 03", lookId: "l3" },
  { id: "s7", start: t(11, 15), end: t(11, 45), kind: "hmu", title: "Saç değişimi — Model II", detail: "Sıkı topuz" },
  { id: "s8", start: t(11, 45), end: t(12, 30), kind: "look", title: "Look 04", lookId: "l4" },
  { id: "s9", start: t(12, 30), end: t(13, 15), kind: "break", title: "Öğle", detail: "Catering" },
  { id: "s10", start: t(13, 15), end: t(14), kind: "look", title: "Look 05", lookId: "l5" },
  { id: "s11", start: t(14), end: t(14, 45), kind: "look", title: "Look 06", lookId: "l6" },
  { id: "s12", start: t(15, 30), end: t(16, 30), kind: "move", title: "Dış mekâna geçiş", detail: "Kumkapı sahil · 2 araç · izin belgesi", outdoor: true },
  { id: "s13", start: t(17, 45), end: t(18, 30), kind: "look", title: "Look 07", lookId: "l7", outdoor: true },
  { id: "s14", start: t(18, 35), end: t(19, 20), kind: "look", title: "Look 08", lookId: "l8", outdoor: true },
  { id: "s15", start: t(19, 30), end: t(20), kind: "wrap", title: "Wrap · iade listesi", detail: "Ödünç parçalar sayılır, kutulanır", outdoor: true },
];

export const fmtTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
