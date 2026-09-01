"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
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

type Drag =
  | { kind: "pan"; startClient: Pt; startView: Pt }
  | { kind: "move"; id: string; start: Pt; orig: Pt[]; recorded: boolean }
  | { kind: "anchor"; id: string; index: number }
  | { kind: "measure"; a: Pt }
  | { kind: "cut"; a: Pt };

/* ------------------------------------------------------------------
   Bileşen
   ------------------------------------------------------------------ */
export function FlatSketch() {
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
    const f = fabrics.find((x) => x.id === fabricId);
    if (f) setToast(`${f.name} uygulandı`);
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
    setToast("SVG indirildi");
  }

  /* ---------- türetilen ---------- */
  const cursor = panning
    ? drag?.kind === "pan" ? "grabbing" : "grab"
    : tool === "select" ? (drag?.kind === "move" ? "grabbing" : "default") : "crosshair";
  const nearFirst = tool === "pen" && draft.length >= 3 && hover && dist(hover, draft[0]) < 8 / vp.zoom;
  const selBox = selected ? bbox(selected.points) : null;
  const toolMeta = TOOLS.find((t) => t.id === tool) ?? TOOLS[0];
  const pct = Math.round(vp.zoom * 100);

  return (
    <div ref={wrapRef} className="ada-acik relative flex-1 select-none overflow-hidden bg-paper min-h-[calc(100svh-4rem-3.25rem)] lg:min-h-[calc(100svh-5rem)]">
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
        </defs>

        {/* sonsuz zemin */}
        <rect x="-20000" y="-20000" width="40000" height="40000" fill="url(#grid-major)" />
        {/* eksenler */}
        <g stroke={INK} strokeOpacity="0.18" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <line x1="-20000" y1="0" x2="20000" y2="0" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="-20000" x2="0" y2="20000" vectorEffect="non-scaling-stroke" />
        </g>

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
          <span className="eyebrow text-ink">Teknik çizim · Keten bluz</span>
          <span className="eyebrow text-ash">Taslak · Kaydedildi 10:52</span>
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
                  {selected.fabricId ? fabrics.find((f) => f.id === selected.fabricId)?.name : "—"}
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
              <span className="eyebrow text-ash">Kumaş sayfasından</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {fabrics.map((f) => {
                const active = selected?.fabricId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/fabric", f.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => {
                      if (selected && selected.closed) applyFabric(selected.id, f.id);
                      else setToast("Önce kapalı bir parça seçin ya da kumaşı parçanın üstüne sürükleyin");
                    }}
                    title={`${f.name} · ${f.composition}`}
                    aria-label={f.name}
                    aria-pressed={active}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "block h-9 w-9 rounded-full border border-ink/10 bg-cover bg-center transition-[outline-color,scale] duration-300 outline outline-1 outline-offset-2",
                        active ? "outline-[#6B7C93]" : "outline-transparent group-hover:scale-105",
                      )}
                      style={{ backgroundImage: `url(${f.image})` }}
                    />
                    <span className="w-full truncate text-center text-[9px] leading-3 text-ash">{f.name}</span>
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
