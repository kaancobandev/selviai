"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import {
  KOLAJ_ORANI,
  ZEMINLER,
  macentayiAc,
  ornekKolaj,
  tohumdanKolaj,
  zeminAcikMi,
  type Kolaj,
  type Parca,
} from "@/lib/kolaj";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   KOLAJ STÜDYOSU

   Moodboard'dan farkı ızgara değil SERBEST ÜST ÜSTE BİNME; panodan
   farkı ise parçaların dikdörtgen olmaması. Kolajın bütün mesele ettiği
   şey bu: iki siluetin gerçekten birbirinin üstüne oturması.

   KESİM İSTEĞE BAĞLI VE ÜCRETLİ. Açılışta parçalar bütün kare olarak
   duruyor; kullanıcı düzeni kurup "şunları kes" dediğinde model çağrısı
   yapılıyor. Peşinen kesmek, kullanıcı daha hangi kareyi kullanacağını
   bilmeden para harcamak olurdu.

   SAYDAMLIK TARAYICIDA AÇILIYOR. Model alfa veremiyor; düz macenta
   zeminle dönüyor ve `macentayiAc` onu canvas'ta saydama çeviriyor.
   Gerekçe ve ölçümler lib/kolaj.ts başında.
   ------------------------------------------------------------------ */

const YOKLAMA_MS = 2000;
const YOKLAMA_TAVANI_MS = 4 * 60 * 1000;
const EN_KUCUK = 0.06;
const EN_BUYUK = 0.9;

type KesimIstegi = { parcaId: string; isId: string; sira: number };

export function KolajStudio({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [kolaj, setKolaj] = useState<Kolaj>(() => (tohum ? tohumdanKolaj(tohum) : ornekKolaj));
  const [secili, setSecili] = useState<string | null>(null);
  const [isId, setIsId] = useState<string | null>(null);
  const [kesiliyor, setKesiliyor] = useState(false);
  const [adim, setAdim] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const tuvalRef = useRef<HTMLDivElement | null>(null);
  /* Hangi yuvanın hangi parçaya ait olduğu — iş dönünce eşleştirmek
     için. Yuva adı sunucuda sabitleniyor (bkz. lib/ai/run.ts). */
  const yuvalar = useRef<KesimIstegi[]>([]);
  /* Üretilen blob adresleri; sökülürken bırakılıyor. Bırakılmazsa
     kesilen her parça sekmede kalıcı bellek tutar. */
  const bloblar = useRef<string[]>([]);
  useEffect(() => {
    const liste = bloblar.current;
    return () => liste.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const seciliParca = kolaj.parcalar.find((p) => p.id === secili) ?? null;
  const kesilebilir = kolaj.parcalar.filter((p) => !p.kesik && p.kaynak);

  function parcayiGuncelle(id: string, yama: Partial<Parca>) {
    setKolaj((k) => ({
      ...k,
      parcalar: k.parcalar.map((p) => (p.id === id ? { ...p, ...yama } : p)),
    }));
  }

  /* ---------------- Sürükleme ----------------
     Pointer yakalama şart: imleç parçadan çıksa bile olaylar gelmeye
     devam etmeli, yoksa hızlı sürüklemede parça imlecin altından
     kaçıyor ve sürükleme yarıda kopuyor. */
  function surukleBasla(olay: React.PointerEvent, parca: Parca) {
    const tuval = tuvalRef.current;
    if (!tuval) return;
    setSecili(parca.id);

    const kutu = tuval.getBoundingClientRect();
    const baslangicX = olay.clientX;
    const baslangicY = olay.clientY;
    const ilkX = parca.x;
    const ilkY = parca.y;
    const hedef = olay.currentTarget as HTMLElement;
    hedef.setPointerCapture(olay.pointerId);

    const hareket = (e: PointerEvent) => {
      parcayiGuncelle(parca.id, {
        x: sinirla(ilkX + (e.clientX - baslangicX) / kutu.width, 0, 1),
        y: sinirla(ilkY + (e.clientY - baslangicY) / kutu.height, 0, 1),
      });
    };
    const bitir = () => {
      hedef.releasePointerCapture(olay.pointerId);
      hedef.removeEventListener("pointermove", hareket);
      hedef.removeEventListener("pointerup", bitir);
      hedef.removeEventListener("pointercancel", bitir);
    };
    hedef.addEventListener("pointermove", hareket);
    hedef.addEventListener("pointerup", bitir);
    hedef.addEventListener("pointercancel", bitir);
  }

  /* Klavye sürüklemenin YERİNE geçiyor, süsü değil: fare olmadan
     parça yerleştirilemezse araç klavyeyle kullanılamaz. */
  function tusla(olay: React.KeyboardEvent, parca: Parca) {
    const adimBoyu = olay.shiftKey ? 0.05 : 0.01;
    const yon: Record<string, [number, number]> = {
      ArrowLeft: [-adimBoyu, 0],
      ArrowRight: [adimBoyu, 0],
      ArrowUp: [0, -adimBoyu],
      ArrowDown: [0, adimBoyu],
    };
    if (yon[olay.key]) {
      olay.preventDefault();
      const [dx, dy] = yon[olay.key];
      parcayiGuncelle(parca.id, {
        x: sinirla(parca.x + dx, 0, 1),
        y: sinirla(parca.y + dy, 0, 1),
      });
      return;
    }
    if (olay.key === "Delete" || olay.key === "Backspace") {
      olay.preventDefault();
      parcayiSil(parca.id);
    }
  }

  function parcayiSil(id: string) {
    setKolaj((k) => ({ ...k, parcalar: k.parcalar.filter((p) => p.id !== id) }));
    setSecili((s) => (s === id ? null : s));
  }

  function katmanTasi(id: string, yon: 1 | -1) {
    setKolaj((k) => {
      const dizi = [...k.parcalar];
      const i = dizi.findIndex((p) => p.id === id);
      const hedef = i + yon;
      if (i < 0 || hedef < 0 || hedef >= dizi.length) return k;
      [dizi[i], dizi[hedef]] = [dizi[hedef], dizi[i]];
      return { ...k, parcalar: dizi };
    });
  }

  /* ---------------- Kesim ---------------- */
  async function kes() {
    if (!kesilebilir.length) {
      setToast("Kesilecek parça yok.");
      return;
    }
    setKesiliyor(true);
    setAdim(null);
    yuvalar.current = kesilebilir.map((p) => ({
      parcaId: p.id,
      isId: p.kaynak!.isId,
      sira: p.kaynak!.sira,
    }));
    try {
      const r = await fetch("/api/kesim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          metin: kolaj.not,
          kareler: yuvalar.current.map((y) => ({ isId: y.isId, sira: y.sira })),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setToast(j.error ?? "Kesim başlatılamadı.");
        setKesiliyor(false);
        return;
      }
      setIsId(j.jobId as string);
    } catch {
      setToast("Bağlantı kurulamadı.");
      setKesiliyor(false);
    }
  }

  /* Dönen kareleri saydamlaştırıp parçalara yerleştirir.

     `dataUrl` YEDEĞİ OKUNMAK ZORUNDA. Koşucu kareyi kovaya yükleyemezse
     (5xx, 30 sn zaman aşımı, dolu kova) `imagePath` boş kalıyor ve
     baytlar `dataUrl` olarak iş kaydına yazılıyor — kare üretilmiş ve
     parası ödenmiş demektir. İlk yazımda yalnız `url` okunuyordu ve o
     kareler sessizce atılıyordu: kullanıcı "3 parça kesildi" görüyor,
     dördüncüsü sebepsiz kesilmemiş kalıyordu. Kardeş tüketici
     `ilham-akisi.tsx` zaten `url ?? dataUrl` yapıyor; ayrılan tek yer
     burasıydı. `macentayiAc` data URL'i sorunsuz açıyor (tuval
     kirlenmiyor). */
  const kareleriUygula = useCallback(
    async (kareler: { eksen: string; url?: string; dataUrl?: string }[]) => {
    let basarili = 0;
    for (const kare of kareler) {
      const yuva = Number(kare.eksen.split("-")[1]) - 1;
      const istek = yuvalar.current[yuva];
      const kaynak = kare.url ?? kare.dataUrl;
      if (!istek || !kaynak) continue;

      const saydam = await macentayiAc(kaynak);
      if (!saydam) {
        /* Anahtar açılamadıysa parça kesilmemiş kalıyor: macentalı
           kareyi tuvale koymak, hiç kesmemekten çok daha kötü. */
        console.error("kesim: macenta açılamadı", kare.eksen);
        continue;
      }
      bloblar.current.push(saydam);
      basarili += 1;
      setKolaj((k) => ({
        ...k,
        parcalar: k.parcalar.map((p) =>
          p.id === istek.parcaId ? { ...p, src: saydam, kesik: true } : p,
        ),
      }));
    }
    setToast(
      basarili
        ? `${basarili} parça kesildi.`
        : "Parçalar kesilemedi. Tekrar deneyin.",
    );
    },
    [],
  );

  useEffect(() => {
    if (!isId) return;
    let iptal = false;
    const basladi = Date.now();

    const tur = async () => {
      if (iptal) return;
      try {
        const r = await fetch(`/api/jobs/${isId}`, { cache: "no-store" });
        const j = await r.json();
        if (iptal) return;

        if (j.status === "completed") {
          await kareleriUygula(j.kareler ?? []);
          if (!iptal) {
            setKesiliyor(false);
            setIsId(null);
          }
          return;
        }
        if (j.status === "failed") {
          setToast(j.error ?? "Kesim tamamlanamadı.");
          setKesiliyor(false);
          setIsId(null);
          return;
        }
        setAdim(typeof j.step === "string" ? j.step : null);
      } catch {
        /* Ağ tökezlemesi işi bitirmez; sonraki turda tekrar denenir. */
      }
      if (Date.now() - basladi > YOKLAMA_TAVANI_MS) {
        if (!iptal) {
          setToast("Kesim beklenenden uzun sürdü.");
          setKesiliyor(false);
          setIsId(null);
        }
        return;
      }
      setTimeout(tur, YOKLAMA_MS);
    };

    void tur();
    return () => {
      iptal = true;
    };
  }, [isId, kareleriUygula]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-5 px-6 pt-8 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
        <div>
          <p className="eyebrow text-fog">Collage · Görsel</p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl">{kolaj.baslik || "Kolaj"}</h1>
        </div>
        <Button
          variant="solid"
          onClick={() => {
            setToast("Yazdırma penceresinde “PDF olarak kaydet”’i seçin.");
            setTimeout(() => window.print(), 400);
          }}
        >
          PDF olarak dışa aktar
        </Button>
      </header>

      <div className="mt-8 grid flex-1 gap-px border-t border-hair bg-hair lg:grid-cols-[300px_1fr]">
        <aside className="flex flex-col gap-8 bg-zemin px-6 py-8">
          <div className="flex flex-col gap-4">
            <Field label="Başlık" htmlFor="kj-baslik">
              <Input
                id="kj-baslik"
                value={kolaj.baslik}
                onChange={(e) => setKolaj((k) => ({ ...k, baslik: e.target.value }))}
              />
            </Field>
            <Field label="Not" htmlFor="kj-not">
              <Textarea
                id="kj-not"
                rows={3}
                value={kolaj.not}
                onChange={(e) => setKolaj((k) => ({ ...k, not: e.target.value }))}
              />
            </Field>
          </div>

          <div>
            <p className="eyebrow text-fog">Zemin</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ZEMINLER.map((z) => (
                <button
                  key={z}
                  type="button"
                  aria-label={`Zemin ${z}`}
                  aria-pressed={kolaj.zemin === z}
                  onClick={() => setKolaj((k) => ({ ...k, zemin: z }))}
                  className={cn(
                    "h-8 w-8 border transition-colors duration-200",
                    kolaj.zemin === z ? "border-odak" : "border-hair hover:border-fog",
                  )}
                  style={{ background: z }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="eyebrow text-fog">Kesim</p>
              <span className="eyebrow text-fog">
                {kolaj.parcalar.filter((p) => p.kesik).length}/{kolaj.parcalar.length}
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-fog">
              Kesim, parçayı arka planından ayırır; ancak o zaman iki siluet
              gerçekten üst üste biner. Her parça bir üretim demek.
            </p>
            <Button
              className="mt-4"
              onClick={kes}
              disabled={kesiliyor || !kesilebilir.length}
            >
              {kesiliyor
                ? adim?.startsWith("model-cagriliyor")
                  ? "Kesiliyor…"
                  : "Sıraya alındı…"
                : kesilebilir.length
                  ? `${kesilebilir.length} parçayı kes`
                  : kolaj.parcalar.length
                    ? "Hepsi kesildi"
                    : "Parça yok"}
            </Button>
          </div>

          {seciliParca && (
            <div>
              <p className="eyebrow text-fog">Seçili parça</p>

              <label className="mt-4 block text-[13px] text-fog" htmlFor="kj-olcek">
                Boyut
              </label>
              <input
                id="kj-olcek"
                type="range"
                min={EN_KUCUK * 100}
                max={EN_BUYUK * 100}
                value={Math.round(seciliParca.en * 100)}
                onChange={(e) =>
                  parcayiGuncelle(seciliParca.id, { en: Number(e.target.value) / 100 })
                }
                className="mt-2 w-full accent-kalem"
              />

              <label className="mt-4 block text-[13px] text-fog" htmlFor="kj-aci">
                Açı · {Math.round(seciliParca.aci)}°
              </label>
              <input
                id="kj-aci"
                type="range"
                min={-45}
                max={45}
                value={seciliParca.aci}
                onChange={(e) =>
                  parcayiGuncelle(seciliParca.id, { aci: Number(e.target.value) })
                }
                className="mt-2 w-full accent-kalem"
              />

              <div className="mt-5 flex flex-wrap gap-2">
                <KucukDugme onClick={() => katmanTasi(seciliParca.id, 1)}>Öne al</KucukDugme>
                <KucukDugme onClick={() => katmanTasi(seciliParca.id, -1)}>Arkaya at</KucukDugme>
                <KucukDugme onClick={() => parcayiSil(seciliParca.id)}>Kaldır</KucukDugme>
              </div>
            </div>
          )}
        </aside>

        <section className="flex flex-col gap-6 bg-zemin px-6 py-8 md:px-10">
          <div
            ref={tuvalRef}
            /* `tuval` / `koyu-ada`: token'lar SAYFA temasına değil SEÇİLEN
               ZEMİNE bağlanıyor. İkisi de yalnız token yeniden bağlıyor;
               satır içi `background` ikisinin de zeminini eziyor, yani
               tuval seçilen rengi göstermeye devam ediyor. Kazancı şu:
               içerideki `text-fog` ve `ring-odak` zemin koyulaşınca
               kendiliğinden dönüyor. */
            className={cn(
              "lookbook-tuval relative w-full max-w-3xl overflow-hidden border border-hair",
              zeminAcikMi(kolaj.zemin) ? "tuval" : "koyu-ada",
            )}
            style={{ aspectRatio: String(KOLAJ_ORANI), background: kolaj.zemin }}
            onPointerDown={(e) => {
              // Boşluğa tıklamak seçimi bırakıyor.
              if (e.target === e.currentTarget) setSecili(null);
            }}
          >
            {/* Tuval boşsa çıkmaz sokak: kolaj parçalarını kendisi
                üretmiyor, ana sayfadaki akıştan besleniyor. Bunu
                söylemeden boş bir dikdörtgen göstermek kullanıcıyı
                "bozuk mu?" diye bırakır. */}
            {!kolaj.parcalar.length && (
              <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-[14px] leading-7 text-fog">
                Tuval boş. Ana sayfada bir yön yazıp kare üretin; kolaj
                onlarla açılır.
              </p>
            )}

            {kolaj.parcalar.map((p) => (
              <button
                key={p.id}
                type="button"
                onPointerDown={(e) => surukleBasla(e, p)}
                onKeyDown={(e) => tusla(e, p)}
                onFocus={() => setSecili(p.id)}
                aria-label={`Parça${p.kesik ? " (kesilmiş)" : ""}`}
                className={cn(
                  "absolute block cursor-grab touch-none outline-none",
                  secili === p.id && "ring-1 ring-odak",
                )}
                style={{
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  width: `${p.en * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${p.aci}deg)`,
                }}
              >
                {/* next/image DEĞİL: kesilmiş parça blob adresinde ve
                    yüksekliği içeriğe göre değişiyor; `fill` sabit
                    kutu ister, kolajda kutu yok. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" draggable={false} className="block w-full select-none" />
              </button>
            ))}
          </div>

          <p className="max-w-[52ch] text-[13px] leading-6 text-fog">
            Parçayı sürükleyerek taşıyın. Klavyeyle: sekme ile seçin, ok
            tuşlarıyla taşıyın (Shift ile hızlı), Delete ile kaldırın.
          </p>
        </section>
      </div>

      {/* Baskı ağacı — lookbook ve moodboard ile AYNI altyapı. */}
      <div className="lookbook-baski-kok" aria-hidden>
        <div className="lookbook-sayfa">
          <KolajGovde kolaj={kolaj} />
        </div>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/** Baskı gövdesi — ekranla aynı yerleşim, düzenleme tutamakları olmadan. */
function KolajGovde({ kolaj }: { kolaj: Kolaj }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: kolaj.zemin }}>
      {kolaj.parcalar.map((p) => (
        <span
          key={p.id}
          className="absolute block"
          style={{
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: `${p.en * 100}%`,
            transform: `translate(-50%, -50%) rotate(${p.aci}deg)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt="" className="block w-full" />
        </span>
      ))}
    </div>
  );
}

function KucukDugme({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-hair px-3 py-1.5 text-[13px] text-fog transition-colors duration-200 hover:border-fog hover:text-kalem"
    >
      {children}
    </button>
  );
}

function sinirla(deger: number, alt: number, ust: number) {
  return Math.min(ust, Math.max(alt, deger));
}
