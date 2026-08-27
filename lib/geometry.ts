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

/** Catmull-Rom → kübik Bézier path verisi */
export function smoothPath(pts: Pt[], closed: boolean): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  if (n === 2) return `M ${f(pts[0].x)} ${f(pts[0].y)} L ${f(pts[1].x)} ${f(pts[1].y)}`;
  const get = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[Math.min(Math.max(i, 0), n - 1)]);
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
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
  const segs = closed ? n : n - 1;
  if (!smooth) {
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const len = dist(a, b);
      const k = Math.max(1, Math.round(len / step));
      for (let j = 0; j < k; j++) out.push({ x: a.x + ((b.x - a.x) * j) / k, y: a.y + ((b.y - a.y) * j) / k });
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  const get = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[Math.min(Math.max(i, 0), n - 1)]);
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const len = dist(p1, p2);
    const k = Math.max(2, Math.round(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
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
