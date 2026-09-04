"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  EN_COK_CEKIM,
  ISIKLAR,
  KADRAJLAR,
  ORNEK_BASLIK,
  kaynakKareler,
  varsayilanCekimler,
  varsayilanKaynak,
  yeniCekim,
  type Cekim,
  type KaynakKare,
} from "@/lib/shoot";
import { ASPECTS, type Aspect, type Crop, type Lighting } from "@/lib/ai/types";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   SHOOTING — ÇEKİM LİSTESİ

   Her satır ÜRETİLECEK bir kare: kaynak giysiden, bir kadrajla ve bir
   ışık senaryosuyla. Çekim organize edilmiyor, üretiliyor — masanın
   ekip/lokasyon/call sheet kısmının neden silindiği lib/shoot.ts
   başında.

   KAYNAK KARE LİSTENİN TAMAMINA AİT, satıra değil. Uç tek bir referans
   alıyor (`kaynak: {isId, sira}`) ve bütün satırlar onunla üretiliyor;
   satır başına ayrı kaynak, satır başına ayrı iş demekti ve oturumda
   tek iş kilidi var (ikinci istek 429). Zaten doğru varsayılan da tek:
   akışta giysiyi gösteren tek kare siluet.

   YÜKLEME YOK. Kompozisyon ucu (`/api/compose`) üç görsel yüklenmesini
   şart koşuyor ve tohumda kişi fotoğrafı yok; her satır için dosya
   istemek de tam olarak kaldırılmak istenen efor. Bunun yerine
   türetme ve kesimdeki yerleşik desen: tek referans + metin.
   ------------------------------------------------------------------ */

const YOKLAMA_MS = 2000;
/** Bu süre sonunda yoklama bırakılır; sunucu tarafı kendi bekçisini işletiyor. */
const YOKLAMA_TAVANI_MS = 4 * 60 * 1000;

export function CekimListesi({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const kareler = useMemo(() => kaynakKareler(tohum), [tohum]);

  const [cekimler, setCekimler] = useState<Cekim[]>(varsayilanCekimler);
  const [kaynak, setKaynak] = useState<KaynakKare | null>(() =>
    varsayilanKaynak(kareler, tohum?.secilen),
  );
  const [not, setNot] = useState(tohum?.brief ?? "");
  const [aspect, setAspect] = useState<Aspect>("4:5");

  const [isId, setIsId] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [adim, setAdim] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* Hangi yuvanın hangi SATIRA ait olduğu. Yuva adı sunucuda istek
     sırasına göre sabitleniyor (bkz. lib/ai/run.ts); satır kimliğini
     burada saklamak, iş sürerken liste değişse bile eşleşmeyi
     bozmuyor. */
  const yuvalar = useRef<string[]>([]);

  const baslik = tohum?.brief.trim() || ORNEK_BASLIK;
  const dolu = cekimler.length >= EN_COK_CEKIM;
  /* CSS `aspect-ratio` "3 / 4" istiyor, motor "3:4" konuşuyor. */
  const oranCss = aspect.replace(":", " / ");

  /* ---------------- liste düzenleme ---------------- */
  function guncelle(id: string, yama: Partial<Cekim>) {
    setCekimler((l) => l.map((c) => (c.id === id ? { ...c, ...yama } : c)));
  }

  function ekle() {
    if (dolu) return;
    setCekimler((l) => [...l, yeniCekim()]);
  }

  function kaldir(id: string) {
    setCekimler((l) => l.filter((c) => c.id !== id));
  }

  function tasi(id: string, yon: 1 | -1) {
    setCekimler((l) => {
      const dizi = [...l];
      const i = dizi.findIndex((c) => c.id === id);
      const hedef = i + yon;
      if (i < 0 || hedef < 0 || hedef >= dizi.length) return l;
      [dizi[i], dizi[hedef]] = [dizi[hedef], dizi[i]];
      return dizi;
    });
  }

  /* ---------------- üretim ---------------- */
  async function uret() {
    if (!kaynak) {
      setToast("Çekilecek bir kaynak kare yok.");
      return;
    }
    if (!cekimler.length) {
      setToast("Listede çekim yok.");
      return;
    }
    setCalisiyor(true);
    setAdim(null);
    yuvalar.current = cekimler.map((c) => c.id);
    // Önceki turdan kalan "gelmedi" işaretleri temizleniyor; sonuçlar duruyor.
    setCekimler((l) => l.map((c) => ({ ...c, basarisiz: false })));

    try {
      const r = await fetch("/api/cekim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kaynak: { isId: kaynak.isId, sira: kaynak.sira },
          metin: not,
          aspect,
          kareler: cekimler.map((c) => ({ crop: c.kadraj, lighting: c.isik })),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setToast(j.error ?? "Çekim başlatılamadı.");
        setCalisiyor(false);
        return;
      }
      setIsId(j.jobId as string);
    } catch {
      setToast("Bağlantı kurulamadı.");
      setCalisiyor(false);
    }
  }

  /* Dönen kareleri satırlara yerleştirir.

     EŞLEŞME DİZİ SIRASIYLA DEĞİL YUVA ADIYLA. Bir kare üretilemezse iş
     onu atlayıp diğerlerini döndürüyor; sırayla eşleştirilseydi aradan
     düşen tek kare sonrakilerin hepsini bir satır kaydırırdı ve
     kullanıcı istemediği kadrajı istediği sanırdı.

     `dataUrl` YEDEĞİ OKUNMAK ZORUNDA. Koşucu kareyi kovaya yükleyemezse
     (5xx, zaman aşımı, dolu kova) `url` boş kalıyor ve baytlar
     `dataUrl` olarak geliyor — kare üretilmiş ve parası ödenmiş
     demektir. Kolaj aracında yalnız `url` okunuyordu ve o kareler
     sessizce atılıyordu; aynı hata burada tekrarlanmasın. */
  const kareleriUygula = useCallback(
    (gelenler: { eksen: string; url?: string; dataUrl?: string }[]) => {
      const gelen = new Map<string, string>();
      for (const kare of gelenler) {
        const yuva = Number(kare.eksen.split("-")[1]) - 1;
        const satirId = yuvalar.current[yuva];
        const adres = kare.url ?? kare.dataUrl;
        if (!satirId || !adres) continue;
        gelen.set(satirId, adres);
      }

      setCekimler((l) =>
        l.map((c) => {
          // İş sürerken eklenen satır bu turda istenmemişti; dokunulmuyor.
          if (!yuvalar.current.includes(c.id)) return c;
          const adres = gelen.get(c.id);
          return adres ? { ...c, sonuc: adres, basarisiz: false } : { ...c, basarisiz: true };
        }),
      );

      setToast(
        gelen.size
          ? `${gelen.size} kare çekildi.`
          : "Kareler çekilemedi. Tekrar deneyin.",
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
          kareleriUygula(j.kareler ?? []);
          setCalisiyor(false);
          setIsId(null);
          return;
        }
        if (j.status === "failed") {
          setToast(j.error ?? "Çekim tamamlanamadı.");
          setCalisiyor(false);
          setIsId(null);
          return;
        }
        setAdim(typeof j.step === "string" ? j.step : null);
      } catch {
        /* Ağ tökezlemesi işi bitirmez; sonraki turda tekrar denenir. */
      }
      if (Date.now() - basladi > YOKLAMA_TAVANI_MS) {
        if (!iptal) {
          setToast("Çekim beklenenden uzun sürdü.");
          setCalisiyor(false);
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

  const dugmeMetni = calisiyor
    ? adim?.startsWith("model-cagriliyor")
      ? "Çekiliyor…"
      : "Sıraya alındı…"
    : cekimler.length
      ? `${cekimler.length} kare üret`
      : "Liste boş";

  return (
    <div className="flex flex-1 flex-col bg-zemin px-6 pb-24 pt-8 md:px-10 md:pt-10 lg:px-12">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-fog">Shooting · Çekim listesi</p>
          <h1 className="mt-3 max-w-[24ch] font-display text-2xl leading-tight md:text-3xl">
            {baslik} — çekim listesi
          </h1>
        </div>
        <span className="eyebrow tabular-nums text-fog">
          {cekimler.length}/{EN_COK_CEKIM} çekim
        </span>
      </header>

      <div className="mt-14 min-w-0 space-y-16">
        {/* A — Neyi çekiyoruz */}
        <Section title="Kaynak kare" meta={kaynak ? kaynak.ad : "Yok"}>
          {kareler.length ? (
            <>
              <p className="max-w-[58ch] text-[13px] leading-6 text-fog">
                Liste bu kareden üretiliyor. Türetilenler arasında giysiyi
                gösteren tek kare <span className="text-kalem">siluet</span>;
                varsayılan da o.
              </p>
              <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
                {kareler.map((k) => {
                  const aktif = kaynak?.url === k.url;
                  return (
                    <button
                      key={k.url}
                      type="button"
                      aria-pressed={aktif}
                      disabled={calisiyor}
                      onClick={() => setKaynak(k)}
                      className={cn(
                        "shrink-0 text-left transition-opacity duration-300 disabled:cursor-not-allowed",
                        aktif ? "opacity-100" : "opacity-55 hover:opacity-100",
                      )}
                    >
                      <span
                        className={cn(
                          "relative block h-28 w-24 overflow-hidden bg-hair",
                          aktif && "ring-1 ring-odak",
                        )}
                      >
                        {/* unoptimized: kareler özel kovadan kendi ucumuzdan
                            geliyor, iyileştiriciden geçirmenin faydası yok. */}
                        <Image src={k.url} alt={k.ad} fill unoptimized sizes="96px" className="object-cover" />
                      </span>
                      <span className="eyebrow mt-2 block text-fog">
                        {k.ad}
                        {k.siluet && " · giysi"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Tohumsuz açılış — araç çalışır ama çekecek bir şey yok.
               Boş bir ızgara göstermek "bozuk mu?" sorusu doğurur. */
            <div className="border border-dashed border-kalem/30 px-5 py-6">
              <p className="max-w-[58ch] text-[13px] leading-6 text-fog">
                Çekim listesinin kendi kaynağı yok: kareler ana sayfada
                tasarladığınız giysiden üretiliyor. Önce bir yön yazıp ilham
                karelerinden birini seçin; türetilenler arasındaki{" "}
                <span className="text-kalem">siluet</span> giysiyi gösteren tek
                karedir ve liste onu çeker. Aşağıdaki listeyi şimdiden
                kurabilirsiniz.
              </p>
              <Button href="/" variant="ghost" className="mt-6">
                Ana sayfada üretin
              </Button>
            </div>
          )}

          <div className="mt-10 grid gap-x-8 gap-y-6 md:grid-cols-[180px_1fr]">
            <Field label="Kare oranı" htmlFor="ck-oran">
              <Select
                id="ck-oran"
                value={aspect}
                disabled={calisiyor}
                onChange={(e) => setAspect(e.target.value as Aspect)}
              >
                {ASPECTS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
            {/* Not SATIRA DEĞİL LİSTEYE ait: uç tek bir metin taşıyor ve o
                metin bütün karelerin prompt'una ekleniyor. */}
            <Field label="Not" htmlFor="ck-not" hint="Bütün satırlara ekleniyor.">
              <Textarea
                id="ck-not"
                rows={2}
                value={not}
                disabled={calisiyor}
                onChange={(e) => setNot(e.target.value)}
                placeholder="Örn. nötr gri zemin, gölge yumuşak"
              />
            </Field>
          </div>
        </Section>

        {/* B — Çekilecek kareler */}
        <Section title="Çekimler" meta={`${cekimler.length}/${EN_COK_CEKIM} satır`}>
          <ul className="border-t border-hair">
            {cekimler.map((c, i) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start gap-x-5 gap-y-4 border-b border-hair py-5"
              >
                <span className="eyebrow w-6 shrink-0 pt-1 tabular-nums text-fog">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span
                  className="relative block w-20 shrink-0 overflow-hidden bg-hair"
                  style={{ aspectRatio: oranCss }}
                >
                  {c.sonuc ? (
                    <Image src={c.sonuc} alt="" fill unoptimized sizes="80px" className="object-cover" />
                  ) : calisiyor ? (
                    <span className="absolute inset-0 animate-pulse bg-kalem/[0.06]" />
                  ) : c.basarisiz ? (
                    <span className="eyebrow absolute inset-0 flex items-center justify-center text-fog">
                      Gelmedi
                    </span>
                  ) : null}
                </span>

                <div className="grid min-w-[240px] flex-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Field label="Kadraj" htmlFor={`kadraj-${c.id}`} hint={kadrajNotu(c.kadraj)}>
                    <Select
                      id={`kadraj-${c.id}`}
                      value={c.kadraj}
                      disabled={calisiyor}
                      onChange={(e) => guncelle(c.id, { kadraj: e.target.value as Crop })}
                    >
                      {KADRAJLAR.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.ad}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Işık"
                    htmlFor={`isik-${c.id}`}
                    trailing={isik(c.isik).kelvin}
                    hint={isik(c.isik).not}
                  >
                    <Select
                      id={`isik-${c.id}`}
                      value={c.isik}
                      disabled={calisiyor}
                      onChange={(e) => guncelle(c.id, { isik: e.target.value as Lighting })}
                    >
                      {ISIKLAR.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.ad}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="flex shrink-0 gap-1 pt-1">
                  <SatirDugme
                    label={`${i + 1}. çekimi yukarı taşı`}
                    disabled={calisiyor || i === 0}
                    onClick={() => tasi(c.id, -1)}
                  >
                    <Yon />
                  </SatirDugme>
                  <SatirDugme
                    label={`${i + 1}. çekimi aşağı taşı`}
                    disabled={calisiyor || i === cekimler.length - 1}
                    onClick={() => tasi(c.id, 1)}
                  >
                    <Yon asagi />
                  </SatirDugme>
                  <SatirDugme
                    label={`${i + 1}. çekimi kaldır`}
                    disabled={calisiyor}
                    onClick={() => kaldir(c.id)}
                  >
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </SatirDugme>
                </div>
              </li>
            ))}

            {!cekimler.length && (
              <li className="border-b border-hair py-10 text-center text-[13px] leading-6 text-fog">
                Liste boş. Bir çekim ekleyin.
              </li>
            )}
          </ul>

          <button
            type="button"
            onClick={ekle}
            disabled={dolu || calisiyor}
            className="mt-5 border border-dashed border-kalem/30 px-4 py-2.5 text-[13px] text-fog transition-colors duration-300 hover:border-kalem hover:text-kalem disabled:pointer-events-none disabled:opacity-40"
          >
            + Çekim ekle
          </button>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-hair pt-8">
            <Button onClick={uret} disabled={calisiyor || !cekimler.length || !kaynak}>
              {dugmeMetni}
            </Button>
            {/* Maliyet dürüst yazılıyor: düğme kaç kare üretileceğini
                söylüyor, satır sayısı da işin fiyatı. */}
            <p className="max-w-[46ch] text-[13px] leading-6 text-fog">
              Her satır bir üretim demek. Liste tek işte çekiliyor; sonuçlar
              kendi satırlarına düşüyor.
            </p>
          </div>
        </Section>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function kadrajNotu(id: Crop) {
  return KADRAJLAR.find((k) => k.id === id)?.not ?? "";
}

function isik(id: Lighting) {
  return ISIKLAR.find((o) => o.id === id) ?? ISIKLAR[0];
}

function Yon({ asagi }: { asagi?: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={cn("h-2.5 w-2.5", asagi && "rotate-180")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M2 8l4-4 4 4" />
    </svg>
  );
}

function SatirDugme({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center border border-hair text-fog transition-colors duration-200 hover:border-fog hover:text-kalem disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

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
