"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { collectionCategories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { CollectionCard } from "@/components/collection-card";
import { Toast } from "@/components/ui/toast";

type Picked = { id: string; url: string; name: string };

const MAX_FILES = 12;
const seasons = ["SS26", "AW26", "Resort 26", "Pre-Fall 26"];

export function UploadForm() {
  const [files, setFiles] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<Picked[]>([]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const [form, setForm] = useState({
    name: "",
    designer: "",
    category: "Hazır Giyim",
    season: seasons[0],
    pieces: "",
    price: "",
    description: "",
    tags: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Sayfa kapanırken geçici önizleme URL'lerini serbest bırak
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const room = MAX_FILES - files.length;
    const next = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(room, 0))
      .map((f) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), name: f.name }));
    if (next.length === 0) {
      setToast(room <= 0 ? `En fazla ${MAX_FILES} görsel.` : "Yalnızca görsel dosyaları kabul edilir.");
      return;
    }
    setFiles((prev) => [...prev, ...next]);
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((f) => f.id !== id);
    });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function publish() {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("koleksiyon adı");
    if (!form.price) missing.push("fiyat");
    if (files.length === 0) missing.push("en az bir görsel");
    if (missing.length) {
      setToast(`Eksik: ${missing.join(", ")}.`);
      return;
    }
    setPublished(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
    setForm({ name: "", designer: "", category: "Hazır Giyim", season: seasons[0], pieces: "", price: "", description: "", tags: "" });
    setPublished(false);
  }

  if (published) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center md:py-36">
        <p className="eyebrow text-ash">Koleksiyon yayınlandı</p>
        <h2 className="mt-6 font-display text-5xl leading-[1] md:text-7xl">Teşekkürler.</h2>
        <p className="mx-auto mt-6 max-w-[40ch] text-[15px] leading-7 text-smoke">
          <span className="font-display text-lg text-ink">{form.name}</span> incelemeye alındı.
          Onaylandığında Market&apos;te görünecek ve size e-posta ile haber vereceğiz.
        </p>
        <div className="mt-12 flex items-center justify-center gap-8">
          <Button href="/market">Market&apos;e git</Button>
          <button type="button" onClick={reset} className="eyebrow u-line">
            Yeni koleksiyon
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-16 grid gap-16 lg:grid-cols-12 lg:gap-10">
        {/* Form */}
        <form
          className="lg:col-span-7"
          onSubmit={(e) => {
            e.preventDefault();
            publish();
          }}
        >
          {/* Sürükle-bırak alanı — kesikli dikiş çizgisi */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Görsel yüklemek için tıklayın ya da dosyaları buraya sürükleyin"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "relative flex aspect-[16/9] cursor-pointer flex-col items-center justify-center border border-dashed text-center transition-[border-color,background-color] duration-500 sm:aspect-[21/9]",
              dragging ? "border-ink bg-paper" : "border-ink/30 bg-transparent hover:border-ink/60 hover:bg-paper/60",
            )}
          >
            <p className="font-display text-2xl md:text-3xl">Görselleri buraya bırakın</p>
            <p className="mt-4 eyebrow text-ash">veya dosya seçin · JPG, PNG · en fazla {MAX_FILES} görsel</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {files.map((f, i) => (
                <li key={f.id} className="group relative aspect-[4/5] overflow-hidden bg-mist">
                  <Image src={f.url} alt={f.name} fill unoptimized sizes="120px" className="object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 bg-bone/90 px-1.5 py-1 text-[9px] uppercase tracking-[0.18em]">
                      Kapak
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`${f.name} görselini kaldır`}
                    onClick={() => removeFile(f.id)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center bg-ink/80 text-bone opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-14 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            <Field label="Koleksiyon adı" htmlFor="name" className="sm:col-span-2">
              <Input id="name" value={form.name} onChange={set("name")} placeholder="Örn. Sessiz Siluet" autoComplete="off" />
            </Field>
            <Field label="Tasarımcı / Marka" htmlFor="designer">
              <Input id="designer" value={form.designer} onChange={set("designer")} placeholder="Adınız ya da markanız" />
            </Field>
            <Field label="Kategori" htmlFor="category">
              <Select id="category" value={form.category} onChange={set("category")}>
                {collectionCategories.filter((c) => c !== "Tümü").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sezon" htmlFor="season">
              <Select id="season" value={form.season} onChange={set("season")}>
                {seasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Parça sayısı" htmlFor="pieces">
              <Input id="pieces" type="number" min={1} inputMode="numeric" value={form.pieces} onChange={set("pieces")} placeholder="12" />
            </Field>
            <Field label="Fiyat" htmlFor="price" trailing="₺ · KDV dahil">
              <Input id="price" type="number" min={0} step={100} inputMode="numeric" value={form.price} onChange={set("price")} placeholder="48.000" />
            </Field>
            <Field label="Etiketler" htmlFor="tags" hint="Virgülle ayırın.">
              <Input id="tags" value={form.tags} onChange={set("tags")} placeholder="keten, minimal, unisex" />
            </Field>
            <Field label="Açıklama" htmlFor="description" className="sm:col-span-2" hint="Koleksiyonun hikâyesi, kumaşlar, üretim notları.">
              <Textarea id="description" value={form.description} onChange={set("description")} placeholder="Birkaç cümle yeterli." />
            </Field>
          </div>

          <div className="mt-14 flex flex-col-reverse items-stretch gap-4 border-t border-mist pt-8 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" className="eyebrow text-ash u-line self-center sm:self-auto" onClick={() => setToast("Taslak kaydedildi.")}>
              Taslak kaydet
            </button>
            <Button type="submit" size="lg">
              Yayınla
            </Button>
          </div>
        </form>

        {/* Canlı önizleme */}
        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow text-ash">Önizleme</p>
            <div className="mt-5 max-w-[360px]">
              <CollectionCard
                interactive={false}
                collection={{
                  name: form.name,
                  designer: form.designer,
                  season: form.season,
                  pieces: Number(form.pieces) || 0,
                  price: Number(form.price) || 0,
                  image: files[0]?.url,
                }}
              />
            </div>
            <p className="mt-5 max-w-[36ch] text-[11px] leading-4 text-ash">
              Market&apos;te böyle görünecek. İlk görsel kapak olarak kullanılır.
            </p>
          </div>
        </aside>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}
