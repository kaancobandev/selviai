"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { fabrics } from "@/lib/fabrics";
import {
  bbox,
  dist,
  distToPolyline,
  inset,
  overlockTicks,
  pointInPolygon,
  polyPath,
  samplePath,
  simplify,
  smoothPath,
  splitPolygon,
  toCm,
  zigzag,
  type Pt,
} from "@/lib/geometry";
import { cn } from "@/lib/utils";
import { TEKNIK_EKSENLERI, type Aspect, type TeknikEkseni } from "@/lib/ai/types";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { Croquis } from "@/components/croquis";
import { Toast } from "@/components/ui/toast";

/* ------------------------------------------------------------------
   Tipler ve sabitler
   ------------------------------------------------------------------ */
type Tool = "select" | "pen" | "measure" | "cut" | "hand";
type Stitch = "duz" | "ust" | "zigzag" | "surfile";
type ViewId = "front" | "back" | "detail";

type Shape = {
  id: string;
  name: string;
  points: Pt[];
  closed: boolean;
  smooth: boolean;
  stitch: Stitch;
  fabricId: string | null;
  visible: boolean;
};
type Measure = { id: string; a: Pt; b: Pt };
type ViewDoc = { shapes: Shape[]; measures: Measure[] };
type Doc = Record<ViewId, ViewDoc>;

const TOOLS: { id: Tool; label: string; key: string; hint: string }[] = [
  { id: "select", label: "Seç", key: "V", hint: "Parçaya tıkla · sürükle taşı · çapaları çek" },
  { id: "pen", label: "Kalem", key: "P", hint: "Tıkla nokta ekle · ilk noktaya dön kapat · Enter bitir" },
  { id: "measure", label: "Mezura", key: "M", hint: "İki nokta arasını sürükle · cm" },
  { id: "cut", label: "Makas", key: "C", hint: "Parçanın üzerinden bir çizgi çek · ikiye böler" },
  { id: "hand", label: "El", key: "H", hint: "Tuvali sürükle · tekerlek yakınlaştırır" },
];
const STITCHES: { id: Stitch; label: string }[] = [
  { id: "duz", label: "Düz dikiş" },
  { id: "ust", label: "Üst dikiş" },
  { id: "zigzag", label: "Zigzag" },
  { id: "surfile", label: "Sürfile" },
];
const VIEWS: { id: ViewId; label: string }[] = [
  { id: "front", label: "Ön" },
  { id: "back", label: "Arka" },
  { id: "detail", label: "Detay" },
];

const SELECT = "#6B7C93"; // mat mavi-gri — yalnızca seçim
const INK = "#1a1a1a";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

const uid = () => Math.random().toString(36).slice(2, 9);
const fmtCm = (units: number) => toCm(units).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const P = (x: number, y: number): Pt => ({ x, y });

/* Örnek doküman — keten bluz */
const blouse = (neck: number): Pt[] => [
  P(-16, 106), P(-72, 122), P(-64, 172), P(-54, 292), P(-64, 410),
  P(64, 410), P(54, 292), P(64, 172), P(72, 122), P(16, 106), P(0, neck),
];
const initialDoc: Doc = {
  front: {
    shapes: [
      { id: "s-front", name: "Ön beden", points: blouse(130), closed: true, smooth: true, stitch: "ust", fabricId: "organik-keten", visible: true },
      { id: "s-sleeve", name: "Kol", points: [P(150, 124), P(181, 104), P(212, 124), P(206, 250), P(196, 332), P(166, 332), P(156, 250)], closed: true, smooth: true, stitch: "duz", fabricId: "organik-keten", visible: true },
    ],
    measures: [{ id: "m1", a: P(-72, 122), b: P(72, 122) }],
  },
  back: {
    shapes: [{ id: "s-back", name: "Arka beden", points: blouse(112), closed: true, smooth: true, stitch: "duz", fabricId: "organik-keten", visible: true }],
    measures: [],
  },
  detail: {
    shapes: [
      { id: "s-cuff", name: "Manşet", points: [P(-80, 0), P(80, 0), P(80, 40), P(-80, 40)], closed: true, smooth: false, stitch: "surfile", fabricId: "organik-keten", visible: true },
      { id: "s-pocket", name: "Cep", points: [P(120, 0), P(180, 0), P(180, 60), P(150, 72), P(120, 60)], closed: true, smooth: false, stitch: "zigzag", fabricId: "denim", visible: true },
    ],
    measures: [{ id: "m2", a: P(-80, 52), b: P(80, 52) }],
  },
};

/* ------------------------------------------------------------------
   TOHUM ALTLIĞI — ana sayfada üretilen kare, çizimin arkasında

   HANGİ KARE VARSAYILAN OLUYOR. Türetilmiş çıktılara GİYSİ SİLUETİ
   eklendi (bkz. TURETILMIS_TURLER) ve altlık artık öncelikle onu alıyor:
   dördün içinde giysiyi gösteren tek kare o, yani kroki'nin arkasında
   üstünden çizilecek şeyin ta kendisi. Yoksa moodboard'a, o da yoksa
   seçilen ilham karesine düşüyor — ikisi de giysi değil, ama palet ve
   malzeme referansı olarak hâlâ işe yarıyorlar.

   ESKİDEN ÖYLE BİR KARE YOKTU: ilham karelerinde giysi açıkça yasak ve
   kalan üç çıktı düz yatık görseldi; bir doğa fotoğrafına "ürettiğimiz
   giysi" demek üretmediğimiz şeyi üretmiş gibi göstermek olurdu. Şimdi
   siluet gerçekten üretiliyor, o yüzden adıyla anılabiliyor.

   AMA FOTOĞRAF ZAYIF BİR KILAVUZ. Siluet karesi gerçek bir çekim gibi
   duruyor: perspektifi, gölgesi, kırışığı ve içinde bir beden var.
   Üstünden çizgi geçirmek için istenen şey TEKNİK ÇİZİM — sektörün düz
   yatık, simetrik, gölgesiz çizgi resmi. Araç onu istendiğinde
   üretebiliyor (bkz. TEKNİK ÇİZİM bloğu); fotoğraf altlığı YEDEK kaldı.

   ALTLIK GÖRÜNÜM BAŞINA TUTULUYOR. Eskiden tek bir değer hem öne hem
   arkaya konuyordu; siluet tek bir ÖNDEN karedir, arkaya konduğunda
   tasarımcı arkayı ön fotoğrafından çiziyordu. Teknik çizim işi zaten
   ön ve arka olmak üzere iki kare döndürüyor, o yüzden altlık da iki
   yuva: `front` ve `back`. Detayda figür yok, altlık da yok.

   OPAKLIK/ÖLÇEK/KONUM PAYLAŞILIYOR, görünüm başına DEĞİL. Bunlar karenin
   değil BAKIŞIN ayarı — "ne kadar soluk", "ne kadar büyük". İki teknik
   çizim aynı işten, aynı oranla, aynı kroki'nin üstüne geliyor; biri için
   ayarlanan kutu ötekine de oturuyor. Görünüm başına tutmak paneldeki
   dört sürgüyü sekize çıkarır, karşılığında hiçbir şey vermezdi.

   Bedeli bilinerek ödeniyor: iki görünümde FARKLI TÜR altlık varsa (biri
   çizim, öteki fotoğraf — üretimden yalnız bir kare döndüğünde olur) tek
   kutu ikisine birden hizmet ediyor ve öteki tür kendi çerçevesinde
   durmuyor. Panelin "sıfırla" düğmesi tek tıkla aktif türün çerçevesine
   döndürüyor.

   Kare kroki'nin ARKASINA, ayarlanabilir opaklıkta bir REFERANS ALTLIK
   olarak konuyor — tasarımcı üstünden çizer. Kutu panelden ayarlanıyor,
   tuvalden sürüklenerek değil: altlık `pointer-events-none` olmak
   ZORUNDA, aksi hâlde vuruş testi, kalem ve makas sessizce ölür.
   ------------------------------------------------------------------ */
type AltlikKutu = { x: number; y: number; w: number; h: number };

/** Altlık taşıyan görünümler — detayda manşet ve cep var, figür yok. */
type AltlikGorunum = "front" | "back";

/**
 * Bir görünümün altlığı. `tur` süs değil, tuvalde davranış değiştiriyor:
 * teknik çizim kutuya SIĞARAK (`meet`), fotoğraf kutuyu DOLDURARAK
 * (`slice`) yerleşiyor — gerekçe `image` düğümünün başında.
 */
type Altlik = { src: string; tur: "kare" | "teknik" };

/* Kroki'nin kapladığı alan — components/croquis.tsx'ten ölçüldü: baş
   elipsi (cy 40, ry 36) y=4'te başlıyor, ayak tabanı y=672, en dış kol
   çizgisi |x|=90. Altlık varsayılan olarak buraya oturuyor. */
const KROKI_ALAN: AltlikKutu = { x: -90, y: 4, w: 180, h: 668 };
const ALTLIK_OPAKLIK = 0.45;

/* ------------------------------------------------------------------
   TEKNİK ÇİZİM — istendiğinde üretilen ön/arka çizgi resmi

   NEDEN BURADAN, AKIŞTAN DEĞİL. Ana sayfa koşusu zaten sekiz kare
   harcıyor ve kullanıcıların çoğu bu aracı hiç açmıyor; iki kareyi
   herkese peşinen ödetmek yerine isteyene burada üretiliyor. Kolaj
   kesimindeki karar bu (bkz. components/kolaj-studio.tsx başı).

   NEDEN İKİ KARE. Araçta ön ve arka ayrı görünüm ve `Croquis` `back`
   propuyla dönüyor; ikisi birebir eşleşiyor. Yuva adları motorun
   sözlüğünden geliyor, burada ikinci bir sözlük tutulmuyor: `TEKNIK_YUVA`
   `TeknikEkseni` ile yazıldığı için eksen adı değişirse burası DERLENMEZ,
   sessizce boş kare beklemez.

   KAYNAK SİLUET. Giysi fotoğrafını çizgi resme çevirmek modelin
   yapabileceği bir iş; ilham karesinden yoktan teknik çizim uydurmak
   değil. Siluet yoksa düğme kapalı kalıyor.

   ÇİZİMLER ÇALIŞMA KAYDINA YAZILMIYOR: iş kendi kimliğiyle duruyor ama
   `Calisma` yalnız ilham ve türetme işini tanıyor (bkz. lib/ai/tohum.ts).
   Yani üretilen çizim bu araç açıkken yaşıyor, sayfa yenilenince yeniden
   üretmek gerekiyor. Kayda bağlamak tohum tipini ve sunucu tarafını
   değiştirmek demekti; bu tur yalnız aracı değiştiriyor.
   ------------------------------------------------------------------ */

/**
 * Üretim oranı. Kroki alanı 180×668 birim, yani ~1:3,7; `ASPECTS` içinde
 * o kadar dar bir oran yok, en dikeyi 3:4. Kare kutuya `meet` ile
 * oturduğu için artan boşluk zarar vermiyor — kırpma verirdi.
 */
const TEKNIK_ORAN: Aspect = "3:4";

/**
 * Teknik çizimin varsayılan çerçevesi — KROKI_ALAN DEĞİL.
 *
 * Kroki alanı bütün figür: 180×668, yani ~1:3,7. 3:4'lük bir kareyi oraya
 * sığdırmak (`meet`) çizimi genişlikten oturtur ve 180×240'a düşürür —
 * çizim figürün ortasında ufacık kalır, üstünden çizilecek hâlde olmaz.
 *
 * Çerçeve bu yüzden GİYSİNİN oturduğu alandan türetildi. Ölçüler bu
 * dosyadaki örnek bluzdan: omuz y=106, etek ucu y=410, omuz ucu |x|=72
 * (croquis.tsx da aynısını söylüyor — omuz ucu 72/118, kalça çizgisi 400).
 * Giysi zarfı 144×304, merkezi (0, 258).
 *
 * Karedeki giysinin çerçeveyi payla doldurduğunu varsayıyoruz (~%85):
 * 304 / 0,85 ≈ 358 yükseklik, 3:4'te 268 genişlik. Kutu tam 3:4 olduğu
 * için `meet` ile `slice` çakışıyor — ne kırpma ne boşluk kalıyor.
 * Varsayım tutmazsa ölçek ve konum sürgüleri duruyor.
 */
const TEKNIK_ALAN: AltlikKutu = { x: -134, y: 79, w: 268, h: 358 };

/** Hangi görünümün altlığı hangi yuvadan gelir. */
const TEKNIK_YUVA: Record<AltlikGorunum, TeknikEkseni> = {
  front: "teknik-on",
  back: "teknik-arka",
};

/** Referans şeridinde üretilen çizimlerin adı. */
const TEKNIK_ETIKET: Record<AltlikGorunum, string> = {
  front: "Teknik ön",
  back: "Teknik arka",
};

/** Altlığın varsayılan çerçevesi; ölçek ve konum sürgüleri de buna göre okunuyor. */
const varsayilanKutu = (altlik: Altlik | null): AltlikKutu =>
  altlik?.tur === "teknik" ? TEKNIK_ALAN : KROKI_ALAN;

const YOKLAMA_MS = 2000;
/** Bu süre sonunda yoklama bırakılır; sunucu kendi bekçisini işletiyor. */
const YOKLAMA_TAVANI_MS = 4 * 60 * 1000;

/** Eksen kodundan okunur ad; tohum kareleri bu kodlarla etiketleniyor. */
const EKSEN_ADI: Record<string, string> = {
  doga: "Doğa",
  sanat: "Sanat",
  doku: "Doku",
  mekan: "Mekân",
  moodboard: "Moodboard",
  kumas: "Kumaş",
  branding: "Marka",
  /* "Siluet" değil "Giysi siluet": şeritteki öteki yedi kare giysi değil,
     ayrımı etiket söylemeli. */
  siluet: "Giysi siluet",
};

/**
 * Üretilen kumaş karesinin kumaş kimliği — deseni `fab-tohum` oluyor.
 *
 * `fabrics` dizisinde BİLEREK YOK: kartelada kompozisyon, gramaj, en ve
 * fiyat gibi ölçülmüş veriler var, üretilen karede yalnız görüntü var.
 * Diziye uydurma bir satır eklemek o alanları yalan söyletirdi. Kimliği
 * ada çeviren tek yer bu yüzden `kumasAdi()`; `fabrics.find()` bu kimlikte
 * undefined döner ve panelde boşluk bırakırdı.
 */
const TOHUM_KUMAS = "tohum";

function kumasAdi(id: string | null): string {
  if (!id) return "—";
  if (id === TOHUM_KUMAS) return "Üretilen kumaş karesi";
  return fabrics.find((f) => f.id === id)?.name ?? id;
}

/** Şeritteki tek kare — tohumdan gelmiş ya da burada üretilmiş olabilir. */
type Referans = Altlik & { etiket: string };

/** Tohumdaki bütün kareler: dört ilham kaynağı ve türetilmiş çıktılar. */
function tohumKareleri(tohum: StudyoTohum | null | undefined): Referans[] {
  if (!tohum) return [];
  const adlar = new Map(tohum.kareler.map((k) => [k.url, EKSEN_ADI[k.etiket] ?? k.etiket]));
  const turetilmis = Object.values(tohum.turetilmis).filter((u): u is string => Boolean(u));
  return [...new Set([...tohum.ilham, ...turetilmis])].map((src) => ({
    src,
    tur: "kare" as const,
    etiket: adlar.get(src) ?? "Kare",
  }));
}

type Drag =
  | { kind: "pan"; startClient: Pt; startView: Pt }
  | { kind: "move"; id: string; start: Pt; orig: Pt[]; recorded: boolean }
  | { kind: "anchor"; id: string; index: number }
  | { kind: "measure"; a: Pt }
  | { kind: "cut"; a: Pt };

/* ------------------------------------------------------------------
   Bileşen
   ------------------------------------------------------------------ */
/**
 * `tohum` verilirse ana sayfada üretilenler ARAÇTA GÖRÜNÜR olur: kareler
 * kroki'nin arkasına altlık olarak konabiliyor, üretilen kumaş karesi de
 * dolgu deseni oluyor. Belge TOHUMLANMIYOR — parçalar, ölçüler ve dikiş
 * tipleri bir görselden çıkarılamaz; uydurulursa araç ölçmediği şeyi
 * ölçmüş gibi gösterir. Tohumsuz açılışta araç eskisiyle birebir aynı.
 */
export function FlatSketch({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [doc, setDoc] = useState<Doc>(initialDoc);
  const [undo, setUndo] = useState<Doc[]>([]);
  const [view, setView] = useState<ViewId>("front");
  const [tool, setTool] = useState<Tool>("select");
  const [stitch, setStitch] = useState<Stitch>("duz");
  const [smooth, setSmooth] = useState(true);
  const [stitchOpen, setStitchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>("s-front");
  const [draft, setDraft] = useState<Pt[]>([]);
  const [hover, setHover] = useState<Pt | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [temp, setTemp] = useState<Pt | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [userView, setUserView] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  /* Açılış altlığı: giysi silueti → moodboard → seçilen ilham karesi.
     Siluet önce çünkü tek GİYSİ olan o; ötekiler tasarımın kaynağı ya da
     özeti, üstünden kalıp çizilecek şey değil. Aynı kare iki görünüme de
     konuyor — siluet ÖNDEN bir kare ve arkada zayıf kalıyor, teknik çizim
     tam bu boşluğu dolduruyor. Kullanıcı panelden istediğine geçebiliyor.
     Tohum yalnız ilk kurulumda okunuyor. */
  const [altliklar, setAltliklar] = useState<Record<AltlikGorunum, Altlik | null>>(() => {
    const src = tohum?.turetilmis.siluet ?? tohum?.turetilmis.moodboard ?? tohum?.secilen ?? null;
    const ilk: Altlik | null = src ? { src, tur: "kare" } : null;
    return { front: ilk, back: ilk };
  });
  const [altlikOpaklik, setAltlikOpaklik] = useState(ALTLIK_OPAKLIK);
  const [altlikKutu, setAltlikKutu] = useState<AltlikKutu>(KROKI_ALAN);
  /* Üretilen teknik çizimler altlıktan AYRI tutuluyor: kullanıcı altlığı
     fotoğrafa çevirdiğinde çizim şeritten düşmemeli, geri dönebilmeli. */
  const [teknikCizim, setTeknikCizim] = useState<Record<AltlikGorunum, string | null>>({
    front: null,
    back: null,
  });
  const [teknikIsId, setTeknikIsId] = useState<string | null>(null);
  const [teknikCalisiyor, setTeknikCalisiyor] = useState(false);
  const [teknikAdim, setTeknikAdim] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* ---------- görünüm (pan/zoom) ---------- */
  const fitView = useCallback(
    (w: number, h: number) => {
      const box = view === "detail" ? { minX: -120, minY: -60, w: 340, h: 180 } : { minX: -130, minY: -30, w: 360, h: 740 };
      const zoom = Math.min((w - 80) / box.w, (h - 120) / box.h, 2.2);
      return { zoom, x: box.minX + box.w / 2 - w / 2 / zoom, y: box.minY + box.h / 2 - h / 2 / zoom };
    },
    [view],
  );
  const vp = userView ?? fitView(size.w, size.h);
  const vpRef = useRef(vp);
  const sizeRef = useRef(size);
  useEffect(() => {
    vpRef.current = vp;
    sizeRef.current = size;
  }, [vp, size]);

  // boyut gözlemi ve tekerlekle yakınlaştırma (pasif olmayan dinleyici)
  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(wrap);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const v = vpRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = v.x + mx / v.zoom;
      const cy = v.y + my / v.zoom;
      setUserView({ zoom, x: cx - mx / zoom, y: cy - my / zoom });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      svg.removeEventListener("wheel", onWheel);
    };
  }, []);

  const toCanvas = (clientX: number, clientY: number): Pt => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: vp.x + (clientX - rect.left) / vp.zoom, y: vp.y + (clientY - rect.top) / vp.zoom };
  };
  const zoomBy = (factor: number) => {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, vp.zoom * factor));
    const cx = vp.x + size.w / 2 / vp.zoom;
    const cy = vp.y + size.h / 2 / vp.zoom;
    setUserView({ zoom, x: cx - size.w / 2 / zoom, y: cy - size.h / 2 / zoom });
  };

  /* ---------- doküman yardımcıları ---------- */
  const cur = doc[view];
  const selected = cur.shapes.find((s) => s.id === selectedId) ?? null;
  const commit = (mutate: (d: ViewDoc) => ViewDoc) => {
    setUndo((u) => [...u.slice(-29), doc]);
    setDoc((d) => ({ ...d, [view]: mutate(d[view]) }));
  };
  const updateShape = (id: string, patch: Partial<Shape>, record = true) => {
    const apply = (d: ViewDoc): ViewDoc => ({ ...d, shapes: d.shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    if (record) commit(apply);
    else setDoc((d) => ({ ...d, [view]: apply(d[view]) }));
  };
  const undoLast = () => {
    if (undo.length === 0) return;
    setDoc(undo[undo.length - 1]);
    setUndo(undo.slice(0, -1));
  };
  const removeSelected = () => {
    if (!selectedId) return;
    commit((d) => ({ ...d, shapes: d.shapes.filter((s) => s.id !== selectedId), measures: d.measures.filter((m) => m.id !== selectedId) }));
    setSelectedId(null);
  };
  const hitTest = (p: Pt): Shape | null => {
    const tol = 6 / vp.zoom;
    for (let i = cur.shapes.length - 1; i >= 0; i--) {
      const s = cur.shapes[i];
      if (!s.visible) continue;
      const poly = samplePath(s.points, s.closed, s.smooth, 4);
      if (s.closed && pointInPolygon(p, poly)) return s;
      if (distToPolyline(p, poly, s.closed) < tol) return s;
    }
    return null;
  };
  const finishDraft = (close: boolean) => {
    const pts = simplify(draft, 2 / vp.zoom);
    if (pts.length >= (close ? 3 : 2)) {
      const id = uid();
      const n = cur.shapes.length + 1;
      commit((d) => ({
        ...d,
        shapes: [...d.shapes, { id, name: `Parça ${n}`, points: pts, closed: close, smooth, stitch, fabricId: null, visible: true }],
      }));
      setSelectedId(id);
    }
    setDraft([]);
  };
  const applyFabric = (shapeId: string, fabricId: string | null) => {
    updateShape(shapeId, { fabricId });
    /* Ad `kumasAdi()` üzerinden: tohum kumaşı kartelada olmadığı için
       `fabrics.find()` onda sessizce hiçbir şey söylemezdi. */
    if (fabricId) setToast(`${kumasAdi(fabricId)} uygulandı`);
  };

  /* ---------- klavye ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.code === "Space") {
        if (!e.repeat) setSpaceDown(true);
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undoLast();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "v") setTool("select");
      else if (k === "p") setTool("pen");
      else if (k === "m") setTool("measure");
      else if (k === "c") setTool("cut");
      else if (k === "h") setTool("hand");
      else if (k === "escape") {
        setDraft([]);
        setSelectedId(null);
        setStitchOpen(false);
      } else if (k === "enter") {
        if (draft.length) finishDraft(false);
      } else if (k === "delete" || k === "backspace") {
        if (draft.length) setDraft((d) => d.slice(0, -1));
        else removeSelected();
      } else if (k === "+" || k === "=") zoomBy(1.2);
      else if (k === "-") zoomBy(1 / 1.2);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  });

  /* ---------- işaretçi ---------- */
  const panning = tool === "hand" || spaceDown;

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button === 1 || panning) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ kind: "pan", startClient: { x: e.clientX, y: e.clientY }, startView: { x: vp.x, y: vp.y } });
      return;
    }
    if (e.button !== 0) return;
    const p = toCanvas(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    setStitchOpen(false);
    if (tool === "select") {
      const hit = hitTest(p);
      if (hit) {
        setSelectedId(hit.id);
        setDrag({ kind: "move", id: hit.id, start: p, orig: hit.points, recorded: false });
      } else {
        setSelectedId(null);
      }
    } else if (tool === "pen") {
      if (draft.length >= 3 && dist(p, draft[0]) < 8 / vp.zoom) {
        finishDraft(true);
      } else {
        setDraft((d) => [...d, p]);
      }
    } else if (tool === "measure") {
      setDrag({ kind: "measure", a: p });
      setTemp(p);
    } else if (tool === "cut") {
      setDrag({ kind: "cut", a: p });
      setTemp(p);
    }
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const p = toCanvas(e.clientX, e.clientY);
    setHover(p);
    if (!drag) return;
    if (drag.kind === "pan") {
      const dx = (e.clientX - drag.startClient.x) / vp.zoom;
      const dy = (e.clientY - drag.startClient.y) / vp.zoom;
      setUserView({ zoom: vp.zoom, x: drag.startView.x - dx, y: drag.startView.y - dy });
    } else if (drag.kind === "move") {
      const dx = p.x - drag.start.x;
      const dy = p.y - drag.start.y;
      if (!drag.recorded && Math.hypot(dx, dy) > 1 / vp.zoom) {
        setUndo((u) => [...u.slice(-29), doc]);
        setDrag({ ...drag, recorded: true });
      }
      updateShape(drag.id, { points: drag.orig.map((q) => ({ x: q.x + dx, y: q.y + dy })) }, false);
    } else if (drag.kind === "anchor") {
      setDoc((d) => ({
        ...d,
        [view]: {
          ...d[view],
          shapes: d[view].shapes.map((s) => (s.id === drag.id ? { ...s, points: s.points.map((q, i) => (i === drag.index ? p : q)) } : s)),
        },
      }));
    } else {
      setTemp(p);
    }
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const p = toCanvas(e.clientX, e.clientY);
    if (drag.kind === "measure") {
      if (dist(drag.a, p) > 6 / vp.zoom) {
        const id = uid();
        commit((d) => ({ ...d, measures: [...d.measures, { id, a: drag.a, b: p }] }));
        setSelectedId(id);
      }
    } else if (drag.kind === "cut") {
      if (dist(drag.a, p) > 6 / vp.zoom) {
        let pieces = 0;
        const next: Shape[] = [];
        for (const s of cur.shapes) {
          if (!s.closed) { next.push(s); continue; }
          const poly = samplePath(s.points, s.closed, s.smooth, 4);
          const split = splitPolygon(poly, drag.a, p);
          if (!split) { next.push(s); continue; }
          pieces += 1;
          next.push(
            { ...s, id: uid(), name: `${s.name} A`, points: split[0], smooth: false },
            { ...s, id: uid(), name: `${s.name} B`, points: split[1], smooth: false },
          );
        }
        if (pieces) {
          commit((d) => ({ ...d, shapes: next }));
          setSelectedId(null);
        }
        setToast(pieces ? `${pieces} parça ikiye bölündü` : "Kesim çizgisi bir parçadan geçmedi");
      }
    }
    setDrag(null);
    setTemp(null);
  }

  function onAnchorDown(e: ReactPointerEvent<SVGRectElement>, id: string, index: number) {
    if (tool !== "select") return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    setUndo((u) => [...u.slice(-29), doc]);
    setDrag({ kind: "anchor", id, index });
  }

  /* ---------- kumaş sürükle-bırak ---------- */
  function onDropFabric(e: DragEvent<SVGSVGElement>) {
    e.preventDefault();
    const fabricId = e.dataTransfer.getData("text/fabric");
    if (!fabricId) return;
    const p = toCanvas(e.clientX, e.clientY);
    const hit = hitTest(p);
    if (hit && hit.closed) {
      setSelectedId(hit.id);
      applyFabric(hit.id, fabricId);
    } else {
      setToast("Kumaşı kapalı bir parçanın üstüne bırakın");
    }
  }

  /* ---------- teknik çizim üretimi ---------- */
  /* Kaynak KİMLİĞİYLE gidiyor, adresiyle değil: `/api/teknik` "hangi işin
     kaçıncı karesi" diyeni kovadaki yola kendisi çeviriyor ve o sırada
     karenin bu oturuma ait olduğunu doğruluyor. İstemcinin depo yolu
     bilmesi gerekmiyor — kesim ve çekim uçlarındaki gerekçenin aynısı. */
  const siluetKare = tohum?.kareler.find((k) => k.etiket === "siluet") ?? null;

  async function teknikUret() {
    if (!siluetKare) {
      setToast("Akışta giysi silueti yok; teknik çizim ondan üretiliyor.");
      return;
    }
    setTeknikCalisiyor(true);
    setTeknikAdim(null);
    try {
      const r = await fetch("/api/teknik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kaynak: { isId: siluetKare.isId, sira: siluetKare.sira },
          /* Ayrı bir not alanı YOK: çizim tamamen kaynak karenin
             kopyası, serbest metin onu ancak saptırır. Brief yine de
             gidiyor — giysinin adını modelin sözlüğüne koyuyor. */
          metin: tohum?.brief ?? "",
          aspect: TEKNIK_ORAN,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        /* Ucun kendi metni gösteriliyor: 429 "zaten süren bir iş var"
           diyor ve kullanıcı bunu bilmeden düğmeye basmayı sürdürür. */
        setToast(j.error ?? "Teknik çizim başlatılamadı.");
        setTeknikCalisiyor(false);
        return;
      }
      setTeknikIsId(j.jobId as string);
    } catch {
      setToast("Bağlantı kurulamadı.");
      setTeknikCalisiyor(false);
    }
  }

  /* Gelen kareleri yuva ADIYLA eşleştirir, dizi sırasıyla değil: bir kare
     üretilemezse iş onu atlayıp ötekini döndürüyor ve sırayla okunsaydı
     arkadan gelen çizim ön görünüme düşerdi.

     `dataUrl` YEDEĞİ OKUNMAK ZORUNDA. Koşucu kareyi kovaya yükleyemezse
     (5xx, zaman aşımı, dolu kova) `url` boş kalıyor ve baytlar `dataUrl`
     olarak geliyor — kare üretilmiş ve parası ödenmiş demektir. Kolaj
     aracında yalnız `url` okunuyordu ve o kareler sessizce atılıyordu. */
  const teknikUygula = useCallback((gelenler: { eksen: string; url?: string; dataUrl?: string }[]) => {
    const gelen = new Map<string, string>();
    for (const kare of gelenler) {
      const adres = kare.url ?? kare.dataUrl;
      if (adres) gelen.set(kare.eksen, adres);
    }
    const on = gelen.get(TEKNIK_YUVA.front) ?? null;
    const arka = gelen.get(TEKNIK_YUVA.back) ?? null;
    if (!on && !arka) {
      setToast("Teknik çizim gelmedi. Tekrar deneyin.");
      return;
    }

    setTeknikCizim((c) => ({ front: on ?? c.front, back: arka ?? c.back }));
    /* Gelen çizim doğrudan altlığa oturuyor: üretmenin bütün sebebi bu.
       Yalnız gelen yuva değişiyor — biri düştüyse öteki görünümün altlığı
       yerinde kalsın. */
    setAltliklar((a) => ({
      front: on ? { src: on, tur: "teknik" } : a.front,
      back: arka ? { src: arka, tur: "teknik" } : a.back,
    }));
    /* Kutu çizimin çerçevesine dönüyor: kullanıcının fotoğraf için
       ayarladığı ölçek ve kaydırma başka bir kadraja göreydi, çizim ise
       giysinin oturduğu alana gelmek üzere üretildi (bkz. TEKNIK_ALAN). */
    setAltlikKutu(TEKNIK_ALAN);
    setToast(
      on && arka
        ? "Teknik çizim geldi — ön ve arka altlığa kondu."
        : on
          ? "Yalnız ön teknik çizim geldi; arka eski altlığında kaldı."
          : "Yalnız arka teknik çizim geldi; ön eski altlığında kaldı.",
    );
  }, []);

  useEffect(() => {
    if (!teknikIsId) return;
    let iptal = false;
    const basladi = Date.now();

    const tur = async () => {
      if (iptal) return;
      try {
        const r = await fetch(`/api/jobs/${teknikIsId}`, { cache: "no-store" });
        const j = await r.json();
        if (iptal) return;

        if (j.status === "completed") {
          teknikUygula(j.kareler ?? []);
          setTeknikCalisiyor(false);
          setTeknikIsId(null);
          return;
        }
        if (j.status === "failed") {
          setToast(j.error ?? "Teknik çizim tamamlanamadı.");
          setTeknikCalisiyor(false);
          setTeknikIsId(null);
          return;
        }
        setTeknikAdim(typeof j.step === "string" ? j.step : null);
      } catch {
        /* Ağ tökezlemesi işi bitirmez; sonraki turda tekrar denenir. */
      }
      if (Date.now() - basladi > YOKLAMA_TAVANI_MS) {
        if (!iptal) {
          setToast("Teknik çizim beklenenden uzun sürdü.");
          setTeknikCalisiyor(false);
          setTeknikIsId(null);
        }
        return;
      }
      setTimeout(tur, YOKLAMA_MS);
    };

    void tur();
    return () => {
      iptal = true;
    };
  }, [teknikIsId, teknikUygula]);

  /* ---------- dışa aktar ---------- */
  function exportSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.querySelectorAll("[data-ui]").forEach((el) => el.remove());
    const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teknik-cizim-${view}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    /* DIŞA AKTARMA SINIRI. Dosya SVG METNİ; görseller bağlantı olarak
       kalıyor. Kartela kumaşları mutlak adres (unsplash) taşıdığı için
       diskten açılan dosyada da çözülüyor, üretilen kare ise göreceli
       (`/api/kare/...`) ve BOŞ kalır. Altlık `data-ui` ile zaten düşüyor;
       dolguyu da yasaklamak yerine indirme anında söylüyoruz — sessizce
       bozuk dosya vermek daha kötü. */
    const tohumlu = cur.shapes.some((s) => s.visible && s.fabricId === TOHUM_KUMAS);
    setToast(tohumlu ? "SVG indirildi — üretilen kumaş dolgusu dosyada boş kalır" : "SVG indirildi");
  }

  /* ---------- türetilen ---------- */
  const cursor = panning
    ? drag?.kind === "pan" ? "grabbing" : "grab"
    : tool === "select" ? (drag?.kind === "move" ? "grabbing" : "default") : "crosshair";
  const nearFirst = tool === "pen" && draft.length >= 3 && hover && dist(hover, draft[0]) < 8 / vp.zoom;
  const selBox = selected ? bbox(selected.points) : null;
  const toolMeta = TOOLS.find((t) => t.id === tool) ?? TOOLS[0];
  const pct = Math.round(vp.zoom * 100);

  /* ---------- tohum ---------- */
  /* Üretilen çizimler şeridin SONUNA ekleniyor: tohum kareleri
     kullanıcının ana sayfadan tanıdığı sırada kalsın, yeni gelen de
     bulunabilsin. Şeritte durmaları şart — altlığı fotoğrafa çevirip
     çizime geri dönmenin başka yolu olmazdı. */
  const referanslar: Referans[] = [
    ...tohumKareleri(tohum),
    ...(["front", "back"] as const).flatMap((g) => {
      const src = teknikCizim[g];
      return src ? [{ src, tur: "teknik" as const, etiket: TEKNIK_ETIKET[g] }] : [];
    }),
  ];
  const tohumKumas = tohum?.turetilmis.kumas ?? null;
  /* Kartela + (varsa) üretilen kare. Üretilen SONA konuyor: kartelanın
     sırası kullanıcının alıştığı sıra. Alanlar tek tek birleştiriliyor,
     çünkü kartelaya ileride boş kalabilen bir alan eklenebilir ve ipucunda
     "undefined" görünmemeli. */
  const kumasSecenekleri: { id: string; ad: string; gorsel: string; ipucu: string }[] = [
    ...fabrics.map((f) => ({
      id: f.id,
      ad: f.name,
      gorsel: f.image,
      ipucu: [f.name, f.composition].filter(Boolean).join(" · "),
    })),
    ...(tohumKumas
      ? [{
          id: TOHUM_KUMAS,
          ad: "Üretilen",
          gorsel: tohumKumas,
          ipucu: "Ana sayfada üretilen kumaş karesi — gramaj, en, fiyat gibi kartela verisi yok",
        }]
      : []),
  ];
  /* Başlık tohumdan; tohum yoksa örnek belgenin adı kalıyor. "Kaydedildi
     10:52" KALDIRILDI — kaydetme diye bir şey yok, sabit bir saat yazmak
     kullanıcıya olmayan bir güvence veriyordu. */
  const baslik = tohum?.brief.trim() || "Keten bluz";

  /* Panelin hangi görünümün altlığını düzenlediği. Detayda altlık
     çizilmiyor ama panel açık kalıyor; seçim ÖNE uygulanıyor ki tıklama
     sessizce kaybolmasın (panel bunu ayrıca yazıyor). */
  const altlikGorunum: AltlikGorunum = view === "back" ? "back" : "front";
  const aktifAltlik = altliklar[altlikGorunum];
  const gorunumAdi = VIEWS.find((v) => v.id === altlikGorunum)?.label ?? "Ön";
  const altligiSec = (secim: Altlik | null) => {
    setAltliklar((a) => ({ ...a, [altlikGorunum]: secim }));
    /* TÜR değişince kutu o türün çerçevesine dönüyor — fotoğraf çerçevesi
       kroki'nin tamamı, teknik çizim çerçevesi giysinin alanı; ikisi aynı
       kutuya sığmıyor. Aynı tür içinde geçişte kullanıcının ayarı
       korunuyor: iki fotoğraf arasında gidip gelmek ayarı silmemeli. */
    if (secim && secim.tur !== aktifAltlik?.tur) setAltlikKutu(varsayilanKutu(secim));
  };

  const teknikDugmesi = teknikCalisiyor
    ? teknikAdim?.startsWith("model-cagriliyor")
      ? "Çiziliyor…"
      : "Sıraya alındı…"
    : `Teknik çizim üret · ${TEKNIK_EKSENLERI.length} kare`;

  /* Altlık kutusu panelden ayarlanıyor; sürgüler kutunun KENDİSİNDEN
     türüyor, ayrı bir ölçek/konum durumu tutulmuyor ki ikisi ayrışmasın.

     Sıfır noktası AKTİF ALTLIĞIN çerçevesi: %100 ve 0 cm "geldiği gibi"
     demek. Ölçüyü hep kroki alanına bağlamak, teknik çizim seçiliyken
     dokunulmamış bir kutuya "%149" dedirtirdi. */
  const temelKutu = varsayilanKutu(aktifAltlik);
  const altlikOlcek = Math.round((altlikKutu.w / temelKutu.w) * 100);
  const kutuMerkez = { x: altlikKutu.x + altlikKutu.w / 2, y: altlikKutu.y + altlikKutu.h / 2 };
  const temelMerkez = { x: temelKutu.x + temelKutu.w / 2, y: temelKutu.y + temelKutu.h / 2 };
  const altligiOlcekle = (yuzde: number) => {
    const w = (temelKutu.w * yuzde) / 100;
    const h = (temelKutu.h * yuzde) / 100;
    // merkez sabit kalıyor: ölçek değişince altlık figürün altından kaçmasın
    setAltlikKutu((k) => ({ x: k.x + k.w / 2 - w / 2, y: k.y + k.h / 2 - h / 2, w, h }));
  };
  const altligiTasi = (eksen: "x" | "y", sapma: number) =>
    setAltlikKutu((k) =>
      eksen === "x"
        ? { ...k, x: temelMerkez.x + sapma - k.w / 2 }
        : { ...k, y: temelMerkez.y + sapma - k.h / 2 },
    );

  return (
    <div ref={wrapRef} className="tuval relative flex-1 select-none overflow-hidden bg-paper min-h-[calc(100svh-4rem-3.25rem)] lg:min-h-[calc(100svh-5rem)]">
      {/* ---------------- TUVAL ---------------- */}
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor }}
        viewBox={`${vp.x} ${vp.y} ${size.w / vp.zoom} ${size.h / vp.zoom}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onDoubleClick={() => {
          if (tool === "pen" && draft.length >= 2) finishDraft(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropFabric}
        role="application"
        aria-label="Teknik çizim tuvali"
      >
        <defs>
          <pattern id="grid-minor" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke={INK} strokeOpacity="0.06" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-major" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="url(#grid-minor)" />
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={INK} strokeOpacity="0.13" strokeWidth="0.6" />
          </pattern>
          {fabrics.map((f) => (
            <pattern key={f.id} id={`fab-${f.id}`} width="96" height="96" patternUnits="userSpaceOnUse">
              <image href={f.image} width="96" height="96" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          ))}
          {/* Üretilen kumaş karesi de bir desen: kartela kumaşlarıyla aynı
              yoldan (tıkla ya da sürükle-bırak) uygulanıyor. */}
          {tohumKumas && (
            <pattern id={`fab-${TOHUM_KUMAS}`} width="96" height="96" patternUnits="userSpaceOnUse">
              <image href={tohumKumas} width="96" height="96" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          )}
        </defs>

        {/* sonsuz zemin */}
        <rect x="-20000" y="-20000" width="40000" height="40000" fill="url(#grid-major)" />
        {/* eksenler */}
        <g stroke={INK} strokeOpacity="0.18" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <line x1="-20000" y1="0" x2="20000" y2="0" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="-20000" x2="0" y2="20000" vectorEffect="non-scaling-stroke" />
        </g>

        {/* Altlık — sıralama: zemin → ALTLIK → kroki → parçalar. Yalnız ön
            ve arka görünümde; detay görünümünde manşet ve cep var, figür
            yok, altlık orada anlamsız kalır.

            `pointer-events-none` ZORUNLU: tuvalin bütün vuruş testi
            SVG'nin kendi işaretçi olaylarından geçiyor, araya olay alan
            bir görsel girerse seçim, kalem ve makas SESSİZCE ölür.

            `data-ui` dışa aktarmada düşürüyor (exportSvg [data-ui] taşıyan
            her düğümü siliyor): altlık referans, çizimin parçası değil —
            ayrıca kare adresi göreceli olduğu için diskteki dosyada zaten
            çözülemezdi.

            YERLEŞİM TÜRE GÖRE. Fotoğraf `slice` ile yerleşiyor: kutu ne
            ise o görünüyor, kare kırpılıyor — kutu sürgüleri dürüst kalsın
            diye, kareden daha çoğunu görmek için kutuyu genişletmek
            yetiyor. Teknik çizim ise `meet` ile SIĞARAK yerleşiyor: kutu
            kroki gibi dar (180×668) ve çizim 3:4; `slice` olsaydı çizimin
            kolları kırpılırdı, yani üstünden çizilecek şeyin ta kendisi
            kesilirdi. Fotoğrafta kırpma zararsız, çizimde değil. */}
        {view !== "detail" && aktifAltlik && (
          <image
            data-ui
            href={aktifAltlik.src}
            x={altlikKutu.x}
            y={altlikKutu.y}
            width={altlikKutu.w}
            height={altlikKutu.h}
            opacity={altlikOpaklik}
            preserveAspectRatio={aktifAltlik.tur === "teknik" ? "xMidYMid meet" : "xMidYMid slice"}
            className="pointer-events-none"
          />
        )}

        {view !== "detail" && <Croquis back={view === "back"} />}

        {/* parçalar */}
        {cur.shapes.map((s) => {
          if (!s.visible) return null;
          const d = s.smooth ? smoothPath(s.points, s.closed) : polyPath(s.points, s.closed);
          const sampled = s.stitch === "zigzag" || s.stitch === "surfile" ? samplePath(s.points, s.closed, s.smooth, 4) : [];
          const isSel = s.id === selectedId;
          return (
            <g key={s.id}>
              <path
                d={d}
                fill={s.closed ? (s.fabricId ? `url(#fab-${s.fabricId})` : "rgba(26,26,26,0.035)") : "none"}
                fillOpacity={s.fabricId ? 0.95 : 1}
                stroke={INK}
                strokeOpacity={s.stitch === "zigzag" ? 0.45 : 1}
                strokeWidth="1"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {s.stitch === "ust" && s.closed && (
                <path d={s.smooth ? smoothPath(inset(s.points, 4), true) : polyPath(inset(s.points, 4), true)} fill="none" stroke={INK} strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
              )}
              {s.stitch === "zigzag" && <path d={zigzag(sampled, s.closed, 2)} fill="none" stroke={INK} strokeWidth="1" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
              {s.stitch === "surfile" && <path d={overlockTicks(sampled, s.closed, 3.5)} fill="none" stroke={INK} strokeWidth="1" vectorEffect="non-scaling-stroke" />}
              {isSel && (
                <g data-ui>
                  <path d={d} fill="none" stroke={SELECT} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  {s.points.map((q, i) => (
                    <rect
                      key={i}
                      x={q.x - 3 / vp.zoom}
                      y={q.y - 3 / vp.zoom}
                      width={6 / vp.zoom}
                      height={6 / vp.zoom}
                      fill="#fff"
                      stroke={SELECT}
                      strokeWidth={1 / vp.zoom}
                      style={{ cursor: "move" }}
                      onPointerDown={(e) => onAnchorDown(e, s.id, i)}
                    />
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* ölçüler */}
        {cur.measures.map((m) => (
          <MeasureMark key={m.id} a={m.a} b={m.b} zoom={vp.zoom} selected={m.id === selectedId} onSelect={() => setSelectedId(m.id)} />
        ))}

        {/* geçici ölçü / kesim */}
        {drag && (drag.kind === "measure" || drag.kind === "cut") && temp && (
          <g data-ui>
            <line x1={drag.a.x} y1={drag.a.y} x2={temp.x} y2={temp.y} stroke={SELECT} strokeWidth="1" strokeDasharray={drag.kind === "cut" ? "5 4" : undefined} vectorEffect="non-scaling-stroke" />
            {drag.kind === "measure" && <MeasureLabel a={drag.a} b={temp} zoom={vp.zoom} />}
          </g>
        )}

        {/* kalem taslağı */}
        {draft.length > 0 && (
          <g data-ui>
            <path d={smooth ? smoothPath(draft, false) : polyPath(draft, false)} fill="none" stroke={INK} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {hover && <line x1={draft[draft.length - 1].x} y1={draft[draft.length - 1].y} x2={hover.x} y2={hover.y} stroke={SELECT} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
            {draft.map((q, i) => (
              <rect key={i} x={q.x - 2.5 / vp.zoom} y={q.y - 2.5 / vp.zoom} width={5 / vp.zoom} height={5 / vp.zoom} fill="#fff" stroke={INK} strokeWidth={1 / vp.zoom} />
            ))}
            {nearFirst && <circle cx={draft[0].x} cy={draft[0].y} r={7 / vp.zoom} fill="none" stroke={SELECT} strokeWidth={1 / vp.zoom} />}
          </g>
        )}
      </svg>

      {/* ---------------- ÜST: başlık ve araç çubuğu ---------------- */}
      <div className="pointer-events-none absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-3">
        <Glass className="pointer-events-auto flex items-center gap-0.5 p-1">
          {TOOLS.map((t) => (
            <ToolButton key={t.id} label={`${t.label} · ${t.key}`} active={tool === t.id} onClick={() => { setTool(t.id); setDraft([]); }}>
              <ToolIcon id={t.id} />
            </ToolButton>
          ))}
          <Sep />
          <div className="relative">
            <button
              type="button"
              onClick={() => setStitchOpen((o) => !o)}
              aria-expanded={stitchOpen}
              className="flex h-9 items-center gap-2 px-3 eyebrow text-ink transition-colors hover:bg-ink/[0.04]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <path d="M3 12h3M9 12h3M15 12h3" />
                <path d="M3 16l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2" opacity="0.5" />
              </svg>
              {STITCHES.find((s) => s.id === (selected?.stitch ?? stitch))?.label}
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-ash" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 6l5 5 5-5" /></svg>
            </button>
            {stitchOpen && (
              <Glass className="absolute left-0 top-full mt-1.5 flex w-44 flex-col p-1">
                {STITCHES.map((s) => {
                  const active = (selected?.stitch ?? stitch) === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStitch(s.id);
                        if (selected) updateShape(selected.id, { stitch: s.id });
                        setStitchOpen(false);
                      }}
                      className={cn("flex items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-ink/[0.04]", active ? "text-ink" : "text-smoke")}
                    >
                      {s.label}
                      <StitchSample id={s.id} />
                    </button>
                  );
                })}
              </Glass>
            )}
          </div>
          <Sep />
          <ToolButton
            label={smooth ? "Eğri · açık" : "Eğri · kapalı"}
            active={smooth}
            onClick={() => {
              setSmooth((v) => !v);
              if (selected) updateShape(selected.id, { smooth: !selected.smooth });
            }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M4 18c7 0 6-12 16-12" /><circle cx="4" cy="18" r="1.2" /><circle cx="20" cy="6" r="1.2" /></svg>
          </ToolButton>
          <Sep />
          <ToolButton label="Geri al · Ctrl+Z" onClick={undoLast} disabled={undo.length === 0}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7L4 11l4 4" /><path d="M4 11h10a5 5 0 0 1 0 10h-3" /></svg>
          </ToolButton>
          <ToolButton label="Sil · Delete" onClick={removeSelected} disabled={!selectedId}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" /></svg>
          </ToolButton>
        </Glass>

        <Glass className="pointer-events-auto flex items-center gap-4 px-4 py-2.5">
          <span className="eyebrow max-w-[42ch] truncate text-ink" title={baslik}>
            Teknik çizim · {baslik}
          </span>
          <span className="eyebrow shrink-0 text-ash">Taslak</span>
        </Glass>
      </div>

      {/* ---------------- SAĞ PANEL ---------------- */}
      <aside
        className={cn(
          "absolute bottom-20 right-4 top-20 flex flex-col transition-[width,opacity] duration-500 ease-[var(--ease-out-expo)]",
          panelOpen ? "w-72" : "w-0 opacity-0 pointer-events-none",
        )}
        aria-hidden={!panelOpen}
      >
        <Glass className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <span className="eyebrow">Kumaş ve katmanlar</span>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Paneli kapat" className="flex h-7 w-7 items-center justify-center text-ash hover:text-ink">
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1"><path d="M6 3l5 5-5 5" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
            {/* Referans — ana sayfada üretilen kareler ve burada üretilen
                teknik çizimler.
                Tohum etiketleri kendi eksen adlarından geliyor (doğa,
                sanat, doku, mekân, moodboard, kumaş, marka, giysi
                siluet). Yalnız siluet giysi; ötekiler ne "giysi" ne
                "manken" diyor çünkü değiller. Şerit GÖRÜNÜM BAŞINA
                seçiyor: tıklama açık olan görünümün altlığını değiştirir. */}
            {referanslar.length > 0 && (
              <section className="mb-7">
                <div className="flex items-baseline justify-between">
                  <p className="eyebrow text-ash">Referans</p>
                  <span className="eyebrow text-ash">{gorunumAdi} görünümü</span>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-fog">
                  Seçilen kare kroki&apos;nin arkasına altlık olur, üstünden çizersiniz. Teknik
                  çizim tam bunun için üretilmiş çizgi resimdir: düz yatık, simetrik, gölgesiz —
                  dikiş, pens ve kapama hatları okunur. Fotoğraf kareleri yedek; içlerinde
                  perspektif, gölge ve beden var.
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {referanslar.map((r) => {
                    const aktif = r.src === aktifAltlik?.src;
                    return (
                      <button
                        key={r.src}
                        type="button"
                        onClick={() => altligiSec(aktif ? null : { src: r.src, tur: r.tur })}
                        title={
                          aktif
                            ? `${r.etiket} · ${gorunumAdi} altlığından kaldır`
                            : `${r.etiket} · ${gorunumAdi} altlığına koy`
                        }
                        aria-label={r.etiket}
                        aria-pressed={aktif}
                        className="group flex flex-col items-center gap-1.5"
                      >
                        <span
                          className={cn(
                            "block h-11 w-full border border-ink/10 bg-cover bg-center transition-[outline-color,scale] duration-300 outline outline-1 outline-offset-2",
                            aktif ? "outline-[#6B7C93]" : "outline-transparent group-hover:scale-105",
                          )}
                          style={{ backgroundImage: `url(${r.src})` }}
                        />
                        <span className="w-full truncate text-center text-[9px] leading-3 text-ash">{r.etiket}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Detayda tıklama sessizce kaybolmasın: seçim öne
                    uygulanıyor ve bunu yazmak, hiçbir şey olmamasından iyi. */}
                {view === "detail" && (
                  <p className="mt-3 text-[11px] leading-4 text-fog">
                    Detay görünümünde altlık çizilmiyor — figür yok. Seçim ön görünüme uygulanır.
                  </p>
                )}

                {/* Maliyet DÜĞMENİN KENDİSİNDE: "· 2 kare". Kullanıcı basmadan
                    önce ne harcadığını bilmeli; altındaki satır bunun iki ayrı
                    üretim demek olduğunu açıyor. */}
                <div className="mt-4 border-t border-mist pt-4">
                  <button
                    type="button"
                    onClick={teknikUret}
                    disabled={teknikCalisiyor || !siluetKare}
                    className="w-full border border-ink/15 px-3 py-2 eyebrow text-ink transition-colors duration-300 hover:bg-ink/[0.04] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {teknikDugmesi}
                  </button>
                  <p className="mt-2 text-[11px] leading-4 text-fog">
                    {siluetKare
                      ? "Giysi siluetinden ön ve arka çizgi çizimi üretilir; iki kare, iki üretim demek. Gelenler doğrudan altlığa oturur."
                      : "Teknik çizim giysi siluetinden üretiliyor; akışta o kare yok. Önce ana sayfada üretin."}
                  </p>
                </div>

                {aktifAltlik ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="eyebrow text-ash">{gorunumAdi} altlığı</p>
                      <span className="eyebrow text-ash">
                        {aktifAltlik.tur === "teknik" ? "Teknik çizim" : "Fotoğraf"}
                      </span>
                    </div>
                    <p className="text-[11px] leading-4 text-fog">
                      Opaklık, ölçek ve konum iki görünümde ortak.
                    </p>
                    <Kaydirac
                      id="altlik-opaklik"
                      etiket="Opaklık"
                      deger={Math.round(altlikOpaklik * 100)}
                      min={5}
                      max={100}
                      step={5}
                      bicim={(v) => `%${v}`}
                      onChange={(v) => setAltlikOpaklik(v / 100)}
                    />
                    <Kaydirac
                      id="altlik-olcek"
                      etiket="Ölçek"
                      deger={altlikOlcek}
                      min={40}
                      max={250}
                      step={5}
                      bicim={(v) => `%${v}`}
                      onChange={altligiOlcekle}
                    />
                    <Kaydirac
                      id="altlik-yatay"
                      etiket="Yatay"
                      deger={Math.round(kutuMerkez.x - temelMerkez.x)}
                      min={-300}
                      max={300}
                      step={4}
                      bicim={(v) => `${fmtCm(v)} cm`}
                      onChange={(v) => altligiTasi("x", v)}
                    />
                    <Kaydirac
                      id="altlik-dikey"
                      etiket="Dikey"
                      deger={Math.round(kutuMerkez.y - temelMerkez.y)}
                      min={-300}
                      max={300}
                      step={4}
                      bicim={(v) => `${fmtCm(v)} cm`}
                      onChange={(v) => altligiTasi("y", v)}
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <button type="button" onClick={() => setAltlikKutu(temelKutu)} className="eyebrow u-line text-ash hover:text-ink">
                        {aktifAltlik.tur === "teknik" ? "Giysi alanına sıfırla" : "Kroki boyuna sıfırla"}
                      </button>
                      <button type="button" onClick={() => altligiSec(null)} className="eyebrow u-line text-ash hover:text-ink">
                        Altlığı kaldır
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-[11px] leading-4 text-fog">
                    {gorunumAdi} görünümünde altlık kapalı — bir kareye tıklayın.
                  </p>
                )}
              </section>
            )}

            {/* Seçim */}
            <p className="eyebrow text-ash">Seçim</p>
            {selected ? (
              <div className="mt-3 space-y-2 text-[12px] leading-4">
                <input
                  value={selected.name}
                  onChange={(e) => updateShape(selected.id, { name: e.target.value }, false)}
                  aria-label="Parça adı"
                  className="w-full border-b border-mist bg-transparent py-1.5 font-display text-lg leading-6 outline-none focus:border-ink"
                />
                <Row k="Boyut">{selBox ? `${fmtCm(selBox.w)} × ${fmtCm(selBox.h)} cm` : "—"}</Row>
                <Row k="Nokta">{selected.points.length}{selected.closed ? " · kapalı" : " · açık"}</Row>
                <Row k="Dikiş">{STITCHES.find((s) => s.id === selected.stitch)?.label}</Row>
                <Row k="Kumaş">
                  {kumasAdi(selected.fabricId)}
                  {selected.fabricId && (
                    <button type="button" onClick={() => applyFabric(selected.id, null)} className="ml-2 eyebrow text-ash u-line hover:text-ink">
                      Kaldır
                    </button>
                  )}
                </Row>
              </div>
            ) : (
              <p className="mt-3 text-[11px] leading-4 text-ash">Bir parça seçin; kumaşı tıklayarak ya da sürükleyip bırakarak uygulayın.</p>
            )}

            {/* Kumaş */}
            <div className="mt-7 flex items-baseline justify-between">
              <p className="eyebrow text-ash">Kumaş</p>
              <span className="eyebrow text-ash">{tohumKumas ? "Kartela · üretilen" : "Kumaş sayfasından"}</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {kumasSecenekleri.map((k) => {
                const active = selected?.fabricId === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/fabric", k.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => {
                      if (selected && selected.closed) applyFabric(selected.id, k.id);
                      else setToast("Önce kapalı bir parça seçin ya da kumaşı parçanın üstüne sürükleyin");
                    }}
                    title={k.ipucu}
                    aria-label={k.ad}
                    aria-pressed={active}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "block h-9 w-9 rounded-full border border-ink/10 bg-cover bg-center transition-[outline-color,scale] duration-300 outline outline-1 outline-offset-2",
                        active ? "outline-[#6B7C93]" : "outline-transparent group-hover:scale-105",
                      )}
                      style={{ backgroundImage: `url(${k.gorsel})` }}
                    />
                    <span className="w-full truncate text-center text-[9px] leading-3 text-ash">{k.ad}</span>
                  </button>
                );
              })}
            </div>

            {/* Katmanlar */}
            <div className="mt-7 flex items-baseline justify-between">
              <p className="eyebrow text-ash">Katmanlar · {VIEWS.find((v) => v.id === view)?.label}</p>
              <span className="eyebrow tabular-nums text-ash">{cur.shapes.length}</span>
            </div>
            <ul className="mt-3 divide-y divide-mist border-y border-mist">
              {[...cur.shapes].reverse().map((s) => {
                const isSel = s.id === selectedId;
                return (
                  <li key={s.id} className={cn("flex items-center gap-2 py-2", !s.visible && "opacity-50")}>
                    <button type="button" onClick={() => setSelectedId(s.id)} className={cn("flex min-w-0 flex-1 items-center gap-2.5 text-left", isSel ? "text-ink" : "text-smoke hover:text-ink")}>
                      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0", isSel ? "bg-[#6B7C93]" : "border border-ink/30")} />
                      <span className="truncate text-[12.5px]">{s.name}</span>
                      <span className="ml-auto shrink-0 eyebrow text-ash">{STITCHES.find((x) => x.id === s.stitch)?.label.split(" ")[0]}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={s.visible ? `${s.name} gizle` : `${s.name} göster`}
                      onClick={() => updateShape(s.id, { visible: !s.visible }, false)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center text-ash hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                        {s.visible ? <circle cx="12" cy="12" r="2.5" /> : <path d="M4 4l16 16" />}
                      </svg>
                    </button>
                  </li>
                );
              })}
              {cur.shapes.length === 0 && <li className="py-3 text-[11px] text-ash">Bu görünümde parça yok — kalemle çizin.</li>}
            </ul>
          </div>
          <div className="border-t border-ink/10 px-4 py-3">
            <button type="button" onClick={exportSvg} className="eyebrow u-line">
              SVG indir
            </button>
          </div>
        </Glass>
      </aside>
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute right-4 top-20 flex h-9 items-center gap-2 border border-ink/10 bg-paper/70 px-3 eyebrow backdrop-blur-md transition-colors hover:bg-paper"
          aria-label="Paneli aç"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1"><path d="M10 3L5 8l5 5" /></svg>
          Kumaş · Katmanlar
        </button>
      )}

      {/* ---------------- ALT: görünümler, durum, zoom ---------------- */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3">
        <Glass className="pointer-events-auto flex items-center gap-6 px-4 py-2.5" role="tablist" aria-label="Görünümler">
          {VIEWS.map((v) => {
            const active = v.id === view;
            return (
              <button
                key={v.id}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setView(v.id);
                  setSelectedId(null);
                  setDraft([]);
                  setUserView(null);
                }}
                data-active={active}
                className={cn("eyebrow u-line transition-colors", active ? "text-ink" : "text-ash hover:text-ink")}
              >
                {v.label}
              </button>
            );
          })}
        </Glass>

        <Glass className="pointer-events-auto hidden items-center gap-4 px-4 py-2.5 md:flex">
          <span className="eyebrow tabular-nums text-ash">
            {hover ? `x ${fmtCm(hover.x)} · y ${fmtCm(hover.y)} cm` : "—"}
          </span>
          <span className="h-3 w-px bg-ink/10" />
          <span className="eyebrow text-ash">{toolMeta.label}: {toolMeta.hint}</span>
        </Glass>

        <Glass className="pointer-events-auto flex items-center gap-1 p-1">
          <ToolButton label="Uzaklaştır · −" onClick={() => zoomBy(1 / 1.2)}>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 8h10" /></svg>
          </ToolButton>
          <span className="w-12 text-center eyebrow tabular-nums">{pct}%</span>
          <ToolButton label="Yakınlaştır · +" onClick={() => zoomBy(1.2)}>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 8h10M8 3v10" /></svg>
          </ToolButton>
          <Sep />
          <button type="button" onClick={() => setUserView(null)} className="h-9 px-3 eyebrow text-ink transition-colors hover:bg-ink/[0.04]">
            Sığdır
          </button>
        </Glass>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function Glass({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border border-ink/10 bg-paper/75 backdrop-blur-md", className)} {...rest}>
      {children}
    </div>
  );
}

function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-ink/10" />;
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center transition-colors duration-300 disabled:opacity-30",
        active ? "bg-ink text-bone" : "text-[#1a1a1a]/75 hover:bg-ink/[0.04] hover:text-ink",
      )}
    >
      {children}
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1.5 eyebrow text-bone opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}

function ToolIcon({ id }: { id: Tool }) {
  const c = { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "select":
      return <svg {...c}><path d="M6 4l11 8.5-5 .8 3 6-2 1-3-6-4 3.7z" /></svg>;
    case "pen":
      return <svg {...c}><path d="M4 20l4-1 10-10-3-3L5 16z" /><path d="M13 8l3 3" /><path d="M4 20l1-4" /></svg>;
    case "measure":
      return <svg {...c}><rect x="3" y="9" width="18" height="6" /><path d="M7 9v2.5M11 9v3.5M15 9v2.5M19 9v3.5" /></svg>;
    case "cut":
      return <svg {...c}><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="6.5" cy="17.5" r="2.5" /><path d="M8.5 8.2L20 17M8.5 15.8L20 7" /></svg>;
    case "hand":
      return <svg {...c}><path d="M8 12.5V6.5a1.5 1.5 0 0 1 3 0v5M11 11.5V4.5a1.5 1.5 0 0 1 3 0v7M14 11.5v-5a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-12 0v-3.5a1.5 1.5 0 0 1 3 0" /></svg>;
  }
}

function StitchSample({ id }: { id: Stitch }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1 };
  return (
    <svg viewBox="0 0 40 10" className="h-2.5 w-10 text-ink/70" aria-hidden>
      {id === "duz" && <path d="M0 5h40" {...common} />}
      {id === "ust" && (<><path d="M0 3h40" {...common} /><path d="M0 7h40" {...common} strokeDasharray="3 2" /></>)}
      {id === "zigzag" && <path d="M0 8l4-6 4 6 4-6 4 6 4-6 4 6 4-6 4 6 4-6 4 6" {...common} />}
      {id === "surfile" && (<><path d="M0 5h40" {...common} /><path d="M2 5v4M6 5v4M10 5v4M14 5v4M18 5v4M22 5v4M26 5v4M30 5v4M34 5v4M38 5v4" {...common} /></>)}
    </svg>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-mist pb-1.5 last:border-b-0">
      <span className="eyebrow text-ash">{k}</span>
      <span className="text-right tabular-nums text-smoke">{children}</span>
    </div>
  );
}

/** Sürgü — dolu kısmın yüzdesi `--p` ile veriliyor (bkz. .slider). */
function Kaydirac({
  id,
  etiket,
  deger,
  min,
  max,
  step = 1,
  bicim,
  onChange,
}: {
  id: string;
  etiket: string;
  deger: number;
  min: number;
  max: number;
  step?: number;
  bicim: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const oran = ((deger - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="eyebrow text-ash">
          {etiket}
        </label>
        <span className="text-[12px] tabular-nums text-fog">{bicim(deger)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={deger}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={bicim(deger)}
        className="slider mt-1"
        style={{ "--p": `${oran}%` } as CSSProperties}
      />
    </div>
  );
}

function MeasureLabel({ a, b, zoom }: { a: Pt; b: Pt; zoom: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const fs = 10 / zoom;
  const text = `${fmtCm(dist(a, b))} cm`;
  const w = (text.length * 6.2) / zoom;
  return (
    <g>
      <rect x={mx - w / 2 - 4 / zoom} y={my - fs - 6 / zoom} width={w + 8 / zoom} height={fs + 6 / zoom} fill="#fff" stroke={SELECT} strokeWidth={1 / zoom} />
      <text x={mx} y={my - 4 / zoom} textAnchor="middle" fontSize={fs} fontFamily="var(--font-sans)" fill={INK} style={{ letterSpacing: 0.5 / zoom }}>
        {text}
      </text>
    </g>
  );
}

function MeasureMark({ a, b, zoom, selected, onSelect }: { a: Pt; b: Pt; zoom: number; selected: boolean; onSelect: () => void }) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (5 / zoom), ny = (dx / len) * (5 / zoom);
  const stroke = selected ? SELECT : INK;
  return (
    <g onPointerDown={(e) => { e.stopPropagation(); onSelect(); }} style={{ cursor: "pointer" }}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1={a.x - nx} y1={a.y - ny} x2={a.x + nx} y2={a.y + ny} stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1={b.x - nx} y1={b.y - ny} x2={b.x + nx} y2={b.y + ny} stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <MeasureLabel a={a} b={b} zoom={zoom} />
    </g>
  );
}
