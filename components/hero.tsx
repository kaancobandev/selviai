"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DotField } from "@/components/dot-field";
import { HAZIR_PROMPTLAR } from "@/lib/hazir-promptlar";
import { PromptAurora } from "@/components/prompt-aurora";
import { FlipText } from "@/components/ui/flip-text";
import { Arrow } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Hero — siyah zemin, sabit lila yıkama, imlece tepki veren nokta ızgarası ve
 * prompt kutusunun dönen ışık halkası.
 *
 * Katman sırası aşağıdan yukarı:
 *   1. siyah zemin
 *   2. sabit lila yıkama (animasyonsuz)
 *   3. nokta ızgarası (canvas, imleçle etkileşimli)
 *   4. okunurluk perdeleri
 *   5. içerik + prompt kutusu halkası
 *
 * Hero'da hareket eden TEK şey prompt kutusunun halkası. Zemin bilerek sabit:
 * hareketli bulanık kütleler şeklin kendisini yok ediyordu ve kutunun
 * backdrop-blur'ünü her karede yeniden hesaplatıyordu.
 */

/**
 * SEKTÖR ROZETİ — çip değil, etiket.
 *
 * Burada eskiden dört çip vardı (Koleksiyon / Ürün / Lookbook / Teknik
 * çizim) ve seçilen çip brief'e bir yönelim cümlesi ekliyordu. Dördü de
 * kaldırıldı: hepsi aynı kategorinin (moda) farklı girişleriydi ve akış
 * zaten `kategori: "moda"` gönderiyor, yani yönelim cümlesi isteğe
 * gerçek bir şey katmıyordu.
 *
 * Geriye kalan tek şey BİLGİ: bugün yalnız moda var. Otomotiv ve yat
 * sonra gelecek ve o zaman burası tekrar seçim olur. Seçenek tek olduğu
 * sürece tıklanabilir olmamalı — hiçbir şey yapmayan bir düğme, arayüzün
 * söyleyebileceği en sessiz yalan.
 */
const SEKTOR = "Moda";

const BASLIK = "Learn Create Sell";

/**
 * Prop'ların hepsi İSTEĞE BAĞLI ve verilmezse hero eski davranışını
 * sürdürüyor (metni stüdyoya taşıyan yönlendirme). Böylece akışı saran
 * bileşen formu devralabiliyor ama hero tek başına da çalışır durumda
 * kalıyor — testte ve ileride başka bir yerde kullanılırsa.
 *
 * `ipucu` / `onIpucu` KALDIRILDI: dört çip tek bir sektör rozetine
 * indi ve rozet seçim değil bilgi (bkz. SEKTOR). Yönelim cümlesini
 * brief'e ekleyen mekanizma da bu yüzden düştü.
 */
type HeroProps = {
  istek?: string;
  onIstek?: (v: string) => void;
  onGonder?: () => void;
  mesgul?: boolean;
};

export function Hero({ istek: disIstek, onIstek, onGonder, mesgul = false }: HeroProps = {}) {
  const router = useRouter();
  const [icIstek, setIcIstek] = useState("");
  /* Kontrollü/kontrolsüz ikilisi: dışarıdan değer geldiyse o, yoksa kendi
     state'i. React'in "controlled to uncontrolled" uyarısına düşmemek için
     dışarıdan gelen değer undefined olamaz. */
  const istek = disIstek ?? icIstek;
  const yazildi = onIstek ?? setIcIstek;

  const [listeAcik, setListeAcik] = useState(false);
  const listeRef = useRef<HTMLDivElement | null>(null);

  /* Liste dışarı tıklamayla ve Escape ile kapanıyor — açılır bir katmanın
     iki temel çıkışı. Dinleyici yalnız liste AÇIKKEN bağlanıyor; kapalıyken
     her tıklamayı dinlemenin bedeli var ve faydası yok.

     `pointerdown` seçildi, `click` değil: seçenek düğmesinin kendi tıklaması
     zaten listeyi kapatıyor ve `click` ile dinlense sıralama yarışırdı. */
  useEffect(() => {
    if (!listeAcik) return;
    const disari = (olay: PointerEvent) => {
      const hedef = olay.target as Node;
      if (listeRef.current && !listeRef.current.contains(hedef)) setListeAcik(false);
    };
    const tus = (olay: KeyboardEvent) => {
      if (olay.key === "Escape") setListeAcik(false);
    };
    document.addEventListener("pointerdown", disari);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", disari);
      document.removeEventListener("keydown", tus);
    };
  }, [listeAcik]);

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (mesgul) return;
    if (onGonder) {
      onGonder();
      return;
    }
    // Prop verilmediyse eski davranış: girdiyi stüdyoya taşı.
    const q = istek.trim();
    router.push(q ? `/hizmetler/kompozisyon?fikir=${encodeURIComponent(q)}` : "/hizmetler/kompozisyon");
  }

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-zemin text-kalem">
      {/* ── 2. katman: zemin yıkaması ve kavisler ─────────────────
          Kavisler hero'nun asıl hareketi: dev bir dairenin kenar bandı,
          maskeyle kesilmiş, yavaşça dönüyor. Zemin yıkaması altlarında
          sadece rengi tutuyor. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <div className="selvi-zemin absolute inset-0" />
        <div className="selvi-kavis selvi-kavis-2" />
        <div className="selvi-kavis selvi-kavis-1" />
      </div>

      {/* ── 3. katman: nokta ızgarası ─────────────────────────────── */}
      <DotField className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />

      {/* ── 4. katman: okunurluk perdesi ───────────────────────────
          Eskiden merkezde %94'e çıkıyordu; o zaman arkada parlak aurora
          kütleleri vardı. Artık zemin sabit ve sönük, ızgaranın da tam
          burada görünmesi gerekiyor — perde hafifletildi. */}
      <div
        aria-hidden
        className="selvi-perde pointer-events-none absolute inset-0 -z-10"
      />

      {/* ── 5. katman: içerik ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pt-24 text-center md:px-10 [@media(max-height:820px)]:pt-16">
        <h1 className="rise rise-2 mt-7 max-w-[14ch] [@media(max-height:820px)]:mt-4 font-sans font-medium text-[15vw] leading-[1.02] tracking-[-0.035em] sm:text-[11vw] md:text-[6.5rem] lg:text-[7.6rem]">
          {/* FlipText her harfi ayrı span'e koyuyor; ekran okuyucu bunu harf
              harf okuyabilir. Düz metni ayrıca veriyoruz, animasyonlu düğümü
              erişilebilirlik ağacından çıkarıyoruz. */}
          <span className="sr-only">{BASLIK}</span>
          <span aria-hidden="true">
            {/* loop varsayılan açık: harfler sürekli devriliyor (referanstaki gibi). */}
            <FlipText duration={2.2}>
              {BASLIK}
            </FlipText>
          </span>
        </h1>

        {/* Prompt kutusu — gerçek bir giriş kapısı, sahte demo değil */}
        <form
          onSubmit={gonder}
          className="selvi-kutu rise rise-3 mt-10 w-full max-w-2xl [@media(max-height:820px)]:mt-6 border border-kalem/10 bg-zemin/35 text-left shadow-[0_18px_48px_rgb(0_0_0/0.10)] backdrop-blur-xl"
        >
          <PromptAurora />
          {/* Konumlanmış kardeşler akış içeriğinden SONRA boyanır; içeriği kendi
              yığın seviyesine almazsak hâle metnin üstüne yayılır. */}
          <div className="relative z-10 p-4 md:p-5">
          <label htmlFor="hero-fikir" className="sr-only">
            Ne tasarlamak istiyorsun?
          </label>
          <input
            id="hero-fikir"
            value={istek}
            onChange={(e) => yazildi(e.target.value)}
            placeholder="Ne tasarlamak istiyorsun?"
            disabled={mesgul}
            className="w-full bg-transparent text-[15px] leading-7 text-kalem outline-none placeholder:text-kalem/45 disabled:opacity-60 md:text-base"
          />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {/* Rozet: seçim değil bilgi, o yüzden `span`. Bkz. SEKTOR. */}
            <span className="rounded-full border border-vurgu bg-vurgu px-3.5 py-1.5 text-[12px] text-vurgu-kalem">
              {SEKTOR}
            </span>

            {/* Liste ok düğmesinin SOLUNDA: gönder her zaman en sağda kalsın,
                yardım ondan önce gelsin. `ml-auto` ok düğmesinde duruyor. */}
            {/* Referans SARMALAYICIDA, panelde değil: dışarı tıklama kontrolü
                düğmeyi de kapsamalı, yoksa açıkken düğmeye basmak önce
                kapatıp sonra yeniden açardı. */}
            <div ref={listeRef} className="relative">
              <button
                type="button"
                onClick={() => setListeAcik((a) => !a)}
                aria-expanded={listeAcik}
                aria-haspopup="listbox"
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] transition-colors duration-200",
                  listeAcik
                    ? "border-kalem/35 text-kalem"
                    : "border-kalem/15 text-kalem/70 hover:border-kalem/35 hover:text-kalem",
                )}
              >
                Bana prompt ver
              </button>

              {listeAcik && (
                <div
                  role="listbox"
                  aria-label="Hazır promptlar"
                  /* Kutunun ÜSTÜNE açılıyor: prompt kutusu ekranın ortasında
                     ve altında yer yok; aşağı açılsa liste görünümden taşardı. */
                  className="absolute bottom-full left-0 z-20 mb-2 max-h-[min(60vh,420px)] w-[min(88vw,520px)] overflow-y-auto rounded-2xl border border-kalem/15 bg-zemin/95 p-1.5 shadow-[0_18px_48px_rgb(0_0_0/0.35)] backdrop-blur-xl"
                >
                  {HAZIR_PROMPTLAR.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        yazildi(p);
                        setListeAcik(false);
                      }}
                      className="block w-full rounded-xl px-3 py-2.5 text-left text-[13px] leading-6 text-kalem/75 transition-colors duration-150 hover:bg-kalem/[0.07] hover:text-kalem"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={mesgul}
              aria-label={onGonder ? "Tasarımı başlat" : "Stüdyoya git"}
              className="group ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-kalem text-zemin transition-colors duration-300 hover:bg-vurgu hover:text-vurgu-kalem disabled:opacity-50"
            >
              {mesgul ? (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent"
                />
              ) : (
                <Arrow className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-0.5" />
              )}
            </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Alt şerit ─────────────────────────────────────────────── */}
      <div className="rise rise-3 px-5 pb-9 md:px-10 md:pb-11 [@media(max-height:820px)]:pb-5">
        <div className="flex flex-col gap-6 border-t border-kalem/12 pt-6 sm:flex-row sm:items-start sm:justify-between [@media(max-height:820px)]:gap-4 [@media(max-height:820px)]:pt-4">
          {/* Sol taraftaki "Learn → Create → Sell" kaldırıldı: başlık artık
              aynı sözü söylüyordu. Tek kalan metni sağda tutmak için ml-auto,
              yoksa justify-between onu sola çekiyor. */}
          <p className="max-w-[36ch] text-[15px] leading-7 text-kalem/65 sm:ml-auto sm:text-right">
            Fashion is where we start. <span className="text-kalem">Design is where we go.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
