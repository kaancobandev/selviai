"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Hero, type Ipucu } from "@/components/hero";
import { Button } from "@/components/ui/button";
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

  /* PANEL — sonuçlar artık ana sayfaya EKLENMİYOR, üstünü kaplıyor.
     Eskiden hero'nun altına bir bölüm açılıyordu: her üretimde sayfa
     uzuyor ve önceki çıktılar orada kalıyordu. Gemini'nin yaptığı gibi
     tek bir çalışma penceresi daha doğru — ana sayfa boyutunu koruyor,
     çıktı birikmiyor ve çıkış yolu tek ve belli (sağ üstteki kapat). */
  const [acik, setAcik] = useState(false);
  /* Gönderilen brief AYRI tutuluyor: kullanıcı panel açıkken hero'daki
     metni değiştirebilir, ama pencerede üretimi başlatan istek yazmalı. */
  const [gonderilen, setGonderilen] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

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
      /* Doğrulama hatası da PENCEREYİ AÇIYOR. Hata metni yalnız pencerede
         render ediliyor; açmasaydık kullanıcı gönder'e basıp hiçbir şey
         olmadığını görürdü — sessiz başarısızlık, hatanın en kötü hâli.
         Hero'ya ayrı bir hata alanı eklemek de olurdu ama tasarımına
         dokunmamak yeğ. */
      setHata("Ne tasarlamak istediğinizi birkaç kelimeyle yazın.");
      setGonderilen(metin);
      setAcik(true);
      return;
    }
    setHata(null);
    setIlham(null);
    setSecili(null);
    setTuret(null);
    setTuretIs(null);

    const brief = ipucu ? `${metin} — ${IPUCU_YONELIM[ipucu]}` : metin;
    /* Pencere İSTEK GİDER GİTMEZ açılıyor, yanıt beklenmeden: kullanıcı
       gönderdiğini anında görmeli. Yanıtı bekleseydi arada bir saniye
       hiçbir şey olmamış gibi görünürdü. */
    setGonderilen(brief);
    setAcik(true);
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
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    }
  }

  /* Çalışma kaydı stüdyonun TEK bilgi kaynağı. İki kez yazılıyor:
     seçim anında (stüdyo hemen açılabilsin) ve türetme bitince
     (çıktılar da orada olsun). Hata yutuluyor — kaydın yazılamaması
     akışı durdurmamalı, yalnız stüdyo tohumsuz açılır. */
  const calismaKaydet = useCallback(
    async (sira: number, turetJob?: string) => {
      if (!ilhamIs) return;
      try {
        await fetch("/api/calisma", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ilhamIs,
            secilenSira: sira,
            turetIs: turetJob,
            brief: istek.trim(),
          }),
        });
      } catch {
        /* sessiz */
      }
    },
    [ilhamIs, istek],
  );

  /* Türetme bitince kaydı tazele: artık çıktıların işi de belli. */
  useEffect(() => {
    if (turet?.status === "completed" && turetIs && secili !== null) {
      void calismaKaydet(secili, turetIs);
    }
  }, [turet?.status, turetIs, secili, calismaKaydet]);

  async function sec(sira: number) {
    if (!ilhamIs || mesgul) return;
    setSecili(sira);
    setHata(null);
    setTuret({ status: "queued" });
    void calismaKaydet(sira);
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

  /**
   * Pencereyi kapatır ve akışı sıfırlar.
   *
   * İŞ KİMLİKLERİ TEMİZLENİYOR, çünkü yoklama döngüleri onlara bağlı —
   * temizlenmezse pencere kapalıyken arka planda dönmeye devam eder.
   *
   * SUNUCUDAKİ İŞ DURMUYOR. Kapatmak yalnız arayüzü bırakıyor; başlamış
   * bir üretim sunucuda tamamlanır ve parası zaten ödenmiştir. Bunun
   * görünür sonucu şu: hemen yeni bir üretim denenirse oturum kilidi
   * "Bir üretiminiz sürüyor" diyebilir (iş bitene ya da iki dakikalık
   * bekçi süresi dolana kadar). Bu, yanlış bir davranış değil — doğru
   * mesajla söylenen gerçek durum.
   */
  const kapat = useCallback(() => {
    setAcik(false);
    setIlhamIs(null);
    setIlham(null);
    setSecili(null);
    setTuretIs(null);
    setTuret(null);
    setHata(null);
    // Odak aşağıdaki etkide geri veriliyor, burada değil — gerekçesi orada.
  }, []);

  /* ODAK GERİ VERME BİR ETKİDE, `kapat` içinde DEĞİL.
     İlk yazımda `requestAnimationFrame` ile yapılıyordu ve iki yerden
     kırılıyordu: rAF gizli sekmede hiç çalışmıyor, ayrıca kare React
     commit'inden önce gelirse hero'daki alan hâlâ `disabled` oluyor
     (üretim sürerken öyle) ve `focus()` sessizce hiçbir şey yapmıyor.
     Etki commit'ten SONRA koşuyor: alan o noktada etkin ve odaklanabilir. */
  const oncekiAcik = useRef(false);
  useEffect(() => {
    if (oncekiAcik.current && !acik) {
      document.getElementById("hero-fikir")?.focus();
    }
    oncekiAcik.current = acik;
  }, [acik]);

  /* Pencere açıkken arka plan kaydırılmamalı ve Escape çıkış vermeli —
     tam ekranı kaplayan bir katmanda ikisi de beklenen davranış. */
  useEffect(() => {
    if (!acik) return;
    const eskiTasma = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tus = (olay: KeyboardEvent) => {
      if (olay.key === "Escape") kapat();
    };
    document.addEventListener("keydown", tus);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = eskiTasma;
      document.removeEventListener("keydown", tus);
    };
  }, [acik, kapat]);

  const ilhamKareler = ilham?.status === "completed" ? (ilham.kareler ?? []) : [];
  const turetKareler = turet?.status === "completed" ? (turet.kareler ?? []) : [];

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

      {acik && (
        /* Tam ekran çalışma penceresi. `z-[60]`: site başlığı `z-50`de
           duruyor ve pencerenin onun da üstünü kapatması gerekiyor,
           yoksa arkada yarı görünür bir şerit kalıyor. */
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Üretim penceresi"
          className="pencere-yazi fixed inset-0 z-[60] overflow-y-auto bg-zemin outline-none"
        >
          <button
            type="button"
            onClick={kapat}
            aria-label="Pencereyi kapat"
            className="fixed right-4 top-4 z-10 flex h-11 w-11 items-center justify-center border border-hair bg-zemin text-fog transition-colors duration-200 hover:border-fog hover:text-kalem md:right-6 md:top-6"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          <section
            id="ilham"
            aria-live="polite"
            className="px-5 py-20 md:px-10 md:py-24"
          >
          <div className="mx-auto max-w-6xl">
            {/* İSTEK BALONCUĞU — sohbet arayüzlerindeki gibi sağa yaslı.
                Önce büyük puntoyla, sola yaslı, başlık gibi duruyordu ve
                sayfanın konusuymuş gibi okunuyordu; oysa bu kullanıcının
                söylediği şey. Baloncuk onu bir konuşma balonu yapıyor:
                küçük, kenarda, ama bağlam olarak orada. */}
            <div className="flex justify-end">
              <p className="max-w-[52ch] rounded-2xl bg-kalem/[0.06] px-5 py-4 text-left text-[14px] leading-6 text-kalem">
                {gonderilen}
              </p>
            </div>

            {hata && (
              <p className="mt-8 border-l-2 border-vurgu pl-4 text-[15px] leading-7 text-kalem">
                {hata}
              </p>
            )}

            {/* BAŞLIK VE IZGARA YALNIZ İŞ VARKEN. Doğrulama hatasında da
                pencere açılıyor ve o durumda "Dört yorum. Birini seçin."
                deyip dört boş iskelet göstermek yalan olurdu: hiçbir
                üretim başlamadı. */}
            {ilhamIs && (
              <>
            {/* Vurgu rengi (lila) ve Bodoni burada YOK: pencere Archivo ile
                ve tek renkle yazılıyor. */}
            <h2 className="mt-14 max-w-[24ch] text-2xl font-medium leading-snug md:text-3xl">
              Dört yorum. <span className="text-fog">Birini seçin.</span>
            </h2>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-7 text-fog">
              Aynı fikir dört ayrı kapıdan: siluet, malzeme, renk ve bağlam.
              Seçtiğinizin üzerinden moodboard, kumaş ve marka çalışması üretilir.
            </p>

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
                    {/* EKSEN ADLARI (SİLÜET / MALZEME / RENK / BAĞLAM)
                        KALDIRILDI: kullanıcı için ayrım teknik bir detay,
                        karar ise görsele bakarak veriliyor.

                        SEÇİM İPUCU KALDI. Dördü de tıklanabilir ve akış
                        birini seçmeyi ZORUNLU kılıyor; hiçbir işaret
                        bırakmamak kareleri sıradan birer resim gibi
                        gösterir ve akış orada durur. Üretim sürerken de
                        bir satır kalıyor, yoksa kutuların altı boş
                        kalıp düzen zıplıyor. */}
                    <span className="flex items-center justify-end gap-3 px-4 py-3">
                      {kaynak ? (
                        <span
                          className={cn(
                            "eyebrow transition-opacity duration-200",
                            secili === i
                              ? "text-kalem opacity-100"
                              : "text-fog opacity-0 group-hover:opacity-100",
                          )}
                        >
                          {secili === i ? "Seçildi" : "Seç"}
                        </span>
                      ) : (
                        <span className="eyebrow text-fog">Üretiliyor</span>
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

                {/* Stüdyoya devir. Bağlantı ancak çalışma kaydı yazıldıktan
                    SONRA gösteriliyor; yoksa stüdyo tohumsuz açılır ve
                    kullanıcı "hiçbir şey aktarılmamış" sanır. */}
                {turetKareler.length > 0 && (
                  <div className="mt-12 flex flex-wrap items-center gap-4">
                    <Button href="/hizmetler/inspiration" variant="solid">
                      Stüdyoda aç
                    </Button>
                    <p className="text-[15px] leading-7 text-fog">
                      Seçtiğiniz kare ve üç çıktı stüdyodaki araçlara aktarıldı.
                    </p>
                  </div>
                )}
              </Reveal>
            )}
              </>
            )}
          </div>
          </section>
        </div>
      )}
    </>
  );
}
