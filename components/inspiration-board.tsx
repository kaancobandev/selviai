"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Veri modeli — konumlar tuvalin yüzdesi (x, y), boyutlar px.
   `--s` CSS değişkeni ile öğeler küçük ekranlarda orantılı küçülür.
   ------------------------------------------------------------------ */
type Base = { id: string; x: number; y: number; z: number; rotate: number };
type ImageItem = Base & { type: "image"; src: string; alt: string; w: number; h: number; local?: boolean };
type NoteItem = Base & { type: "note"; text: string; w: number };
type PaletteItem = Base & { type: "palette"; title: string; colors: string[] };
import type { StudyoTohum } from "@/lib/ai/tohum";

export type BoardItem = ImageItem | NoteItem | PaletteItem;

const u = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const SAMPLES: BoardItem[] = [
  { id: "s1", type: "image", src: u("1496747611176-843222e1e57c"), alt: "Editoryal moda fotoğrafı — akan elbise", w: 240, h: 320, x: 9, y: 17, z: 1, rotate: -2 },
  { id: "s2", type: "image", src: u("1594633312681-425c7b97ccd1"), alt: "Editoryal moda fotoğrafı — pantolon detayı", w: 220, h: 290, x: 22, y: 35, z: 2, rotate: 1.5 },
  { id: "s3", type: "image", src: u("1524504388940-b1c1722653e1"), alt: "Editoryal moda fotoğrafı — portre", w: 200, h: 250, x: 34, y: 13, z: 3, rotate: 0 },
  { id: "s4", type: "note", text: "Sessizlik bir renk değil, bir tavırdır.", w: 260, x: 58, y: 20, z: 4, rotate: -1.5 },
  { id: "s5", type: "palette", title: "Palet 01", colors: ["#1a1a1a", "#d9d2c5", "#7a6a58"], x: 57, y: 57, z: 5, rotate: 1 },
];

/**
 * Tohumu pano öğelerine çevirir.
 *
 * Yerleşim ELLE, rastgele değil: üretilen kareler aynı boyutta geliyor
 * ve üst üste binerse pano "tek görsel" gibi okunuyor. Hafif açı ve
 * kaydırma, kolaj hissini veren şey.
 *
 * Moodboard varsa panonun sağına, biraz daha büyük konuluyor — akışta
 * o "özet" rolünde ve panoda da öyle okunmalı.
 */
function tohumdanPano(t: StudyoTohum): BoardItem[] {
  const yer = [
    { x: 7, y: 14, w: 210, h: 262, rotate: -2.2 },
    { x: 25, y: 30, w: 195, h: 244, rotate: 1.4 },
    { x: 42, y: 12, w: 190, h: 238, rotate: -0.8 },
    { x: 58, y: 34, w: 200, h: 250, rotate: 2 },
  ];
  const ogeler: BoardItem[] = t.ilham.slice(0, 4).map((src, i) => ({
    id: `t${i}`,
    type: "image",
    src,
    alt: `İlham karesi ${i + 1}`,
    ...yer[i % yer.length],
    z: i + 1,
  }));

  if (t.turetilmis.moodboard) {
    ogeler.push({
      id: "t-mood",
      type: "image",
      src: t.turetilmis.moodboard,
      alt: "Moodboard",
      w: 300,
      h: 300,
      x: 74,
      y: 8,
      z: ogeler.length + 1,
      rotate: -1.2,
    });
  }

  if (t.brief) {
    ogeler.push({
      id: "t-not",
      type: "note",
      text: t.brief,
      w: 260,
      x: 10,
      y: 66,
      z: ogeler.length + 1,
      rotate: -1,
    });
  }
  return ogeler;
}

const PALETTES = [
  ["#1a1a1a", "#e8e2d6", "#9c8b7a"],
  ["#2b2b2b", "#cfc7ba", "#5b6b5a"],
  ["#111111", "#ddd6c8", "#8c4a3c"],
  ["#3a3a3a", "#f1ede4", "#b8a98f"],
];

const DEFAULT_NOTE = "Yeni not";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

type Drag = { id: string; startX: number; startY: number; ox: number; oy: number; W: number; H: number; xs: number; moved: boolean };

/** Küçük ekranlarda x konumlarını sıkıştıran CSS katsayısı (--xs) */
function readXs(el: HTMLElement | null) {
  if (!el) return 1;
  const v = parseFloat(getComputedStyle(el).getPropertyValue("--xs"));
  return Number.isFinite(v) && v > 0 ? v : 1;
}

/**
 * `tohum` verilirse pano ÖRNEKLERLE DEĞİL kullanıcının kendi üretimiyle
 * açılıyor: dört ilham karesi + moodboard, panoya serpiştirilmiş olarak.
 * Verilmezse eskisi gibi SAMPLES ile açılır — araç tek başına da
 * çalışır durumda kalıyor (tanıtım ekranı, doğrudan gezinme).
 */
export function InspirationBoard({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const baslangic = useMemo(() => (tohum ? tohumdanPano(tohum) : SAMPLES), [tohum]);
  const [items, setItems] = useState<BoardItem[]>(baslangic);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fileOver, setFileOver] = useState(false);

  const canvasRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const zRef = useRef(baslangic.length + 1);
  const paletteCount = useRef(1);
  const itemsRef = useRef<BoardItem[]>(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Sayfadan ayrılırken yerel önizleme URL'lerini serbest bırak
  useEffect(
    () => () => {
      itemsRef.current.forEach((it) => {
        if (it.type === "image" && it.local) URL.revokeObjectURL(it.src);
      });
    },
    [],
  );

  /* ---------------- yardımcılar ---------------- */
  const nextZ = () => ++zRef.current;

  function bringToFront(id: string) {
    const z = nextZ();
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, z } : it)));
  }

  function remove(id: string) {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.type === "image" && target.local) URL.revokeObjectURL(target.src);
      return prev.filter((it) => it.id !== id);
    });
    setSelectedId((cur) => (cur === id ? null : cur));
    setEditingId((cur) => (cur === id ? null : cur));
  }

  function clearAll() {
    items.forEach((it) => {
      if (it.type === "image" && it.local) URL.revokeObjectURL(it.src);
    });
    setItems([]);
    setSelectedId(null);
    setEditingId(null);
  }

  function restoreSamples() {
    zRef.current = SAMPLES.length + 1;
    setItems(SAMPLES);
    setSelectedId(null);
  }

  function addNote() {
    const id = uid();
    setItems((prev) => [
      ...prev,
      { id, type: "note", text: DEFAULT_NOTE, w: 240, x: 46 + (prev.length % 3) * 3, y: 44 + (prev.length % 4) * 3, z: nextZ(), rotate: 0 },
    ]);
    setSelectedId(id);
    setEditingId(id);
  }

  function addPalette() {
    const id = uid();
    const colors = PALETTES[paletteCount.current % PALETTES.length];
    paletteCount.current += 1;
    const n = paletteCount.current;
    setItems((prev) => [
      ...prev,
      { id, type: "palette", title: `Palet ${String(n).padStart(2, "0")}`, colors, x: 74 + (prev.length % 3) * 2, y: 60 + (prev.length % 4) * 3, z: nextZ(), rotate: 0 },
    ]);
    setSelectedId(id);
  }

  function addImages(list: FileList | File[] | null, at?: { x: number; y: number }) {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const created: BoardItem[] = files.map((f, i) => ({
      id: uid(),
      type: "image",
      src: URL.createObjectURL(f),
      alt: f.name,
      local: true,
      w: 220,
      h: 280,
      x: clamp((at?.x ?? 30) + i * 3, 0, 85),
      y: clamp((at?.y ?? 25) + i * 3, 0, 80),
      z: nextZ(),
      rotate: i % 2 === 0 ? -1 : 1.5,
    }));
    setItems((prev) => [...prev, ...created]);
    setSelectedId(created[created.length - 1].id);
  }

  function updateNote(id: string, text: string) {
    setItems((prev) => prev.map((it) => (it.id === id && it.type === "note" ? { ...it, text } : it)));
  }

  function nudge(dx: number, dy: number) {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId ? { ...it, x: clamp(it.x + dx, -20, 95), y: clamp(it.y + dy, -10, 95) } : it,
      ),
    );
  }

  /* ---------------- işaretçi (sürükleme) ---------------- */
  function onItemPointerDown(e: ReactPointerEvent<HTMLDivElement>, item: BoardItem) {
    if (e.button !== 0) return;
    if (editingId === item.id) return; // metin düzenlerken sürükleme yok
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: item.id, startX: e.clientX, startY: e.clientY, ox: item.x, oy: item.y, W: rect.width, H: rect.height, xs: readXs(canvasRef.current), moved: false };
    if (editingId) setEditingId(null);
    setSelectedId(item.id);
    bringToFront(item.id);
  }

  function onItemPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (((e.clientX - d.startX) / d.W) * 100) / d.xs;
    const dy = ((e.clientY - d.startY) / d.H) * 100;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 0.15) return;
    d.moved = true;
    setItems((prev) =>
      prev.map((it) => (it.id === d.id ? { ...it, x: clamp(d.ox + dx, -20, 95), y: clamp(d.oy + dy, -10, 95) } : it)),
    );
  }

  function onItemPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  /* ---------------- klavye ---------------- */
  function onKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
    if (editingId) {
      if (e.key === "Escape") (e.target as HTMLElement).blur();
      return;
    }
    if (!selectedId) return;
    const step = e.shiftKey ? 2 : 0.5;
    switch (e.key) {
      case "Delete":
      case "Backspace":
        e.preventDefault();
        remove(selectedId);
        break;
      case "Escape":
        setSelectedId(null);
        break;
      case "ArrowLeft":
        e.preventDefault();
        nudge(-step, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        nudge(step, 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        nudge(0, -step);
        break;
      case "ArrowDown":
        e.preventDefault();
        nudge(0, step);
        break;
    }
  }

  /* ---------------- dosya bırakma ---------------- */
  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setFileOver(false);
    const rect = canvasRef.current?.getBoundingClientRect();
    const at = rect
      ? { x: (((e.clientX - rect.left) / rect.width) * 100) / readXs(canvasRef.current) - 8, y: ((e.clientY - rect.top) / rect.height) * 100 - 8 }
      : undefined;
    addImages(e.dataTransfer.files, at);
  }

  const empty = items.length === 0;

  return (
    <section
      ref={canvasRef}
      tabIndex={0}
      aria-label="İlham panosu çalışma alanı"
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedId(null);
          setEditingId(null);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!fileOver) setFileOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setFileOver(false);
      }}
      onDrop={onDrop}
      className="tuval dot-grid relative flex-1 select-none overflow-hidden outline-none [--s:0.64] sm:[--s:0.8] lg:[--s:1] [--oy:88px] sm:[--oy:56px] lg:[--oy:0px] [--xs:0.8] sm:[--xs:0.9] lg:[--xs:1] min-h-[calc(100svh-4rem-3.25rem)] lg:min-h-[calc(100svh-5rem)]"
    >
      {/* Üst sol: pano kimliği */}
      <div className="pointer-events-none absolute left-6 top-6 z-[70] md:left-10 md:top-8">
        <p className="eyebrow text-ash">Inspiration · Taslak</p>
        <h1 className="mt-3 font-display text-xl leading-none md:text-3xl">İlham panosu</h1>
      </div>
      {/* Üst sağ: sayaç */}
      <p className="pointer-events-none absolute right-6 top-6 z-[70] eyebrow tabular-nums text-ash md:right-10 md:top-8">
        {items.length} öğe
      </p>
      {/* Alt sol: ipuçları */}
      <p className="pointer-events-none absolute bottom-7 left-10 z-[70] hidden eyebrow text-ash lg:block">
        Sürükleyin · Çift tıklayın: düzenle · Delete: sil
      </p>

      {/* Öğeler */}
      {items.map((it) => {
        const selected = it.id === selectedId;
        const editing = it.id === editingId;
        return (
          <div
            key={it.id}
            role="button"
            tabIndex={0}
            aria-label={
              it.type === "image" ? it.alt : it.type === "note" ? `Not: ${it.text}` : `${it.title}: ${it.colors.join(", ")}`
            }
            aria-pressed={selected}
            data-selected={selected}
            onPointerDown={(e) => onItemPointerDown(e, it)}
            onPointerMove={onItemPointerMove}
            onPointerUp={onItemPointerUp}
            onPointerCancel={onItemPointerUp}
            onFocus={() => setSelectedId(it.id)}
            onDoubleClick={() => {
              if (it.type === "note") setEditingId(it.id);
            }}
            className={cn(
              "absolute touch-none outline-none",
              editing ? "cursor-text" : selected ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{ left: `calc(${it.x}% * var(--xs))`, top: `calc(${it.y}% + var(--oy))`, zIndex: it.z, transform: `rotate(${it.rotate}deg)` }}
          >
            {it.type === "image" && <ImageCard item={it} selected={selected} />}
            {it.type === "note" && (
              <NoteCard
                item={it}
                editing={editing}
                onCommit={(text) => {
                  updateNote(it.id, text);
                  setEditingId(null);
                }}
              />
            )}
            {it.type === "palette" && <PaletteCard item={it} />}
            {selected && <SelectionFrame />}
          </div>
        );
      })}

      {/* Boş durum */}
      {empty && (
        <div className="pointer-events-none absolute inset-0 z-[65] flex flex-col items-center justify-center px-6 text-center">
          <p className="font-display text-3xl leading-tight md:text-5xl">İlhamınızı oluşturmaya başlayın.</p>
          <p className="mt-5 eyebrow text-ash">Sürükleyin veya yükleyin.</p>
          <button
            type="button"
            onClick={restoreSamples}
            className="pointer-events-auto mt-10 eyebrow text-ash u-line hover:text-ink"
          >
            Örnek panoyu geri getir
          </button>
        </div>
      )}

      {/* Dosya sürüklenirken: kesikli çerçeve */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-4 z-[80] border border-dashed border-ink/50 transition-opacity duration-300",
          fileOver ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Araç çubuğu */}
      <div className="absolute bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-0.5 border border-ink/10 bg-paper/70 p-1.5 backdrop-blur-md">
        <ToolButton label="Görsel yükle" onClick={() => fileRef.current?.click()}>
          <path d="M3.5 4.5h17v15h-17z" />
          <path d="M3.5 16.5l5-5 4 4 3-3 5 5" />
          <circle cx="16" cy="8.5" r="1.5" />
        </ToolButton>
        <ToolButton label="Not ekle" onClick={addNote}>
          <path d="M5 5.5h14" />
          <path d="M12 5.5v13" />
          <path d="M9.5 18.5h5" />
        </ToolButton>
        <ToolButton label="Palet ekle" onClick={addPalette}>
          <path d="M3 8.5h5v7H3zM9.5 8.5h5v7h-5zM16 8.5h5v7h-5z" />
        </ToolButton>
        <span aria-hidden className="mx-1.5 h-5 w-px bg-ink/10" />
        <button
          type="button"
          onClick={clearAll}
          disabled={empty}
          className="h-10 px-3 eyebrow text-ash transition-colors duration-300 hover:text-ink disabled:opacity-40"
        >
          Temizle
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            addImages(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function SelectionFrame() {
  const corners = ["-left-[6px] -top-[6px]", "-right-[6px] -top-[6px]", "-left-[6px] -bottom-[6px]", "-right-[6px] -bottom-[6px]"];
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute -inset-[3px] border border-ink" />
      {corners.map((pos) => (
        <span key={pos} aria-hidden className={cn("pointer-events-none absolute h-[7px] w-[7px] border border-ink bg-paper", pos)} />
      ))}
    </>
  );
}

function ImageCard({ item, selected }: { item: ImageItem; selected: boolean }) {
  return (
    <div
      className="relative overflow-hidden bg-mist"
      style={{ width: `calc(${item.w}px * var(--s))`, height: `calc(${item.h}px * var(--s))` }}
    >
      <Image
        src={item.src}
        alt=""
        fill
        unoptimized={item.local}
        draggable={false}
        sizes="300px"
        className={cn("object-cover transition-[filter] duration-700 ease-[var(--ease-out-quart)]", selected ? "grayscale-0" : "grayscale")}
      />
    </div>
  );
}

function NoteCard({ item, editing, onCommit }: { item: NoteItem; editing: boolean; onCommit: (text: string) => void }) {
  return (
    <div className="border border-ink/10 bg-paper p-4 md:p-5" style={{ width: `max(calc(${item.w}px * var(--s)), 200px)` }}>
      <p className="eyebrow text-ash">Not</p>
      <p
        ref={(el) => {
          if (editing && el && document.activeElement !== el) {
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            // Yeni not: metnin tamamı seçili gelir, yazmaya başlayınca yerini alır.
            if (item.text !== DEFAULT_NOTE) range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={(e) => onCommit((e.currentTarget.textContent ?? "").trim() || DEFAULT_NOTE)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "mt-3 font-display leading-snug outline-none text-[clamp(1.05rem,calc(1.35rem*var(--s)),1.35rem)]",
          editing && "select-text cursor-text",
        )}
      >
        {item.text}
      </p>
    </div>
  );
}

function PaletteCard({ item }: { item: PaletteItem }) {
  return (
    <div className="border border-ink/10 bg-paper p-4" style={{ width: `max(calc(208px * var(--s)), 172px)` }}>
      <p className="eyebrow text-ash">{item.title}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {item.colors.map((c) => (
          <div key={c}>
            <span className="block aspect-square border border-ink/10" style={{ background: c }} />
            <span className="mt-2 block text-[9px] uppercase tracking-[0.04em] tabular-nums text-smoke">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative flex h-10 w-10 items-center justify-center text-ink/70 transition-colors duration-300 hover:bg-ink/[0.04] hover:text-ink"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink px-2.5 py-1.5 eyebrow text-bone opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </button>
  );
}
