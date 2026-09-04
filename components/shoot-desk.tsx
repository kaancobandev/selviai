"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  defaultAssignment,
  looks,
  moods,
  ORNEK_BASLIK,
  tearsheets as initialTears,
  type Assignment,
  type MoodId,
  type Tearsheet,
  type TearTag,
} from "@/lib/shoot";
import { cn } from "@/lib/utils";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { Arrow } from "@/components/ui/button";

type ModelCol = "model1" | "model2" | null;
const COLS: ModelCol[] = [null, "model1", "model2"];
const colKey = (c: ModelCol) => c ?? "none";

/**
 * Shooting — sanat yönetimi ve stilist masası.
 * A Sanat yönetimi & ışık · B Stilist çalışma alanı.
 *
 * EKİP, LOKASYON VE CALL SHEET KALDIRILDI: ürünün varlık sebebi o
 * insanlara ve o efora ihtiyaç kalmaması. Gün ışığı şeridi de onlarla
 * gitti — içeriği (doğuş, batış, altın saat) saf lokasyon lojistiğiydi
 * ve tikleri call sheet dilimlerinden geliyordu, kalsaydı sessizce
 * boşalırdı.
 *
 * PROP/AKSESUAR LİSTESİ DE AYNI GEREKÇEYLE KALKTI: steamer ve yedek su,
 * dikiş kiti, "Ödünç · Manu Atelier · İade 17 Eyl", sahibi stilist ya da
 * asistan olan satırlar — hepsi çekim gününün lojistiğiydi, yaratıcı iş
 * değil. Ödünç rozeti (Pill) ve onu boyayan `statusMeta` listenin tek
 * kullanıcısıydı, üçü birlikte gitti. Başlıktaki "açık iş" sayacı da
 * tikleri buradan sayıyordu.
 */

/**
 * İlham ekseni -> tearsheet etiketi.
 *
 * ETİKET ARTIK KARENİN KENDİSİNDEN OKUNUYOR, SIRADAN DEĞİL. Eskiden
 * eksen adları `Object.keys` sırasıyla eşleniyordu; akış giysi
 * üretmekten ilham kaynağı üretmeye geçince (siluet/malzeme/renk/bağlam
 * → doğa/sanat/doku/mekân) bu harita eskidi ve HATA FIRLATMADI, sadece
 * yanlış yazdı: bir doğa fotoğrafının altında "İlham · siluet" duruyordu.
 * Doğru ad `tohum.kareler[].etiket` içinden, karenin adresiyle eşlenerek
 * geliyor; sıra değişse de bozulmaz.
 *
 * Eşleme keyfi değil, her kaynak çekimde bir referans başlığına denk
 * geliyor: doğa ışığa ve atmosfere, sanat poza ve kompozisyona, doku
 * kumaşa (gardıroba), mekân mekâna. Bilinmeyen eksen "Yeni" ile
 * işaretleniyor — akışa yeni bir eksen eklendiğinde harita eskimiş
 * demektir ve bu ekranda görünür.
 *
 * Tohum kareleri listenin BAŞINA konuyor; örnekler silinmiyor çünkü
 * onlar saç gibi tohumun karşılamadığı başlıkları taşıyor.
 */
const EKSEN_ETIKET: Record<string, { ad: string; tag: TearTag }> = {
  doga: { ad: "Doğa", tag: "Işık" },
  sanat: { ad: "Sanat", tag: "Poz" },
  doku: { ad: "Doku", tag: "Gardırop" },
  mekan: { ad: "Mekân", tag: "Mekân" },
};

function tohumdanTears(tohum: StudyoTohum | null | undefined, varsayilan: Tearsheet[]): Tearsheet[] {
  if (!tohum) return varsayilan;
  const yeni: Tearsheet[] = tohum.ilham.map((image, i) => {
    const etiket = tohum.kareler.find((k) => k.url === image)?.etiket ?? "";
    const eksen = EKSEN_ETIKET[etiket];
    const ad = eksen?.ad || etiket;
    return {
      id: `tohum-${i}`,
      image,
      caption: ad ? `İlham · ${ad}` : "İlham",
      tag: eksen?.tag ?? "Yeni",
      tohum: true,
    };
  });
  if (tohum.turetilmis.moodboard) {
    yeni.push({
      id: "tohum-mood",
      image: tohum.turetilmis.moodboard,
      caption: "Moodboard",
      tag: "Renk",
      tohum: true,
    });
  }
  return [...yeni, ...varsayilan];
}
/**
 * `tohum` verilirse ilham kareleri ve moodboard tearsheet olarak masaya
 * konuyor — Tearsheet tipine birebir oturuyorlar. Look listesi
 * TOHUMLANMIYOR: akış artık giysi değil ilham KAYNAĞI üretiyor (doğa,
 * sanat, doku, mekân), yani tohumda "look" diye bir şey yok. Örnek
 * look'lar bu yüzden yerinde duruyor.
 */
export function ShootDesk({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [mood, setMood] = useState<MoodId>("daylight");
  const [tears, setTears] = useState<Tearsheet[]>(() => tohumdanTears(tohum, initialTears));
  const [assign, setAssign] = useState<Assignment>(defaultAssignment);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
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
  /* Tohum varsa başlık kullanıcının kendi isteği; kısaltılmıyor çünkü
     brief'i budayan tek yer lib/lookbook.ts ve o yardımcı dışa açık
     değil — aynı mantığı ikinci kez yazmaktansa uzun başlığın sarmasına
     izin veriliyor. */
  const baslik = tohum?.brief.trim() || ORNEK_BASLIK;
  const assignedCount = Object.values(assign).filter(Boolean).length;
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
    <div className="flex flex-1 flex-col bg-zemin px-6 pb-24 pt-8 md:px-10 md:pt-10 lg:px-12">
      {/* Başlık */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-fog">Shooting · Prodüksiyon masası</p>
          <h1 className="mt-3 max-w-[24ch] font-display text-2xl leading-tight md:text-3xl">{baslik} — çekim günü</h1>
        </div>
        <span className="eyebrow tabular-nums text-fog">
          {assignedCount}/{looks.length} look atandı
        </span>
      </header>

      {/* Tek sütun: sağdaki call sheet kolonu kalkınca 12'lik ızgaranın
          yarısı boş kalıyordu, ızgara da onunla birlikte kalktı. */}
      <div className="mt-14 min-w-0 space-y-16">
        {/* A — Sanat yönetimi ve ışık */}
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

          <div className="mt-10">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow text-fog">Tearsheet · referanslar</p>
              <span className="eyebrow tabular-nums text-fog">{tears.length} görsel</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {tears.map((t) => (
                <figure key={t.id} className="group">
                  <div className="relative aspect-[4/5] overflow-hidden bg-hair">
                    <Image src={t.image} alt={t.caption} fill unoptimized={t.local || t.tohum} sizes="200px" className="photo-reveal object-cover" />
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

        {/* B — Stilist çalışma alanı */}
        <Section title="Stilist çalışma alanı" meta={`${assignedCount}/${looks.length} look atandı`}>
          <p className="eyebrow text-fog">Look — model eşleştirme</p>
          <p className="mt-2 text-[11px] leading-4 text-fog">Look&apos;ları sütunlar arasında sürükleyin; sıra, çekim sırasıdır.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {COLS.map((col) => {
              const key = colKey(col);
              const items = looksIn(col);
              /* Sütun adı artık rol listesinden gelen kişi adını taşımıyor;
                 ekip kartlarıyla birlikte o liste de gitti. */
              const title = col ? (col === "model1" ? "Model I" : "Model II") : "Atanmamış";
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
        </Section>
      </div>
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
