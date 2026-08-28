"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type { Aspect, Crop, JobView, Lighting, Placement } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { Arrow, Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { site } from "@/lib/site";

/* ------------------------------------------------------------------
   Kompozisyon stüdyosu — üç girdi (kişi · ürün · sahne), dört parametre.
   Görseller tarayıcıda 1280 px'e küçültülür: hem gövde sınırına sığar
   hem de modelin sadakati bundan zarar görmez.
   ------------------------------------------------------------------ */

const MAX_EDGE = 1280;
const POLL_MS = 2000;
/** Sunucu tarafı zaman aşımından (4 dk) uzun olmalı; yoksa arayüz
    hâlâ çalışan bir işi terk eder. */
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

type SlotId = "person" | "product" | "scene";

type Slot = {
  id: SlotId;
  label: string;
  title: string;
  hint: string;
};

const SLOTS: Slot[] = [
  {
    id: "person",
    label: "Girdi · Kişi",
    title: "Model fotoğrafı",
    hint: "Tek kişi, yüz net. Kimlik birebir korunur.",
  },
  {
    id: "product",
    label: "Girdi · Ürün",
    title: "Takı veya kıyafet",
    hint: "Düz zeminde tek parça en iyi sonucu verir.",
  },
  {
    id: "scene",
    label: "Girdi · Sahne",
    title: "Arka plan",
    hint: "Işık yönü ve renk sıcaklığı buradan okunur.",
  },
];

const CROP_OPTIONS: { value: Crop; label: string }[] = [
  { value: "portre", label: "Portre" },
  { value: "yarim", label: "Yarım boy" },
  { value: "tam", label: "Tam boy" },
  { value: "detay", label: "Ürün detayı" },
];
const PLACEMENT_OPTIONS: { value: Placement; label: string }[] = [
  { value: "boyun", label: "Boyun" },
  { value: "kulak", label: "Kulak" },
  { value: "bilek", label: "Bilek" },
  { value: "el", label: "El" },
  { value: "govde", label: "Gövde" },
];
const LIGHTING_OPTIONS: { value: Lighting; label: string }[] = [
  { value: "sahne", label: "Sahneden devral" },
  { value: "studyo", label: "Stüdyo" },
  { value: "altin", label: "Altın saat" },
  { value: "gece", label: "Gece" },
];
const ASPECT_OPTIONS: { value: Aspect; label: string }[] = [
  { value: "4:5", label: "4:5" },
  { value: "3:4", label: "3:4" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
];

type Picked = { previewUrl: string; mimeType: string; data: string; name: string };

export function ComposeStudio() {
  const [images, setImages] = useState<Partial<Record<SlotId, Picked>>>({});
  const [crop, setCrop] = useState<Crop>("portre");
  const [placement, setPlacement] = useState<Placement>("boyun");
  const [lighting, setLighting] = useState<Lighting>("sahne");
  const [aspect, setAspect] = useState<Aspect>("4:5");
  const [note, setNote] = useState("");
  const [job, setJob] = useState<JobView | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () => {
      Object.values(imagesRef.current).forEach((p) => p && URL.revokeObjectURL(p.previewUrl));
    },
    [],
  );

  const ready = Boolean(images.person && images.product && images.scene);
  const running = busy || job?.status === "queued" || job?.status === "processing";

  /* ---------- görsel seçimi ---------- */
  const setSlot = useCallback(async (id: SlotId, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Yalnızca görsel dosyaları kabul edilir.");
      return;
    }
    try {
      const picked = await downscale(file);
      const previous = imagesRef.current[id];
      setImages((prev) => ({ ...prev, [id]: picked }));
      if (previous) URL.revokeObjectURL(previous.previewUrl);
    } catch {
      setToast("Görsel okunamadı. Başka bir dosya deneyin.");
    }
  }, []);

  const clearSlot = (id: SlotId) => {
    const previous = imagesRef.current[id];
    setImages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (previous) URL.revokeObjectURL(previous.previewUrl);
  };

  /* ---------- üretim ---------- */
  async function generate() {
    if (!ready || running) return;
    setBusy(true);
    setJob(null);
    setElapsed(0);

    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          person: strip(images.person!),
          product: strip(images.product!),
          scene: strip(images.scene!),
          crop,
          placement,
          lighting,
          aspect,
          note: note.trim() || undefined,
        }),
      });
      const payload = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !payload.jobId) {
        setToast(payload.error ?? "Üretim başlatılamadı.");
        setBusy(false);
        return;
      }
      setJob({ id: payload.jobId, status: "queued", createdAt: new Date().toISOString() });
    } catch {
      setToast("Sunucuya ulaşılamadı.");
      setBusy(false);
    }
  }

  /* ---------- durum yoklama ---------- */
  useEffect(() => {
    const id = job?.id;
    if (!id || (job.status !== "queued" && job.status !== "processing")) return;

    let stopped = false;
    const startedAt = Date.now();

    const tick = async () => {
      if (stopped) return;
      setElapsed(Math.round((Date.now() - startedAt) / 1000));

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setJob((j) => (j ? { ...j, status: "failed", error: "Üretim zaman aşımına uğradı." } : j));
        setBusy(false);
        return;
      }
      try {
        const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
        if (res.ok) {
          const next = (await res.json()) as JobView;
          if (stopped) return;
          setJob(next);
          if (next.status === "completed" || next.status === "failed") {
            setBusy(false);
            return;
          }
        }
      } catch {
        // ağ hatası — bir sonraki turda yeniden denenir
      }
      timer = setTimeout(tick, POLL_MS);
    };

    let timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [job?.id, job?.status]);

  const result = job?.status === "completed" ? job.resultDataUrl : undefined;

  return (
    <div className="flex flex-1 flex-col bg-paper px-6 pb-24 pt-8 md:px-10 md:pt-10 lg:px-12">
      {/* Başlık */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-ash">Stüdyo · Kompozisyon</p>
          <h1 className="mt-3 font-display text-2xl leading-none md:text-3xl">
            Üç görsel, tek kare
          </h1>
          <p className="mt-3 eyebrow text-ash">
            Kişi · Ürün · Sahne — yapay zekâ ile tek editoryal fotoğraf
          </p>
        </div>
        <div className="flex items-center gap-6">
          <span className="eyebrow tabular-nums text-ash">
            {[images.person, images.product, images.scene].filter(Boolean).length}/3 görsel
          </span>
          <Button onClick={generate} disabled={!ready || running}>
            {running ? `Üretiliyor · ${elapsed} sn` : "Oluştur"}
          </Button>
        </div>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        {/* Sol: girdiler ve parametreler */}
        <div className="min-w-0 lg:col-span-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {SLOTS.map((slot) => (
              <UploadSlot
                key={slot.id}
                slot={slot}
                picked={images[slot.id]}
                onPick={(file) => setSlot(slot.id, file)}
                onClear={() => clearSlot(slot.id)}
                disabled={running}
              />
            ))}
          </div>

          <section className="mt-12 border-t border-mist pt-8">
            <h2 className="eyebrow">Üretim parametreleri</h2>
            <div className="mt-7 space-y-7">
              <Choices label="Kadraj" options={CROP_OPTIONS} value={crop} onChange={setCrop} />
              <Choices
                label="Yerleşim"
                options={PLACEMENT_OPTIONS}
                value={placement}
                onChange={setPlacement}
              />
              <Choices
                label="Işık"
                options={LIGHTING_OPTIONS}
                value={lighting}
                onChange={setLighting}
              />
              <Choices label="En-boy" options={ASPECT_OPTIONS} value={aspect} onChange={setAspect} />
              <Field
                label="Sanat yönetmeni notu"
                htmlFor="compose-note"
                hint="İsteğe bağlı. Örn. rüzgârda saç, hafif profil duruş."
              >
                <Input
                  id="compose-note"
                  value={note}
                  maxLength={300}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tek cümle"
                />
              </Field>
            </div>
          </section>
        </div>

        {/* Sağ: sonuç */}
        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow text-ash">Sonuç</p>
              {job?.meta && (
                <span className="eyebrow tabular-nums text-ash">
                  {job.meta.model.replace("gemini-", "")} · {(job.meta.ms / 1000).toFixed(1)} sn
                  {job.meta.deneme && job.meta.deneme > 1 ? ` · ${job.meta.deneme}. deneme` : ""}
                </span>
              )}
            </div>

            <div
              className={cn(
                "mt-4 flex items-center justify-center overflow-hidden border border-mist bg-bone",
                aspect === "16:9" ? "aspect-video" : aspect === "1:1" ? "aspect-square" : "aspect-[4/5]",
              )}
            >
              {result ? (
                <Image
                  src={result}
                  alt="Üretilen kompozisyon"
                  width={1024}
                  height={1280}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : running ? (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <span aria-hidden className="seam w-24 text-ink" />
                  <p className="font-display text-xl">Kompozisyon kuruluyor</p>
                  <p className="eyebrow tabular-nums text-ash">{elapsed} sn · genelde 10–40 sn</p>
                </div>
              ) : job?.status === "failed" ? (
                <div className="flex flex-col items-center gap-3 px-8 text-center">
                  <p className="font-display text-xl">Üretim başarısız</p>
                  <p className="max-w-[34ch] text-[12px] leading-5 text-smoke">{job.error}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 px-8 text-center">
                  <p className="font-display text-xl">Üç görsel yükleyin</p>
                  <p className="max-w-[30ch] eyebrow leading-4 text-ash">
                    Kişi, ürün ve sahne hazır olduğunda Oluştur etkinleşir
                  </p>
                </div>
              )}
            </div>

            {result && job?.meta?.kabul === false && (
              <p className="mt-4 border-l-2 border-mist pl-3 text-[11px] leading-4 text-smoke">
                Bu kare iç kalite eşiğimizi geçemedi — genelde el, parmak ya da ürün detayında
                bir kusur vardır. Yeniden üretmek çoğu zaman düzeltir.
              </p>
            )}

            {result && (
              <div className="mt-5 flex items-center justify-between gap-4">
                <a
                  href={result}
                  download={`${slug(site.name)}-kompozisyon-${job?.id?.slice(0, 8)}.png`}
                  className="group inline-flex items-center gap-3 eyebrow u-line"
                >
                  Görseli indir
                  <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
                </a>
                <button type="button" onClick={generate} className="eyebrow text-ash u-line hover:text-ink">
                  Yeniden üret
                </button>
              </div>
            )}

            <p className="mt-6 text-[11px] leading-4 text-ash">
              Görseller yapay zekâ ile üretilir ve künyelerinde bu bilgi taşınır. Yüklediğiniz kişi
              fotoğrafı için izniniz olmalıdır.
            </p>
          </div>
        </div>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function UploadSlot({
  slot,
  picked,
  onPick,
  onClear,
  disabled,
}: {
  slot: Slot;
  picked?: Picked;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    if (!disabled) onPick(e.dataTransfer.files?.[0]);
  }

  return (
    <figure className="flex flex-col">
      <p className="eyebrow text-ash">{slot.label}</p>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${slot.title} yükle`}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!over) setOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setOver(false);
        }}
        onDrop={onDrop}
        className={cn(
          "group relative mt-3 flex aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden border text-center transition-colors duration-300",
          picked ? "border-mist bg-mist" : "border-dashed",
          over ? "border-ink bg-bone" : picked ? "" : "border-ink/30 hover:border-ink/60 hover:bg-bone/60",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {picked ? (
          <>
            <Image
              src={picked.previewUrl}
              alt={picked.name}
              fill
              unoptimized
              sizes="240px"
              className="object-cover"
            />
            <button
              type="button"
              aria-label={`${slot.title} kaldır`}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center bg-ink/80 text-bone opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 px-4">
            <span className="font-display text-lg leading-tight">{slot.title}</span>
            <span className="eyebrow text-ash">Sürükle ya da seç</span>
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <figcaption className="mt-2.5 text-[11px] leading-4 text-ash">{slot.hint}</figcaption>
    </figure>
  );
}

function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="eyebrow text-ash">{label}</p>
      <div role="radiogroup" aria-label={label} className="mt-3 flex flex-wrap gap-x-6 gap-y-2.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              data-active={active}
              className={cn(
                "eyebrow u-line transition-colors duration-300",
                active ? "text-ink" : "text-ash hover:text-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Yardımcılar
   ------------------------------------------------------------------ */

/** Marka adını dosya adına uygun hale getirir: "Selvi" → "selvi" */
function slug(name: string) {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "studyo";
}

function strip(p: Picked) {
  return { mimeType: p.mimeType, data: p.data };
}

/** Görseli en fazla MAX_EDGE kenara küçültür ve JPEG base64 döndürür. */
async function downscale(file: File): Promise<Picked> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const data = dataUrl.slice(dataUrl.indexOf(",") + 1);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );

  return {
    previewUrl: URL.createObjectURL(blob ?? file),
    mimeType: "image/jpeg",
    data,
    name: file.name,
  };
}
