"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  defaultAssignment,
  defaultSelection,
  fmtTime,
  looks,
  moods,
  props as initialProps,
  roles,
  schedule,
  shootMeta,
  statusMeta,
  tearsheets as initialTears,
  type Assignment,
  type MoodId,
  type Prop,
  type Role,
  type RoleId,
  type Slot,
  type Status,
  type Tearsheet,
} from "@/lib/shoot";
import { cn } from "@/lib/utils";
import { Arrow, Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";

type ModelCol = "model1" | "model2" | null;
const COLS: ModelCol[] = [null, "model1", "model2"];
const colKey = (c: ModelCol) => c ?? "none";

/**
 * Shooting — prodüksiyon ve set yönetimi masası.
 * A Ekip & lokasyon · B Sanat yönetimi & ışık · C Stilist çalışma alanı · D Call sheet.
 */
export function ShootDesk() {
  const [selection, setSelection] = useState<Record<RoleId, string>>(defaultSelection);
  const [mood, setMood] = useState<MoodId>("daylight");
  const [tears, setTears] = useState<Tearsheet[]>(initialTears);
  const [assign, setAssign] = useState<Assignment>(defaultAssignment);
  const [propList, setPropList] = useState<Prop[]>(initialProps);
  const [newProp, setNewProp] = useState("");
  const [slots, setSlots] = useState<Slot[]>(schedule);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tearsRef = useRef(tears);

  useEffect(() => {
    tearsRef.current = tears;
  }, [tears]);
  useEffect(
    () => () => {
      tearsRef.current.forEach((t) => {
        if (t.local) URL.revokeObjectURL(t.image);
      });
    },
    [],
  );

  /* ---------- türetilenler ---------- */
  const person = (r: RoleId) => {
    const role = roles.find((x) => x.id === r) ?? roles[0];
    return role.candidates.find((c) => c.id === selection[r]) ?? role.candidates[0];
  };
  const confirmed = roles.filter((r) => person(r.id).status === "confirmed").length;
  const assignedCount = Object.values(assign).filter(Boolean).length;
  const openTasks = propList.filter((p) => !p.done).length;
  const currentMood = moods.find((m) => m.id === mood) ?? moods[0];
  const looksIn = (col: ModelCol) => looks.filter((l) => (assign[l.id] ?? null) === col);

  /* ---------- eylemler ---------- */
  function move(lookId: string, to: ModelCol) {
    setAssign((a) => ({ ...a, [lookId]: to }));
  }
  function cycle(lookId: string) {
    const cur = assign[lookId] ?? null;
    const next = COLS[(COLS.indexOf(cur) + 1) % COLS.length];
    move(lookId, next);
  }
  function onDragStart(e: DragEvent<HTMLLIElement>, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDragId(id);
  }
  function onDrop(e: DragEvent<HTMLDivElement>, col: ModelCol) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id) move(id, col);
    setDragId(null);
    setOver(null);
  }
  function toggleProp(id: string) {
    setPropList((l) => l.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  }
  function addProp() {
    const name = newProp.trim();
    if (!name) return;
    setPropList((l) => [...l, { id: `p${Date.now()}`, name, owner: "Stilist", done: false }]);
    setNewProp("");
  }
  function toggleSlot(id: string) {
    setSlots((s) => s.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }
  function addTears(list: FileList | null) {
    if (!list) return;
    const next: Tearsheet[] = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ id: `t${Date.now()}-${f.name}`, image: URL.createObjectURL(f), caption: f.name.replace(/\.[^.]+$/, ""), tag: "Yeni", local: true }));
    if (next.length) setTears((t) => [...t, ...next]);
  }
  function removeTear(id: string) {
    setTears((t) => {
      const target = t.find((x) => x.id === id);
      if (target?.local) URL.revokeObjectURL(target.image);
      return t.filter((x) => x.id !== id);
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-ink px-6 pb-24 pt-8 md:px-10 md:pt-10 lg:px-12">
      {/* Başlık */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-fog">Shooting · Prodüksiyon masası</p>
          <h1 className="mt-3 font-display text-2xl leading-none md:text-3xl">{shootMeta.title} — çekim günü</h1>
          <p className="mt-3 eyebrow text-fog">
            {shootMeta.date}, {shootMeta.weekday} · Call {shootMeta.call} · {shootMeta.location} · {shootMeta.weather}
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
          <span className="eyebrow tabular-nums text-fog">
            Ekip {confirmed}/{roles.length} onaylı · {assignedCount}/{looks.length} look atandı · {openTasks} açık iş
          </span>
          <Button variant="ghost" onClick={() => setToast(`Call sheet ${roles.length} kişiye gönderildi (prototip).`)}>
            Call sheet&apos;i paylaş
          </Button>
        </div>
      </header>

      {/* A — Ekip ve lokasyon */}
      <Section title="Ekip ve lokasyon" meta={`${confirmed}/${roles.length} onaylı`} className="mt-14">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <CrewCard key={r.id} role={r} selectedId={selection[r.id]} onSelect={(id) => setSelection((s) => ({ ...s, [r.id]: id }))} />
          ))}
        </div>
      </Section>

      <div className="mt-16 grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 space-y-16 lg:col-span-7">
          {/* B — Sanat yönetimi ve ışık */}
          <Section title="Sanat yönetimi ve ışık" meta={`${currentMood.kelvin} · ${currentMood.window}`}>
            <div role="radiogroup" aria-label="Çekim mood'u" className="flex flex-wrap gap-x-7 gap-y-3">
              {moods.map((m) => {
                const active = m.id === mood;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-active={active}
                    onClick={() => setMood(m.id)}
                    className={cn("eyebrow u-line transition-colors duration-300", active ? "text-kalem" : "text-fog hover:text-kalem")}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-5 max-w-[52ch] font-display text-xl leading-snug">{currentMood.note}</p>

            <DaylightStrip slots={slots} className="mt-8" />

            <div className="mt-10">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow text-fog">Tearsheet · referanslar</p>
                <span className="eyebrow tabular-nums text-fog">{tears.length} görsel</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {tears.map((t) => (
                  <figure key={t.id} className="group">
                    <div className="relative aspect-[4/5] overflow-hidden bg-hair">
                      <Image src={t.image} alt={t.caption} fill unoptimized={t.local} sizes="200px" className="photo-reveal object-cover" />
                      <button
                        type="button"
                        aria-label={`${t.caption} referansını kaldır`}
                        onClick={() => removeTear(t.id)}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center bg-ink/80 text-paper opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1">
                          <path d="M2 2l8 8M10 2l-8 8" />
                        </svg>
                      </button>
                    </div>
                    <figcaption className="mt-2.5 flex flex-col gap-1">
                      <span className="truncate text-[11px] leading-4 text-fog">{t.caption}</span>
                      <span className="eyebrow text-fog">{t.tag}</span>
                    </figcaption>
                  </figure>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-[4/5] flex-col items-center justify-center gap-3 border border-dashed border-kalem/30 text-center transition-colors duration-300 hover:border-kalem hover:bg-kalem/[0.05]"
                >
                  <span className="font-display text-2xl leading-none">+</span>
                  <span className="eyebrow text-fog">Referans ekle</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(e) => {
                      addTears(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </button>
              </div>
            </div>
          </Section>

          {/* C — Stilist çalışma alanı */}
          <Section title="Stilist çalışma alanı" meta={`${assignedCount}/${looks.length} look atandı · ${openTasks} açık iş`}>
            <p className="eyebrow text-fog">Look — model eşleştirme</p>
            <p className="mt-2 text-[11px] leading-4 text-fog">Look&apos;ları sütunlar arasında sürükleyin; sıra, çekim sırasıdır.</p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {COLS.map((col) => {
                const key = colKey(col);
                const items = looksIn(col);
                const title = col ? `${person(col).name} — ${col === "model1" ? "Model I" : "Model II"}` : "Atanmamış";
                const sub = col ? `${items.length} look · ${items.length * 25} dk` : `${items.length} look`;
                return (
                  <div
                    key={key}
                    data-col={key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (over !== key) setOver(key);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                      setOver(null);
                    }}
                    onDrop={(e) => onDrop(e, col)}
                    className={cn(
                      "min-h-[200px] border p-3 transition-colors duration-300",
                      over === key ? "border-kalem bg-kalem/[0.08]" : "border-hair",
                    )}
                  >
                    <div className="px-1">
                      <p className="truncate text-[13px] font-medium">{title}</p>
                      <p className="mt-1 truncate eyebrow tabular-nums text-fog">{sub}</p>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {items.map((l) => (
                        <li
                          key={l.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, l.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setOver(null);
                          }}
                          className={cn(
                            "group flex cursor-grab items-center gap-3 border border-hair bg-kalem/[0.04] p-2 transition-opacity active:cursor-grabbing",
                            dragId === l.id && "opacity-40",
                          )}
                        >
                          <span className="relative h-10 w-8 shrink-0 overflow-hidden bg-hair">
                            <Image src={l.image} alt="" fill sizes="40px" className="photo object-cover" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] leading-4">Look {l.no}</span>
                            <span className="mt-1 block eyebrow leading-4 text-fog">
                              {l.name} · {l.pieces} parça
                            </span>
                          </span>
                          <button
                            type="button"
                            aria-label={`Look ${l.no} — sonraki sütuna taşı`}
                            onClick={() => cycle(l.id)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center text-fog opacity-0 transition-opacity hover:text-kalem focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Arrow />
                          </button>
                        </li>
                      ))}
                      {items.length === 0 && (
                        <li className="px-1 py-8 text-center text-[11px] leading-4 text-fog">Look&apos;u buraya sürükleyin</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="mt-12">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow text-fog">Aksesuar ve prop listesi</p>
                <span className="eyebrow tabular-nums text-fog">
                  {propList.filter((p) => p.done).length}/{propList.length} hazır
                </span>
              </div>
              <ul className="mt-4 divide-y divide-hair border-y border-hair">
                {propList.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <Checkbox
                      id={`prop-${p.id}`}
                      checked={p.done}
                      onChange={() => toggleProp(p.id)}
                      label={
                        <span className={cn("text-[13.5px] transition-colors", p.done ? "text-fog line-through decoration-kalem/40" : "text-kalem")}>
                          {p.name}
                        </span>
                      }
                    />
                    <span className="ml-auto flex items-center gap-3">
                      {p.borrowed && (
                        <Pill tone="pending">
                          Ödünç · {p.borrowed.from} · İade {p.borrowed.returnBy}
                        </Pill>
                      )}
                      <span className="hidden eyebrow text-fog sm:inline">{p.owner}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <form
                className="mt-3 flex items-end gap-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  addProp();
                }}
              >
                <input
                  value={newProp}
                  onChange={(e) => setNewProp(e.target.value)}
                  placeholder="Yeni parça ya da prop…"
                  aria-label="Yeni parça"
                  className="w-full max-w-sm border-b border-hair bg-transparent py-2.5 text-[13.5px] outline-none transition-colors focus:border-kalem"
                />
                <button type="submit" className="eyebrow u-line pb-3">
                  Ekle
                </button>
              </form>
            </div>
          </Section>
        </div>

        {/* D — Call sheet */}
        <div className="min-w-0 lg:col-span-5">
          <Section title="Call sheet" meta={`${slots.filter((s) => s.done).length}/${slots.length} tamamlandı`}>
            <div className="border border-hair p-6">
              <p className="font-display text-2xl leading-none">
                {shootMeta.date}, {shootMeta.weekday}
              </p>
              <dl className="mt-6 space-y-2.5 text-[12px] leading-4">
                <Row k="Call · Wrap">
                  {shootMeta.call} · {shootMeta.wrap}
                </Row>
                <Row k="Mekân">
                  {person("location").name} · {shootMeta.address}
                </Row>
                <Row k="Hava">{shootMeta.weather}</Row>
                <Row k="Güneş">
                  Doğuş {shootMeta.sunrise} · Batış {shootMeta.sunset}
                </Row>
                <Row k="Onaylar">
                  <span className="flex items-center gap-2">
                    <span className="flex -space-x-1.5">
                      {roles.map((r) => (
                        <span key={r.id} className={cn("relative block h-5 w-5 overflow-hidden border border-paper bg-hair", r.shape === "round" && "rounded-full")}>
                          <Image src={person(r.id).image} alt="" fill sizes="20px" className="photo object-cover" />
                        </span>
                      ))}
                    </span>
                    <span className="tabular-nums">{confirmed}/{roles.length}</span>
                  </span>
                </Row>
              </dl>
              <div className="mt-6 flex items-center justify-between border-t border-hair pt-5">
                <span className="eyebrow text-fog">Son güncelleme · bugün 06:10</span>
                <button type="button" onClick={() => setToast("Call sheet PDF olarak hazırlanıyor (prototip).")} className="eyebrow u-line">
                  PDF
                </button>
              </div>
            </div>

            <Timeline slots={slots} assign={assign} modelName={(c) => person(c).name} onToggle={toggleSlot} />
          </Section>
        </div>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function Section({ title, meta, className, children }: { title: string; meta?: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("border-t border-hair pt-8", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-display text-2xl leading-none">{title}</h2>
        {meta && <span className="eyebrow tabular-nums text-fog">{meta}</span>}
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-hair pb-2.5 last:border-b-0">
      <dt className="shrink-0 eyebrow text-fog">{k}</dt>
      <dd className="text-right text-fog">{children}</dd>
    </div>
  );
}

function Pill({ tone, children }: { tone: Status | "risk"; children: ReactNode }) {
  const m = tone === "risk" ? { bg: "#F3E4E2", fg: "#7A3B38" } : statusMeta[tone];
  return (
    <span className="whitespace-nowrap px-2 py-1 text-[9.5px] uppercase tracking-[0.14em]" style={{ background: m.bg, color: m.fg }}>
      {children}
    </span>
  );
}

function CrewCard({ role, selectedId, onSelect }: { role: Role; selectedId: string; onSelect: (id: string) => void }) {
  const p = role.candidates.find((c) => c.id === selectedId) ?? role.candidates[0];
  const round = role.shape === "round";
  return (
    <article className="border border-hair p-5">
      <div className="flex items-start gap-4">
        <span className={cn("relative block h-14 w-14 shrink-0 overflow-hidden bg-hair", round && "rounded-full")}>
          <Image src={p.image} alt="" fill sizes="56px" className="photo object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-fog">{role.label}</p>
          <p className="mt-1.5 truncate font-display text-xl leading-tight">{p.name}</p>
          <p className="mt-1 truncate text-[11px] leading-4 text-fog">{p.meta}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <Pill tone={p.status}>{statusMeta[p.status].label}</Pill>
        <span className="eyebrow tabular-nums text-fog">Call {p.call}</span>
      </div>
      <div className="mt-4 flex items-center gap-2.5 border-t border-hair pt-4">
        <span className="mr-1 eyebrow text-fog">Seçenek</span>
        {role.candidates.map((c) => {
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              aria-label={c.name}
              aria-pressed={active}
              title={c.name}
              onClick={() => onSelect(c.id)}
              className={cn(
                "relative h-6 w-6 overflow-hidden bg-hair transition-[opacity,outline-color] duration-300 outline outline-1 outline-offset-2",
                round && "rounded-full",
                active ? "outline-kalem" : "opacity-55 outline-transparent hover:opacity-100",
              )}
            >
              <Image src={c.image} alt="" fill sizes="24px" className="photo object-cover" />
            </button>
          );
        })}
      </div>
    </article>
  );
}

function DaylightStrip({ slots, className }: { slots: Slot[]; className?: string }) {
  const start = 6 * 60;
  const end = 20 * 60;
  const pct = (m: number) => `${((m - start) / (end - start)) * 100}%`;
  const sunrise = toMin(shootMeta.sunrise);
  const sunset = toMin(shootMeta.sunset);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-fog">Gün ışığı · {shootMeta.date}</p>
        <span className="eyebrow tabular-nums text-fog">Şimdi {fmtTime(shootMeta.now)}</span>
      </div>
      <div className="relative mt-4 h-7">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-hair" />
        <div aria-hidden className="absolute top-1/2 h-px bg-kalem/60" style={{ left: pct(sunrise), width: `calc(${pct(sunset)} - ${pct(sunrise)})` }} />
        {shootMeta.golden.map((g) => (
          <div
            key={g.start}
            aria-hidden
            className="absolute top-[calc(50%-4px)] h-2"
            style={{ left: pct(g.start), width: `calc(${pct(g.end)} - ${pct(g.start)})`, background: "#F2EBDD" }}
          />
        ))}
        {slots
          .filter((s) => s.kind === "look")
          .map((s) => (
            <span key={s.id} aria-hidden className="absolute top-[calc(50%-5px)] h-[10px] w-px bg-kalem" style={{ left: pct(s.start) }} title={s.title} />
          ))}
        <span aria-hidden className="absolute top-0 h-7 w-px bg-kalem" style={{ left: pct(shootMeta.now) }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 eyebrow tabular-nums text-fog">
        <span>06:00</span>
        <span>Doğuş {shootMeta.sunrise}</span>
        <span>Altın saat {fmtTime(shootMeta.golden[1].start)}–{fmtTime(shootMeta.golden[1].end)}</span>
        <span>Batış {shootMeta.sunset}</span>
        <span>20:00</span>
      </div>
    </div>
  );
}

function Timeline({
  slots,
  assign,
  modelName,
  onToggle,
}: {
  slots: Slot[];
  assign: Assignment;
  modelName: (c: "model1" | "model2") => string;
  onToggle: (id: string) => void;
}) {
  const isGolden = (s: Slot) => s.kind === "look" && shootMeta.golden.some((g) => s.start < g.end && s.end > g.start);
  const nowIndex = slots.findIndex((s) => s.start > shootMeta.now);
  return (
    <ol className="relative mt-8 border-l border-hair">
      {slots.map((s, i) => {
        const look = s.lookId ? looks.find((l) => l.id === s.lookId) : undefined;
        const col = s.lookId ? (assign[s.lookId] ?? null) : null;
        const showNow = i === nowIndex;
        return (
          <li key={s.id} className="relative">
            {showNow && (
              <div aria-hidden className="relative my-1 ml-6 flex items-center gap-3">
                <span className="absolute -left-[27px] h-1.5 w-1.5 rounded-full bg-kalem" />
                <span className="h-px flex-1 bg-kalem" />
                <span className="eyebrow tabular-nums">Şimdi {fmtTime(shootMeta.now)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onToggle(s.id)}
              aria-pressed={Boolean(s.done)}
              className="group flex w-full items-start gap-4 py-3 pl-6 text-left"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[3.5px] mt-[7px] h-1.5 w-1.5 rounded-full border border-kalem transition-colors",
                  s.done ? "bg-kalem" : "bg-kalem/25 group-hover:bg-kalem/50",
                )}
              />
              <span className="w-11 shrink-0 pt-0.5 eyebrow tabular-nums text-fog">{fmtTime(s.start)}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[13.5px] leading-5 transition-colors", s.done ? "text-fog line-through decoration-kalem/40" : "text-kalem")}>
                  {s.title}
                  {look && (
                    <>
                      {" "}
                      · {look.name}
                    </>
                  )}
                </span>
                <span className="mt-1 block eyebrow text-fog">
                  {[look ? (col ? modelName(col) : null) : s.detail, `${s.end - s.start} dk`, s.outdoor ? "Dış mekân" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                {look && !col && <Pill tone="risk">Model atanmadı</Pill>}
                {isGolden(s) && <Pill tone="pending">Altın saat</Pill>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
