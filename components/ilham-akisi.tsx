"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Hero, type Ipucu } from "@/components/hero";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   İLHAM AKIŞI — hero'nun altında, ana sayfada.

   Akış: metin + çip → 4 ilham karesi → biri seçilir → seçilenden
   moodboard + kumaş + marka.

   NEDEN HERO'YU SARIYOR. `app/page.tsx` bir SUNUCU bileşeni; hero ise
   istemci. Sonuçların hero'nun formuyla aynı state'i paylaşması
   gerektiği için ikisi tek bir istemci ağacında buluşmak zorunda.
   Alternatif (state'i URL'e ya da sunucuya taşımak) her karede tur
   atardı ve üretim zaten oturum kaydında duruyor.

   ÇİP KATEGORİ DEĞİL YÖNELİM. Bugün tek kategori var ("moda"); dört
   çip aynı kategorinin farklı girişleri. Çip metnin YERİNE geçmiyor,
   brief'e yönelim olarak ekleniyor — kullanıcının yazdığı silinmemeli.
   ------------------------------------------------------------------ */

type Kare = { eksen: string; url?: string; dataUrl?: string };
type IsGorunum = {
  status: "queued" | "processing" | "completed" | "failed";
  step?: string;
  error?: string;
  kareler?: Kare[];
};

const EKSEN_ADI: Record<string, string> = {
  siluet: "Siluet",
  malzeme: "Malzeme",
  renk: "Renk",
  baglam: "Bağlam",
  moodboard: "Moodboard",
  kumas: "Kumaş",
  branding: "Marka",
};

/** Çipin brief'e kattığı yönelim. Metnin yerine geçmiyor, ekleniyor. */
const IPUCU_YONELIM: Record<Ipucu, string> = {
  Koleksiyon: "bir koleksiyon parçası olarak",
  "Ürün": "tek bir ürün olarak",
  Lookbook: "lookbook karesi olarak",
  "Teknik çizim": "teknik çizime dönüşecek netlikte",
};

const YOKLAMA_MS = 2500;
/** Bu süre sonunda yoklama bırakılır; sunucu tarafı zaten kendi bekçisini işletiyor. */
const YOKLAMA_TAVANI_MS = 4 * 60 * 1000;

export function IlhamAkisi() {
  const [istek, setIstek] = useState("");
  const [ipucu, setIpucu] = useState<Ipucu | null>(null);

  const [ilhamIs, setIlhamIs] = useState<string | null>(null);
  const [ilham, setIlham] = useState<IsGorunum | null>(null);
  const [secili, setSecili] = useState<number | null>(null);

  const [turetIs, setTuretIs] = useState<string | null>(null);
  const [turet, setTuret] = useState<IsGorunum | null>(null);

  const [hata, setHata] = useState<string | null>(null);
  const sonucRef = useRef<HTMLDivElement>(null);

  const mesgul =
    ilham?.status === "queued" ||
    ilham?.status === "processing" ||
    turet?.status === "queued" ||
    turet?.status === "processing";

  /* Tek bir yoklama döngüsü iki iş için de kullanılıyor. `iptal` bayrağı
     şart: bileşen sökülürse ya da yeni bir iş başlarsa eski döngü hâlâ
     state yazmaya çalışır ve React uyarı verir. */
  const yokla = useCallback(
    (jobId: string, yaz: (g: IsGorunum) => void) => {
      let iptal = false;
      const basladi = Date.now();

      const tur = async () => {
        if (iptal) return;
        try {
          const r = await fetch(`/api/jobs/${jobId}`);
          const j = (await r.json()) as IsGorunum & { error?: string };
          if (iptal) return;
          yaz(j);
          if (j.status === "completed" || j.status === "failed") return;
        } catch {
          /* Ağ tökezlemesi işi bitirmez; sonraki turda tekrar denenir. */
        }
        if (Date.now() - basladi > YOKLAMA_TAVANI_MS) {
          if (!iptal) setHata("Üretim beklenenden uzun sürdü. Sayfayı yenileyip tekrar deneyin.");
          return;
        }
        setTimeout(tur, YOKLAMA_MS);
      };

      void tur();
      return () => {
        iptal = true;
      };
    },
    [],
  );

  useEffect(() => {
    if (!ilhamIs) return;
    return yokla(ilhamIs, setIlham);
  }, [ilhamIs, yokla]);

  useEffect(() => {
    if (!turetIs) return;
    return yokla(turetIs, setTuret);
  }, [turetIs, yokla]);

  async function baslat() {
    const metin = istek.trim();
    if (metin.length < 3) {
      setHata("Ne tasarlamak istediğinizi birkaç kelimeyle yazın.");
      return;
    }
    setHata(null);
    setIlham(null);
    setSecili(null);
    setTuret(null);
    setTuretIs(null);

    const brief = ipucu ? `${metin} — ${IPUCU_YONELIM[ipucu]}` : metin;
    try {
      const r = await fetch("/api/ilham", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mod: "ilham", kategori: "moda", metin: brief, aspect: "4:5" }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Üretim başlatılamadı.");
        return;
      }
      setIlhamIs(j.jobId);
      setIlham({ status: "queued" });
      // Sonuç şeridi hero'nun altında; kullanıcı orada olduğunu görmeli.
      requestAnimationFrame(() =>
        sonucRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    }
  }

  async function sec(sira: number) {
    if (!ilhamIs || mesgul) return;
    setSecili(sira);
    setHata(null);
    setTuret({ status: "queued" });
    try {
      const r = await fetch("/api/ilham", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mod: "turetilmis",
          metin: istek.trim(),
          kaynakIs: ilhamIs,
          kaynakSira: sira,
          aspect: "1:1",
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Türetme başlatılamadı.");
        setTuret(null);
        return;
      }
      setTuretIs(j.jobId);
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
      setTuret(null);
    }
  }

  const ilhamKareler = ilham?.status === "completed" ? (ilham.kareler ?? []) : [];
  const turetKareler = turet?.status === "completed" ? (turet.kareler ?? []) : [];
  const gosterilecek = Boolean(ilhamIs || hata);

  return (
    <>
      <Hero
        istek={istek}
        onIstek={setIstek}
        ipucu={ipucu}
        onIpucu={setIpucu}
        onGonder={baslat}
        mesgul={mesgul}
      />

      {gosterilecek && (
        <section
          ref={sonucRef}
          id="ilham"
          aria-live="polite"
          className="scroll-mt-16 px-5 py-20 md:scroll-mt-20 md:px-10 md:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow text-fog">İlham</p>
            <h2 className="mt-6 max-w-[24ch] font-display text-4xl leading-[1.05] md:text-5xl">
              Dört yorum. <em className="text-vurgu">Birini seçin.</em>
            </h2>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-7 text-fog">
              Aynı fikir dört ayrı kapıdan: siluet, malzeme, renk ve bağlam.
              Seçtiğinizin üzerinden moodboard, kumaş ve marka çalışması üretilir.
            </p>

            {hata && (
              <p className="mt-8 border-l-2 border-vurgu pl-4 text-[15px] leading-7 text-kalem">
                {hata}
              </p>
            )}

            {/* ── Dört ilham karesi ── */}
            <div className="mt-10 grid gap-px bg-hair sm:grid-cols-2 lg:grid-cols-4">
              {(ilhamKareler.length ? ilhamKareler : Array.from({ length: 4 })).map((k, i) => {
                const kare = k as Kare | undefined;
                const kaynak = kare?.url ?? kare?.dataUrl;
                return (
                  <button
                    key={kare?.eksen ?? i}
                    type="button"
                    disabled={!kaynak || mesgul}
                    onClick={() => sec(i)}
                    aria-pressed={secili === i}
                    className={cn(
                      "group relative block bg-zemin text-left transition-opacity duration-300",
                      !kaynak && "pointer-events-none",
                      secili !== null && secili !== i && "opacity-45",
                    )}
                  >
                    <span className="relative block aspect-[4/5] overflow-hidden bg-hair">
                      {kaynak ? (
                        <Image
                          src={kaynak}
                          alt=""
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        /* İskelet: üretim sürerken kutunun yeri belli olsun,
                           yoksa şerit boş görünüp "bir şey olmadı" hissi veriyor. */
                        <span className="absolute inset-0 animate-pulse bg-kalem/[0.06]" />
                      )}
                      {secili === i && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 border-2 border-vurgu"
                        />
                      )}
                    </span>
                    <span className="flex items-center justify-between gap-3 p-4">
                      <span className="eyebrow text-fog">
                        {kare ? (EKSEN_ADI[kare.eksen] ?? kare.eksen) : "Üretiliyor"}
                      </span>
                      {kaynak && (
                        <span className="eyebrow text-vurgu opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          {secili === i ? "Seçildi" : "Seç"}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {ilham?.status === "failed" && (
              <p className="mt-6 text-[15px] leading-7 text-fog">
                {ilham.error ?? "Üretim tamamlanamadı."}
              </p>
            )}
            {mesgul && !ilhamKareler.length && (
              <p className="mt-6 eyebrow text-fog">{ilham?.step ?? "Kuyrukta"}</p>
            )}

            {/* ── Seçilenden türetilenler ── */}
            {(turet || turetKareler.length > 0) && (
              <Reveal className="mt-20">
                <p className="eyebrow text-fog">Seçilenden</p>
                <h3 className="mt-6 max-w-[24ch] font-display text-3xl leading-[1.08] md:text-4xl">
                  Moodboard, kumaş ve marka.
                </h3>

                <div className="mt-10 grid gap-px bg-hair sm:grid-cols-3">
                  {(turetKareler.length ? turetKareler : Array.from({ length: 3 })).map((k, i) => {
                    const kare = k as Kare | undefined;
                    const kaynak = kare?.url ?? kare?.dataUrl;
                    return (
                      <div key={kare?.eksen ?? i} className="bg-zemin">
                        <span className="relative block aspect-square overflow-hidden bg-hair">
                          {kaynak ? (
                            <Image
                              src={kaynak}
                              alt=""
                              fill
                              unoptimized
                              sizes="(min-width: 640px) 33vw, 100vw"
                              className="object-cover"
                            />
                          ) : (
                            <span className="absolute inset-0 animate-pulse bg-kalem/[0.06]" />
                          )}
                        </span>
                        <p className="eyebrow p-4 text-fog">
                          {kare ? (EKSEN_ADI[kare.eksen] ?? kare.eksen) : "Üretiliyor"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {turet?.status === "failed" && (
                  <p className="mt-6 text-[15px] leading-7 text-fog">
                    {turet.error ?? "Türetme tamamlanamadı."}
                  </p>
                )}
              </Reveal>
            )}
          </div>
        </section>
      )}
    </>
  );
}
