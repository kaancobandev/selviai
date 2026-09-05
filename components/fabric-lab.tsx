"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { DOKUMALAR, fabrics, tohumdanKumas, type Fabric, type Weave } from "@/lib/fabrics";
import { cn, formatTRY } from "@/lib/utils";
import { TohumReferans, referanslar } from "@/components/tohum-referans";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { Arrow, Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { site } from "@/lib/site";

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

/* null = ÖLÇÜLMEDİ, sıfır değil. Kaydırıcı da bunu sayı yerine
   "Ölçülmedi" diye yazıyor; ortalama bir sayı koymak ölçülmemiş değeri
   ölçülmüş gibi göstermek olurdu. */
type Spec = { weight: number | null; stretch: number | null; drape: number | null };
const BOS_SPEC: Spec = { weight: null, stretch: null, drape: null };
const specOf = (f: Fabric): Spec => ({ weight: f.weight, stretch: f.stretch, drape: f.drape });

/** Üretilen kare için kullanıcının elle girdiği alanlar. */
type Olcum = { composition: string; weave: Weave | ""; width: string; price: string };
const BOS_OLCUM: Olcum = { composition: "", weave: "", width: "", price: "" };

const KUMAS_ANAHTARI = "selvi-kumas-v1";

/**
 * Tarayıcıya yazılan durum.
 *
 * Kullanıcının elle girdiği ölçüm, seçtiği kartela ve istediği metraj —
 * yani bu sayfada üretilen TEK şey. Eskiden hiçbiri saklanmıyordu ve
 * panelde "Kaydedilmiyor" yazıyordu; yazı dürüsttü ama davranış yanlıştı.
 * Kod da bunu biliyordu: "kalıcılık ayrı bir karar ve sahibi henüz
 * vermedi."
 *
 * `uretilenSpec` de giriyor çünkü o da kullanıcının girdiği bir ölçüm;
 * `katalogSpec` girmiyor çünkü onun kaynağı kartelanın kendi verisi ve
 * kumaş değişince zaten oradan tazeleniyor.
 */
type KumasKayit = { olcum: Olcum; kartela: string[]; length: string; uretilenSpec: Spec };
const VARSAYILAN_KUMAS: KumasKayit = { olcum: BOS_OLCUM, kartela: [], length: "3", uretilenSpec: BOS_SPEC };

/** Boş ya da anlamsız giriş "ölçülmedi" demek — 0 demek değil. */
function pozitif(metin: string): number | null {
  const v = parseFloat(metin.replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : null;
}


/**
 * Kumaş — dijital kartela ve ölçüm laboratuvarı.
 * Üstte yatay kaydırılan makro doku kütüphanesi; altta seçili kumaşın cetvelli
 * büyük görseli (tıkla: yakınlaştır) ve metraj / fiziksel özellik paneli.
 */
export function FabricLab({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  /* Üretilen kare kütüphanenin BAŞINA giriyor ve açılışta seçili
     geliyor: kullanıcı ana sayfadaki akıştan buraya onun için geliyor.
     Tohum yoksa eski varsayılan (keten) aynen duruyor. */
  const uretilen = tohum ? tohumdanKumas(tohum) : null;
  const kutuphane = uretilen ? [uretilen, ...fabrics] : fabrics;

  const [activeId, setActiveId] = useState((uretilen ?? fabrics[1]).id);
  const active = kutuphane.find((f) => f.id === activeId) ?? fabrics[0];

  /* İki ayrı ölçüm durumu. Katalog kumaşında seçim değişince spec
     kumaşın kendi değerlerine dönüyor — kayıp yok, değerler kayıtta
     duruyor. Üretilen karede dönemez: oradaki tek kaynak kullanıcının
     kendi girdiği ölçüm ve kütüphanede gezinirken silinmemeli. */
  const [katalogSpec, setKatalogSpec] = useState<Spec>(() => specOf(fabrics[1]));
  const [uretilenSpec, setUretilenSpec] = useState<Spec>(VARSAYILAN_KUMAS.uretilenSpec);
  const spec = active.uretilen ? uretilenSpec : katalogSpec;
  const setSpec = active.uretilen ? setUretilenSpec : setKatalogSpec;

  const [olcum, setOlcum] = useState<Olcum>(VARSAYILAN_KUMAS.olcum);
  const [length, setLength] = useState(VARSAYILAN_KUMAS.length);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [kartela, setKartela] = useState<string[]>(VARSAYILAN_KUMAS.kartela);
  const [toast, setToast] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  function select(f: Fabric) {
    setActiveId(f.id);
    if (!f.uretilen) setKatalogSpec(specOf(f));
    setZoom(false);
  }

  function scrollLibrary(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 380, behavior: "smooth" });
  }

  function onMacroMove(e: ReactMouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  const meters = Math.max(0, parseFloat(length.replace(",", ".")) || 0);

  /* Üretilen karede en, fiyat, kompozisyon ve dokuma kullanıcıdan
     geliyor; girilmediyse null kalıyor ve metraj kutuları sayı
     BASMIYOR. "0 m²" ya da "₺0" ölçülmemiş değeri ölçülmüş gibi
     gösterirdi. */
  const width = active.uretilen ? pozitif(olcum.width) : active.width;
  const price = active.uretilen ? pozitif(olcum.price) : active.price;
  const kompozisyon = active.uretilen ? olcum.composition.trim() || null : active.composition;
  const dokuma = active.uretilen ? olcum.weave || null : active.weave;

  const area = width !== null ? (width / 100) * meters : null;
  const grams = area !== null && spec.weight !== null ? area * spec.weight : null;
  const cost = price !== null ? meters * price : null;
  const inKartela = kartela.includes(active.id);
  const specChanged =
    spec.weight !== active.weight || spec.stretch !== active.stretch || spec.drape !== active.drape;

  /* ---------- kayıt ---------- */
  const kumasDurumu: KumasKayit = { olcum, kartela, length, uretilenSpec };
  /* "İş var mı" sorusu duruma bakıyor, etkilerin kaç kez çalıştığına
     değil — branding'de zamanlamaya dayalı ölçüt StrictMode'un çift
     çalıştırması yüzünden yanlış cevap vermişti. */
  const isVar = JSON.stringify(kumasDurumu) !== JSON.stringify(VARSAYILAN_KUMAS);

  const hazirRef = useRef(false);
  useEffect(() => {
    try {
      const ham = window.localStorage.getItem(KUMAS_ANAHTARI);
      if (ham) {
        const k = JSON.parse(ham) as Partial<KumasKayit>;
        /* eslint-disable-next-line react-hooks/set-state-in-effect --
           Tek seferlik geri yükleme; `useState` başlatıcısında okumak
           sunucuda `localStorage` olmadığı için hidrasyon uyuşmazlığı
           verirdi. Aynı gerekçe flat-sketch ve brand-studio'da da yazılı. */
        if (k.olcum) setOlcum({ ...BOS_OLCUM, ...k.olcum });
        if (Array.isArray(k.kartela)) setKartela(k.kartela);
        if (typeof k.length === "string") setLength(k.length);
        if (k.uretilenSpec) setUretilenSpec({ ...BOS_SPEC, ...k.uretilenSpec });
      }
    } catch {
      /* Gizli sekmede erişimin kendisi fırlatıyor. */
    }
    hazirRef.current = true;
  }, []);

  useEffect(() => {
    if (!hazirRef.current) return;
    const zaman = window.setTimeout(() => {
      try {
        window.localStorage.setItem(KUMAS_ANAHTARI, JSON.stringify({ olcum, kartela, length, uretilenSpec }));
      } catch {
        /* Kota dolu ya da depolama kapalı. */
      }
    }, 400);
    return () => window.clearTimeout(zaman);
  }, [olcum, kartela, length, uretilenSpec]);

  /* ---------- kartela çıktısı ----------

     Kartelanın işi tedarikçiye gitmek: hangi kumaş, ne kadar, kaç para.
     Ekranda hesaplanıyordu ama hiçbir yere çıkmıyordu.

     ÖLÇÜLMEMİŞ ALAN BOŞ GİDİYOR, sıfır değil. Ürünün bu sayfadaki bütün
     disiplini buna dayanıyor; CSV'de 0 yazmak, üretilen karenin
     bilinmeyen gramajını "sıfır gram" diye tedarikçiye göndermek olurdu. */
  function kartelaCsv() {
    const secilenler = kutuphane.filter((f) => kartela.includes(f.id));
    const say = (v: number | null) => (v === null ? "" : String(v));
    const basliklar = ["Kumaş", "Kompozisyon", "Dokuma", "Gramaj (g/m2)", "Esneme (%)", "Döküm", "En (cm)", "Fiyat (TRY/m)", "Metraj (m)", "Tutar (TRY)"];
    const satirlar = secilenler.map((f) => {
      const kendiSpec = f.uretilen ? uretilenSpec : specOf(f);
      const en = f.uretilen ? pozitif(olcum.width) : f.width;
      const fiyat = f.uretilen ? pozitif(olcum.price) : f.price;
      const komp = f.uretilen ? olcum.composition.trim() || null : f.composition;
      const dok = f.uretilen ? olcum.weave || null : f.weave;
      return [
        f.name,
        komp ?? "",
        dok ?? "",
        say(kendiSpec.weight),
        say(kendiSpec.stretch),
        say(kendiSpec.drape),
        say(en),
        fiyat === null ? "" : fiyat.toFixed(2),
        String(meters),
        fiyat === null ? "" : (fiyat * meters).toFixed(2),
      ];
    });
    const kacir = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const govde = [basliklar, ...satirlar].map((r) => r.map(kacir).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + govde], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kumas-kartelasi.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const eksik = satirlar.filter((r) => r.includes("")).length;
    setToast(
      eksik
        ? `CSV indirildi — ${satirlar.length} kumaş, ${eksik} satırda ölçülmemiş alan boş bırakıldı`
        : `CSV indirildi — ${satirlar.length} kumaş`,
    );
  }

  function toggleKartela() {
    if (inKartela) {
      setKartela((k) => k.filter((id) => id !== active.id));
      setToast(`Karteladan çıkarıldı: ${active.name}`);
    } else {
      setKartela((k) => [...k, active.id]);
      setToast(`Kartelaya eklendi: ${active.name}`);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Üretilen kumaş karesi artık kütüphanede SEÇİLEBİLİR bir kayıt;
          şeritte ikinci kez göstermek aynı görsele iki farklı davranış
          vermek olurdu. Seçilen ilham karesi kalıyor: kumaşın hangi
          tasarımdan türediğini yalnız o söylüyor. */}
      <TohumReferans
        baslik="Ana sayfadaki tasarımınız"
        gorseller={referanslar(tohum, "kumas", "Kumaş").filter((g) => g.src !== uretilen?.image)}
      />
      {/* Başlık */}
      <header className="flex flex-col gap-5 px-6 pt-8 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
        <div>
          <p className="eyebrow text-fog">Kumaş · Dijital kartela</p>
          <h1 className="mt-3 font-display text-2xl leading-none md:text-3xl">Kumaş kütüphanesi</h1>
        </div>
        <div className="flex items-center gap-6">
          <span className="eyebrow tabular-nums text-fog">
            {fabrics.length} kumaş{uretilen ? " · 1 üretilen" : ""} · Kartela ({kartela.length})
          </span>
          {/* Kayıt göstergesi BAŞLIKTA, ölçüm panelinde değil. Panel yalnız
              üretilen kare seçiliyken açılıyor; oysa kaydedilen asıl iş
              kartelanın kendisi ve tohumsuz gelen kullanıcı göstergeyi
              hiç görmüyordu. */}
          <span className="hidden eyebrow text-fog sm:inline">
            {isVar ? "Bu tarayıcıya kaydedildi" : "Taslak"}
          </span>
          <button
            type="button"
            onClick={kartelaCsv}
            disabled={kartela.length === 0}
            className="eyebrow u-line disabled:opacity-40"
          >
            Kartelayı indir · CSV
          </button>
          <div className="hidden items-center gap-1.5 md:flex">
            <ScrollButton label="Kütüphaneyi geri kaydır" onClick={() => scrollLibrary(-1)} back />
            <ScrollButton label="Kütüphaneyi ileri kaydır" onClick={() => scrollLibrary(1)} />
          </div>
        </div>
      </header>

      {/* Kütüphane — yatay kaydırma */}
      <div
        ref={scroller}
        className="mt-6 flex snap-x gap-5 overflow-x-auto px-6 pb-7 pt-1 scroll-px-6 [scrollbar-width:none] md:px-10 md:scroll-px-10 [&::-webkit-scrollbar]:hidden"
      >
        {kutuphane.map((f) => {
          const isActive = f.id === activeId;
          const marked = kartela.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => select(f)}
              aria-pressed={isActive}
              className="group w-[148px] shrink-0 snap-start text-left md:w-[168px]"
            >
              <span className="relative block">
                <span className="relative block aspect-square overflow-hidden bg-hair">
                  {/* unoptimized: üretilen kare kendi ucumuzdan
                      (/api/kare) geliyor, Next'in iyileştiricisinden
                      geçmesinin faydası yok — bkz. tohum-referans. */}
                  <Image
                    src={f.image}
                    alt=""
                    fill
                    unoptimized={f.uretilen}
                    sizes="168px"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                  />
                  {marked && <span aria-hidden className="absolute left-2 top-2 h-1.5 w-1.5 bg-paper" />}
                  {f.uretilen && (
                    <span className="absolute right-2 top-2 bg-paper/85 px-1.5 py-1 eyebrow text-ink backdrop-blur-sm">
                      Üretilen
                    </span>
                  )}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -inset-[3px] border border-kalem transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </span>
              <span
                className={cn(
                  "mt-3.5 block text-[13px] leading-4 transition-colors duration-300",
                  isActive ? "font-medium text-kalem" : "text-fog group-hover:text-kalem",
                )}
              >
                {f.name}
              </span>
              {/* Üretilen kare TEK bir kumaş değil; kartelada tek satırla
                  da olsa bunu söylemek zorundayız. */}
              <span className="mt-1.5 block eyebrow text-fog">
                {f.uretilen ? "4–6 parça · ölçülmedi" : f.composition}
              </span>
            </button>
          );
        })}
        <span aria-hidden className="w-1 shrink-0" />
      </div>

      <div aria-hidden className="mx-6 h-px bg-hair md:mx-10" />

      {/* Laboratuvar */}
      <div className="grid flex-1 lg:grid-cols-12">
        {/* Makro doku + cetvel */}
        <section
          aria-label="Makro doku"
          className="px-6 py-8 md:px-10 md:py-10 lg:col-span-7 lg:border-r lg:border-hair"
        >
          {/* CETVEL VE "1:1" ROZETİ KALDIRILDI — ikisi de UYDURMA ölçek
              iddiasıydı.

              Kod kendi kuralını üretilen kare için doğru uyguluyordu
              ("kaç santimetre gösterdiğini bilmiyoruz") ama katalog için
              çiğniyordu: `SCALE_W_CM = 10` tek bir varsayım olarak DOKUZ
              AYRI stok fotoğrafın hepsine uygulanıyordu. Hiçbiri
              ölçülmemişti. Cetvel, ölçülmemiş bir sayıyı milimetre
              taksimatıyla sunduğu için iddianın en inandırıcı biçimiydi.

              Ölçek gerçekten bilinirse dönebilir: `Fabric` tipine
              ölçülmüş bir alan eklenir ve cetvel ona bağlanır. Bugün o
              alan yok, o yüzden iddia da yok. */}
          <div className="grid gap-1.5 grid-cols-1">
            <div
              role="button"
              tabIndex={0}
              aria-pressed={zoom}
              aria-label={zoom ? "Yakınlaştırmayı kapat" : "Dokuyu yakınlaştır"}
              onMouseMove={onMacroMove}
              onClick={() => setZoom((z) => !z)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setZoom((z) => !z);
                }
              }}
              className={cn(
                "relative aspect-[4/3] overflow-hidden bg-hair outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-kalem",
                zoom ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
            >
              <Image
                key={active.id}
                src={active.image}
                alt={active.uretilen ? `${active.name} — 4–6 parçalı kare` : `${active.name} — makro doku`}
                fill
                priority
                unoptimized={active.uretilen}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)]"
                style={{
                  transform: zoom ? "scale(2.4)" : "scale(1)",
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                }}
              />
              <span className="absolute left-3 top-3 bg-paper/85 px-2.5 py-2 eyebrow text-ink backdrop-blur-sm">
                {active.uretilen ? "Üretilen · ölçek bilinmiyor" : "Makro doku · ölçek bilinmiyor"}
              </span>
              <span
                aria-hidden
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border border-ink/10 bg-paper/80 text-ink backdrop-blur-sm"
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="M15.5 15.5 20 20" />
                  {zoom ? <path d="M8 10.5h5" /> : <path d="M10.5 8v5M8 10.5h5" />}
                </svg>
              </span>
            </div>
          </div>

          <div
            className={cn(
              "mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 eyebrow text-fog",
            )}
          >
            <span>
              {active.uretilen
                ? `Üretilen çalışma · ${dokuma ?? "Dokuma ölçülmedi"}`
                : `Makro doku · ${active.weave} · ${active.color}`}
            </span>
            <span>
              Desen tekrarı ·{" "}
              {active.repeat ? `${active.repeat} cm` : active.uretilen ? "Ölçülmedi" : "Yok"}
            </span>
          </div>
          <p className={cn("mt-2 text-[11px] leading-4 text-fog",)}>
            {zoom ? "İmleci gezdirerek dokuyu inceleyin; kapatmak için tıklayın." : "Yakınlaştırmak için dokuya tıklayın."}
          </p>
        </section>

        {/* Ölçüm paneli */}
        <aside aria-label="Ölçüm laboratuvarı" className="px-6 py-8 md:px-10 md:py-10 lg:col-span-5">
          <p className="eyebrow text-fog">Ölçüm laboratuvarı</p>
          <h2 className="mt-3 font-display text-3xl leading-none md:text-4xl">{active.name}</h2>
          <p className="mt-3 eyebrow text-fog">
            {active.uretilen
              ? (kompozisyon ?? "Kompozisyon ölçülmedi")
              : `${active.composition} · ${active.color}`}
          </p>

          {active.uretilen && (
            <section className="mt-10 border-t border-hair pt-8">
              <div className="flex items-baseline justify-between">
                <h3 className="eyebrow">Ölçüm girişi</h3>
                {/* Eskiden burada "Kaydedilmiyor" yazıyordu ve doğruydu;
                    artık kaydediliyor. Durum göstergesi başlıkta, burada
                    tekrarlamıyoruz. */}
                <span className="eyebrow text-fog">Elle ölçülen değerler</span>
              </div>
              {/* Karenin ne olduğunu olduğu gibi söylüyoruz. Üretim istemi
                  (lib/ai/prompt.ts) dört ilâ altı FARKLI parça istiyor;
                  buna tek bir gramaj ya da kompozisyon yazmak veri
                  uydurmak olurdu. Metin modeli de göremiyor: ölçüyü ancak
                  kumaşa bakan kişi koyabilir. */}
              <p className="mt-4 text-[11px] leading-4 text-fog">
                Bu kare tek bir kumaş değil — dört ilâ altı farklı ağırlık ve dokuda parça
                gösteriyor. Ölçülebilir alanlar bu yüzden boş geliyor; hangi parçayı
                çalıştığınıza siz karar verip değerleri buraya yazın.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-8">
                <Field label="Kompozisyon" htmlFor="uretilen-kompozisyon">
                  <Input
                    id="uretilen-kompozisyon"
                    value={olcum.composition}
                    placeholder="Ölçülmedi"
                    onChange={(e) => setOlcum((o) => ({ ...o, composition: e.target.value }))}
                  />
                </Field>
                <Field label="Dokuma" htmlFor="uretilen-dokuma">
                  <Select
                    id="uretilen-dokuma"
                    value={olcum.weave}
                    onChange={(e) =>
                      setOlcum((o) => ({ ...o, weave: e.target.value as Weave | "" }))
                    }
                  >
                    <option value="">Ölçülmedi</option>
                    {DOKUMALAR.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>
          )}

          <section className="mt-10 border-t border-hair pt-8">
            <div className="flex items-baseline justify-between">
              <h3 className="eyebrow">Metraj</h3>
              <span className="eyebrow tabular-nums text-fog">
                {price !== null ? `${formatTRY(price)} / m` : "Fiyat ölçülmedi"}
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-8">
              <Field label="En" htmlFor="fabric-width" trailing="cm">
                {active.uretilen ? (
                  <Input
                    id="fabric-width"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={olcum.width}
                    placeholder="Ölçülmedi"
                    onChange={(e) => setOlcum((o) => ({ ...o, width: e.target.value }))}
                    className="tabular-nums"
                  />
                ) : (
                  <p id="fabric-width" className="border-b border-hair py-3 text-[15px] leading-6 tabular-nums">
                    {active.width}
                  </p>
                )}
              </Field>
              {active.uretilen && (
                <Field label="Metre fiyatı" htmlFor="fabric-price" trailing="₺">
                  <Input
                    id="fabric-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={10}
                    value={olcum.price}
                    placeholder="Ölçülmedi"
                    onChange={(e) => setOlcum((o) => ({ ...o, price: e.target.value }))}
                    className="tabular-nums"
                  />
                </Field>
              )}
              <Field label="İstenen uzunluk" htmlFor="fabric-length" trailing="metre">
                <Input
                  id="fabric-length"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="tabular-nums"
                />
              </Field>
            </div>
            {/* Eksik ölçüde kutular tire basıyor: hesap en, gramaj ve
                fiyata dayanıyor, üçü de üretilen karede bilinmiyor. */}
            <dl className="mt-7 grid grid-cols-3 gap-4">
              <Stat label="Alan" value={area !== null ? `${nf.format(area)} m²` : "—"} />
              <Stat
                label="Ağırlık"
                value={
                  grams === null
                    ? "—"
                    : grams >= 1000
                      ? `${nf.format(grams / 1000)} kg`
                      : `${nf0.format(grams)} g`
                }
              />
              <Stat label="Tahmini tutar" value={cost !== null ? formatTRY(cost) : "—"} />
            </dl>
            {active.uretilen && (area === null || grams === null || cost === null) && (
              <p className="mt-4 text-[11px] leading-4 text-fog">
                Hesap için en, gramaj ve metre fiyatı gerekiyor; girilmeyen alan tire kalıyor.
              </p>
            )}
          </section>

          <section className="mt-10 border-t border-hair pt-8">
            <div className="flex items-baseline justify-between">
              <h3 className="eyebrow">Fiziksel özellikler</h3>
              {specChanged && (
                <button
                  type="button"
                  onClick={() => setSpec(specOf(active))}
                  className="fade eyebrow text-fog u-line hover:text-kalem"
                >
                  {/* Üretilende dönülecek bir "kumaş değeri" yok: sıfırlama
                      ölçümü ÖLÇÜLMEDİ'ye geri alıyor. */}
                  {active.uretilen ? "Ölçümleri temizle" : "Kumaşın değerlerine dön"}
                </button>
              )}
            </div>
            <div className="mt-7 space-y-8">
              <Slider
                id="spec-weight"
                label="Ağırlık"
                value={spec.weight}
                min={40}
                max={600}
                step={1}
                onChange={(v) => setSpec((s) => ({ ...s, weight: v }))}
                format={(v) => `${v} g/m²`}
                hints={["40 · İnce", "600 · Ağır"]}
              />
              <Slider
                id="spec-stretch"
                label="Esneklik"
                value={spec.stretch}
                min={0}
                max={40}
                onChange={(v) => setSpec((s) => ({ ...s, stretch: v }))}
                format={(v) => `%${v}`}
                hints={["Sabit", "Yüksek esneme"]}
              />
              <Slider
                id="spec-drape"
                label="Döküm"
                value={spec.drape}
                min={0}
                max={100}
                onChange={(v) => setSpec((s) => ({ ...s, drape: v }))}
                format={(v) => (v < 34 ? "Sert" : v < 67 ? "Orta" : "Akışkan")}
                hints={["Sert", "Akışkan"]}
              />
            </div>
            {active.uretilen && (
              <p className="mt-6 text-[11px] leading-4 text-fog">
                Üç kaydırıcı da boş başlıyor: değeri sürükleyerek siz koyuyorsunuz.
              </p>
            )}
          </section>

          <div className="mt-10 flex flex-col gap-5 border-t border-hair pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button variant={inKartela ? "ghost" : "solid"} onClick={toggleKartela}>
              {inKartela ? "Karteladan çıkar" : "Kartelaya ekle"}
            </Button>
            <a
              href={`mailto:${site.email}?subject=${encodeURIComponent(`Numune: ${active.name}`)}`}
              className="group inline-flex items-center gap-3 eyebrow u-line"
            >
              Numune iste
              <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
            </a>
          </div>
        </aside>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow text-fog">{label}</dt>
      <dd className="mt-2 font-display text-xl tabular-nums md:text-2xl">{value}</dd>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hints,
}: {
  id: string;
  label: string;
  /** null = ölçülmedi; sayı yerine "Ölçülmedi" yazılıyor. */
  value: number | null;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  hints: [string, string];
}) {
  /* Ölçülmemiş kaydırıcı: dolgu sıfır, kol en başta ve okunan değer
     "Ölçülmedi". Ortaya bir sayı koymak (mesela aralığın ortası) daha
     "dolu" görünürdü ama ölçülmemiş değeri ölçülmüş gibi gösterirdi;
     kolun ilk hareketi zaten gerçek bir değer yazıyor. */
  const olculdu = value !== null;
  const v = value ?? min;
  const pct = olculdu ? ((v - min) / (max - min)) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="eyebrow text-fog">
          {label}
        </label>
        <span className={cn("text-sm tabular-nums", !olculdu && "text-fog")}>
          {olculdu ? format(v) : "Ölçülmedi"}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        /* Ölçülmemişken kol zaten min'de duruyor: kullanıcı tam min'i
           seçerse change olayı HİÇ gelmez ve alan "Ölçülmedi" kalırdı.
           Kaldırma anında değeri yazıyoruz; ölçülmüşse zaten dokunmuyor. */
        onPointerUp={() => {
          if (!olculdu) onChange(v);
        }}
        aria-valuetext={olculdu ? format(v) : "Ölçülmedi"}
        className={cn("slider mt-3", !olculdu && "opacity-45")}
        style={{ "--p": `${pct}%` } as CSSProperties}
      />
      <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[0.14em] text-fog/80">
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}

function ScrollButton({ label, onClick, back }: { label: string; onClick: () => void; back?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center border border-kalem/10 text-kalem/60 transition-colors duration-300 hover:border-kalem/40 hover:text-kalem"
    >
      <Arrow className={cn(back && "rotate-180")} />
    </button>
  );
}
