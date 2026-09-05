/* ------------------------------------------------------------------
   Teknik çizim — 2B geometri yardımcıları (tuval birimi: 4 birim = 1 cm)
   ------------------------------------------------------------------ */
export type Pt = { x: number; y: number };

export const UNITS_PER_CM = 4;
export const toCm = (units: number) => units / UNITS_PER_CM;

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function centroid(pts: Pt[]): Pt {
  if (pts.length === 0) return { x: 0, y: 0 };
  const s = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / pts.length, y: s.y / pts.length };
}

export function bbox(pts: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/* ------------------------------------------------------------------
   EĞRİ — köşeye saygılı centripetal Catmull-Rom

   Kalem, tıklanan noktalardan GEÇEN bir eğri çiziyor. Eskiden bu düz
   (uniform) Catmull-Rom idi ve KÖŞE DİYE BİR ŞEY TANIMIYORDU: dört
   noktayla çizilen bir dikdörtgen, noktaların ellişer birim DIŞINA taşan
   bir balona dönüşüyordu. Ölçüldü: 300×240 birimlik dikdörtgende teğet
   ucu x=350'ye düşüyor. Kullanıcı çizdiği şeyi geri alamıyordu.

   İKİ AYAR VAR ve ikisi AYRI şeyi düzeltiyor — biri ötekinin yerine
   geçmiyor:

   1. ALFA (centripetal parametreleme). Noktalar eşit aralıklı değilse
      düz Catmull-Rom ilmek ve sivri uç üretir; aralıkları kiriş
      uzunluğunun kareköküyle ölçmek bunu matematiksel olarak imkânsız
      kılıyor. Elle tıklanan noktalar hiçbir zaman eşit aralıklı
      olmadığı için burada kural.

   2. KÖŞE SÖNÜMÜ. Alfa tek başına dikdörtgen sorununu ÇÖZMÜYOR — bu
      ölçüldü, kare için centripetal ile uniform aynı eğriyi veriyor.
      Sebebi şu: dört köşeden geçmek zorunda olan C1-sürekli bir eğri
      dışa doğru bombelenmek ZORUNDA, hiçbir gerilim değeri bunu
      kaldırmıyor. Tek çıkış eğriyi köşede bırakmak: dönüş açısı
      büyüdükçe teğet kısalıyor, KOSE_DUZ_ACI'de sıfırlanıyor ve kenar
      düz bir çizgiye dönüyor.

   Eşikler tek cümleye oturuyor: DİK AÇI VE ÜSTÜ HER ZAMAN KÖŞEDİR,
   60°'nin altı her zaman eğridir, arası oransal. İlk denemede üst eşik
   110°'ydi ve YETMEDİ — tuvalde ölçüldü: dik açıda ağırlık 0,50 kalıyor,
   344 birimlik bir kenar 20,5 birim dışa bombeleniyordu, yani kullanıcı
   dikdörtgen çizip yuvarlak alıyordu. 90° sınıra çekilince o bombe
   sıfırlandı.

   Tohum belgesindeki gerçek parçalarla sağlaması: kol oyuntusu 4°–10°
   ve yaka dibi 47,9° → hiç dokunulmuyor; kol başı 65,7° → 0,81, yani
   hâlâ yuvarlak; omuz 83,1° → 0,23, keskin omuz (teknik çizimde zaten
   köşedir); etek ucu 94,8° → tam köşe. Kural tek cümleyle: AZ NOKTAYLA
   TIKLADIĞINI ALIRSIN, ÇOK NOKTAYLA EĞRİ ALIRSIN. Vektör araçlarının
   bilinen davranışı bu; on beş noktalı serbest el çizgisi eskisiyle
   bire bir aynı çıkıyor (ölçüldü).
   ------------------------------------------------------------------ */
const EGRI_ALFA = 0.5;
const KOSE_TAM_ACI = 60;
const KOSE_DUZ_ACI = 90;

export type EgriParcasi = { p1: Pt; c1: Pt; c2: Pt; p2: Pt };

/**
 * Nokta dizisini kübik Bézier parçalarına çevirir.
 *
 * TEK KAYNAK OLMASI ŞART. Hem `smoothPath` (ekrana çizilen) hem
 * `samplePath` (vuruş testi, zigzag, sürfile, makas) buradan besleniyor.
 * Eskiden ikisi aynı matematiği AYRI AYRI yazıyordu; birini değiştirip
 * ötekini unutmak, tıklamanın çizgiyi ıskaladığı sessiz bir hata
 * demekti.
 */
export function egriParcalari(pts: Pt[], closed: boolean): EgriParcasi[] {
  const n = pts.length;
  if (n < 2) return [];

  /* Açık yolda uçlar YANSITILIYOR, kopyalanmıyor. Kopyalamak sıfır
     uzunlukta bir aralık üretir ve centripetal formülün paydası
     sıfırlanır. Yansıma hem bu tekilliği kaldırıyor hem uca doğal bir
     teğet veriyor. */
  const get = (i: number): Pt => {
    if (closed) return pts[((i % n) + n) % n];
    if (i < 0) return { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y };
    if (i > n - 1) return { x: 2 * pts[n - 1].x - pts[n - 2].x, y: 2 * pts[n - 1].y - pts[n - 2].y };
    return pts[i];
  };

  /** Bir noktadaki teğet çarpanı: 1 tam eğri, 0 keskin köşe. */
  const agirlik = (i: number): number => {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1);
    const ux = p1.x - p0.x, uy = p1.y - p0.y;
    const vx = p2.x - p1.x, vy = p2.y - p1.y;
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu < 1e-9 || lv < 1e-9) return 1;
    const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)));
    const aci = (Math.acos(cos) * 180) / Math.PI;
    if (aci <= KOSE_TAM_ACI) return 1;
    if (aci >= KOSE_DUZ_ACI) return 0;
    return (KOSE_DUZ_ACI - aci) / (KOSE_DUZ_ACI - KOSE_TAM_ACI);
  };

  const aralik = (a: Pt, b: Pt) => Math.max(Math.pow(dist(a, b), EGRI_ALFA), 1e-6);

  const out: EgriParcasi[] = [];
  const son = closed ? n : n - 1;
  for (let i = 0; i < son; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const d1 = aralik(p0, p1), d2 = aralik(p1, p2), d3 = aralik(p2, p3);
    /* Barry–Goldman: Catmull-Rom parçasının Bézier karşılığı. d1=d2=d3
       konursa eski `p1 + (p2-p0)/6` bağıntısına indirgeniyor. */
    const payda1 = 3 * d1 * (d1 + d2);
    const payda2 = 3 * d3 * (d3 + d2);
    const k1 = 2 * d1 * d1 + 3 * d1 * d2 + d2 * d2;
    const k2 = 2 * d3 * d3 + 3 * d3 * d2 + d2 * d2;
    const b1 = {
      x: (d1 * d1 * p2.x - d2 * d2 * p0.x + k1 * p1.x) / payda1,
      y: (d1 * d1 * p2.y - d2 * d2 * p0.y + k1 * p1.y) / payda1,
    };
    const b2 = {
      x: (d3 * d3 * p1.x - d2 * d2 * p3.x + k2 * p2.x) / payda2,
      y: (d3 * d3 * p1.y - d2 * d2 * p3.y + k2 * p2.y) / payda2,
    };
    const w1 = agirlik(i), w2 = agirlik(i + 1);
    out.push({
      p1,
      c1: { x: p1.x + (b1.x - p1.x) * w1, y: p1.y + (b1.y - p1.y) * w1 },
      c2: { x: p2.x + (b2.x - p2.x) * w2, y: p2.y + (b2.y - p2.y) * w2 },
      p2,
    });
  }
  return out;
}

/** Bézier parçası üzerinde t noktası. */
function bezierNokta(s: EgriParcasi, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {
    x: a * s.p1.x + b * s.c1.x + c * s.c2.x + d * s.p2.x,
    y: a * s.p1.y + b * s.c1.y + c * s.c2.y + d * s.p2.y,
  };
}

/** Yumuşatılmış yolun SVG path verisi. */
export function smoothPath(pts: Pt[], closed: boolean): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  if (n === 2) return `M ${f(pts[0].x)} ${f(pts[0].y)} L ${f(pts[1].x)} ${f(pts[1].y)}`;
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (const s of egriParcalari(pts, closed)) {
    d += ` C ${f(s.c1.x)} ${f(s.c1.y)} ${f(s.c2.x)} ${f(s.c2.y)} ${f(s.p2.x)} ${f(s.p2.y)}`;
  }
  return closed ? d + " Z" : d;
}

export function polyPath(pts: Pt[], closed: boolean): string {
  if (pts.length === 0) return "";
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${f(p.x)} ${f(p.y)}`).join(" ");
  return closed ? d + " Z" : d;
}

/** Eğriyi ya da çokgeni yoğun bir polyline'a örnekler (zigzag, sürfile, çarpışma için) */
export function samplePath(pts: Pt[], closed: boolean, smooth: boolean, step = 3): Pt[] {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const out: Pt[] = [];
  if (!smooth) {
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const len = dist(a, b);
      const k = Math.max(1, Math.round(len / step));
      for (let j = 0; j < k; j++) out.push({ x: a.x + ((b.x - a.x) * j) / k, y: a.y + ((b.y - a.y) * j) / k });
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  for (const s of egriParcalari(pts, closed)) {
    const k = Math.max(2, Math.round(dist(s.p1, s.p2) / step));
    for (let j = 0; j < k; j++) out.push(bezierNokta(s, j / k));
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/** Zigzag dikiş: örneklenmiş çizgi boyunca ± genlikle dik sapma */
export function zigzag(sampled: Pt[], closed: boolean, amp = 2): string {
  if (sampled.length < 2) return "";
  const pts: Pt[] = [];
  const n = sampled.length;
  for (let i = 0; i < n; i++) {
    const a = sampled[i], b = sampled[(i + 1) % n];
    if (!closed && i === n - 1) { pts.push(a); break; }
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const s = i % 2 === 0 ? amp : -amp;
    pts.push({ x: a.x + nx * s, y: a.y + ny * s });
  }
  return polyPath(pts, closed);
}

/** Sürfile: çizgiye dik kısa çentikler */
export function overlockTicks(sampled: Pt[], closed: boolean, len = 3): string {
  const n = sampled.length;
  if (n < 2) return "";
  let d = "";
  for (let i = 0; i < n; i += 2) {
    const a = sampled[i], b = sampled[(i + 1) % n];
    if (!closed && i >= n - 1) break;
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    d += `M ${f(a.x)} ${f(a.y)} L ${f(a.x + nx * len)} ${f(a.y + ny * len)} `;
  }
  return d;
}

/** Çokgeni merkeze doğru daraltır (üst dikiş paralel çizgisi için yaklaşık) */
export function inset(pts: Pt[], amount: number): Pt[] {
  const c = centroid(pts);
  return pts.map((p) => {
    const d = dist(p, c) || 1;
    const k = Math.max(0, d - amount) / d;
    return { x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k };
  });
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

export function distToPolyline(p: Pt, pts: Pt[], closed: boolean): number {
  let best = Infinity;
  const n = pts.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) best = Math.min(best, distToSegment(p, pts[i], pts[(i + 1) % n]));
  return best;
}

/** Çokgeni bir doğrunun (a→b) belirttiği yarı düzleme göre kırpar (Sutherland–Hodgman) */
function clipHalfPlane(poly: Pt[], a: Pt, b: Pt, keepLeft: boolean): Pt[] {
  const side = (p: Pt) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const inside = (p: Pt) => (keepLeft ? side(p) >= 0 : side(p) <= 0);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i - 1 + poly.length) % poly.length];
    const cIn = inside(cur), pIn = inside(prev);
    if (cIn) {
      if (!pIn) out.push(intersect(prev, cur, a, b));
      out.push(cur);
    } else if (pIn) {
      out.push(intersect(prev, cur, a, b));
    }
  }
  return out;
}

function intersect(p1: Pt, p2: Pt, a: Pt, b: Pt): Pt {
  const d = (p1.x - p2.x) * (a.y - b.y) - (p1.y - p2.y) * (a.x - b.x);
  if (Math.abs(d) < 1e-9) return p2;
  const t = ((p1.x - a.x) * (a.y - b.y) - (p1.y - a.y) * (a.x - b.x)) / d;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

/** Kapalı çokgeni a→b doğrusuyla ikiye böler; kesmiyorsa null */
export function splitPolygon(poly: Pt[], a: Pt, b: Pt): [Pt[], Pt[]] | null {
  const left = clipHalfPlane(poly, a, b, true);
  const right = clipHalfPlane(poly, a, b, false);
  if (left.length < 3 || right.length < 3) return null;
  const areaOf = (p: Pt[]) => Math.abs(p.reduce((s, q, i) => s + q.x * p[(i + 1) % p.length].y - p[(i + 1) % p.length].x * q.y, 0)) / 2;
  if (areaOf(left) < 4 || areaOf(right) < 4) return null;
  return [simplify(left), simplify(right)];
}

/** Çok yakın ardışık noktaları eler */
export function simplify(pts: Pt[], eps = 0.8): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    if (out.length === 0 || dist(out[out.length - 1], p) > eps) out.push(p);
  }
  if (out.length > 2 && dist(out[0], out[out.length - 1]) <= eps) out.pop();
  return out;
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();
