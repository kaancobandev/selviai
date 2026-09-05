"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { fabrics } from "@/lib/fabrics";
import {
  bbox,
  dist,
  distToPolyline,
  inset,
  overlockTicks,
  pointInPolygon,
  polyPath,
  samplePath,
  simplify,
  smoothPath,
  splitPolygon,
  toCm,
  UNITS_PER_CM,
  zigzag,
  type Pt,
} from "@/lib/geometry";
import { giysiSiniriniOlc, type GiysiSiniri } from "@/lib/giysi-siniri";
import { cn } from "@/lib/utils";
import { TEKNIK_EKSENLERI, type Aspect, type TeknikEkseni } from "@/lib/ai/types";
import type { StudyoTohum } from "@/lib/ai/tohum";
import { Croquis } from "@/components/croquis";
import { Toast } from "@/components/ui/toast";

/* ------------------------------------------------------------------
   Tipler ve sabitler
   ------------------------------------------------------------------ */
type Tool = "select" | "pen" | "measure" | "not" | "simge" | "cut" | "hand";
type Stitch = "duz" | "ust" | "zigzag" | "surfile";
type ViewId = "front" | "back" | "detail";

/**
 * ÇİZGİ KALINLIĞI — teknik çizimin okunma dili.
 *
 * Bir flat'te kalınlık süs değil, ANLAM: dış hat kalın (parçanın sınırı),
 * yapısal hatlar orta, dikiş ve detay ince. Sanayi bu ayrımla okuyor;
 * tek kalınlıkta çizilmiş bir flat'te atölye neyin kenar neyin dikiş
 * olduğunu ayırt edemiyor. Eskiden tuvaldeki her yol `strokeWidth="1"`
 * idi — yani çizimimizin söyleyebileceği tek bir şey vardı.
 *
 * Değerler `vectorEffect="non-scaling-stroke"` ile piksel cinsinden
 * sabit kalıyor: yakınlaştırınca kalınlık hiyerarşisi bozulmuyor.
 */
type Kalinlik = "ince" | "orta" | "kalin";
const KALINLIKLAR: { id: Kalinlik; label: string; px: number }[] = [
  { id: "ince", label: "İnce", px: 0.75 },
  { id: "orta", label: "Orta", px: 1.25 },
  { id: "kalin", label: "Kalın", px: 2 },
];
const kalinlikPx = (k: Kalinlik) => KALINLIKLAR.find((x) => x.id === k)?.px ?? 1.25;

type Shape = {
  id: string;
  name: string;
  points: Pt[];
  closed: boolean;
  smooth: boolean;
  stitch: Stitch;
  fabricId: string | null;
  visible: boolean;
  kalinlik: Kalinlik;
};
/**
 * ÖLÇÜM NOKTASI (POM — point of measure).
 *
 * Mezura bugüne kadar yalnız "iki nokta arası kaç cm" diyordu. Atölyenin
 * sorduğu soru ise başka: HANGİ ölçü bu, numune bedende kaç olmalı ve
 * ne kadar sapma kabul edilir. Adı olmayan bir ölçü tabloya giremiyor,
 * toleransı olmayan bir ölçüyle kalite kontrol yapılamıyor — numune
 * reddi tartışmaya dönüyor.
 *
 * DEĞER ÖLÇÜLÜYOR, GİRİLMİYOR: çizimdeki iki nokta arası zaten mesafe
 * veriyor. Elle girilseydi çizimle tablo birbirinden ayrı düşerdi ve
 * hangisinin doğru olduğu belirsiz kalırdı.
 */
type Measure = { id: string; a: Pt; b: Pt; ad?: string; tolerans?: number; artis?: number };

/**
 * BEDEN SERİSİ VE GRADASYON.
 *
 * Tek bedenlik bir çizim ürün değil, NUMUNEDIR. Koleksiyon üretimine
 * geçmenin eşiği burası: numune beden ölçülüyor, kalan bedenler ondan
 * TÜRETİLİYOR. Türetme kuralı ölçü noktası başına tek bir sayı — beden
 * başına artış — ve tech pack'lerde "grade rule" diye geçiyor.
 *
 * SERİ BELGE DÜZEYİNDE, görünüm düzeyinde değil: ön, arka ve detay aynı
 * giysinin parçaları ve hepsi aynı beden serisinde üretiliyor. Görünüm
 * başına ayrı seri tutmak, arka bedeni ön bedenden başka bir bedende
 * dikmeye davet olurdu.
 */
type Seri = { bedenler: string[]; numune: number };
const VARSAYILAN_SERI: Seri = { bedenler: ["XS", "S", "M", "L", "XL"], numune: 2 };

/** Bir ölçünün istenen bedendeki değeri (cm). */
function bedendeOlcu(m: Measure, seri: Seri, indeks: number): number {
  const adim = indeks - seri.numune;
  return toCm(dist(m.a, m.b)) + adim * (m.artis ?? 0);
}

/** Tech pack'lerde yaygın ölçüm noktaları — adlandırma hızlansın diye. */
const POM_ONERILERI = [
  "Göğüs genişliği",
  "Bel genişliği",
  "Etek ucu genişliği",
  "Omuz genişliği",
  "Ön boy",
  "Arka boy",
  "Kol boyu",
  "Kol ağzı",
  "Yaka genişliği",
  "Yaka derinliği",
  "Manşet yüksekliği",
  "Cep genişliği",
];
const VARSAYILAN_TOLERANS = 1;
/**
 * NOT / AÇIKLAMA BALONU (callout).
 *
 * Flat üzerinde konstrüksiyonu anlatmanın tek yolu bu: "kenardan 6 mm üst
 * dikiş", "bu kenar sürfileli", "astar buradan döner". Dikiş TİPİ zaten
 * parçada seçiliyor ama sayısal değer, sıra ve istisna yazıyla anlatılır.
 * Bunlar olmadan çizim fabrikaya gidebilecek bir belge değil, yalnızca
 * bir resim.
 *
 * `ok` isteğe bağlı: varsa metinden o noktaya ince bir kılavuz çizgi
 * gidiyor (asıl callout), yoksa serbest bir not oluyor.
 */
type Not = { id: string; p: Pt; metin: string; ok?: Pt };

/* ------------------------------------------------------------------
   GİYSİ SİMGELERİ — teknik çizimin grameri.

   Bunlar süs değil, TALİMAT. Dokuma yönü (grainline) oku olmayan bir
   flat, kesimhaneye kumaşın hangi yöne serileceğini söylemiyor; kertik
   olmadan iki parçanın nerede buluşacağı belirsiz kalıyor. Çizimimiz
   bugüne kadar yalnız çokgen ve dört dikiş tipi çizebiliyordu, yani bu
   dilin hiçbir kelimesi yoktu.

   Hepsi tek bir veri şekliyle tutuluyor — konum, AÇI ve BOY — çünkü
   beşinin de anlamı yöne bağlı: dik duran bir grainline ile yatay duran
   bir grainline iki ayrı kesim talimatı.
   ------------------------------------------------------------------ */
type SimgeTur = "grainline" | "kertik" | "pens" | "pile" | "katlama";
type Simge = { id: string; tur: SimgeTur; p: Pt; aci: number; boy: number };

const SIMGELER: { id: SimgeTur; label: string; ipucu: string; varsayilanBoy: number }[] = [
  { id: "grainline", label: "Dokuma yönü", ipucu: "Kumaşın çözgü yönü — kesimhane buna göre seriyor", varsayilanBoy: 80 },
  { id: "kertik", label: "Kertik", ipucu: "İki parçanın buluşma işareti", varsayilanBoy: 12 },
  { id: "pens", label: "Pens", ipucu: "Alınan bolluk — uç noktaya kapanır", varsayilanBoy: 60 },
  { id: "pile", label: "Pile", ipucu: "Katlama yönü oklu", varsayilanBoy: 48 },
  { id: "katlama", label: "Katlama hattı", ipucu: "Kesilmez, katlanır", varsayilanBoy: 90 },
];

type ViewDoc = { shapes: Shape[]; measures: Measure[]; notlar: Not[]; simgeler: Simge[] };
type Doc = Record<ViewId, ViewDoc>;

const TOOLS: { id: Tool; label: string; key: string; hint: string }[] = [
  { id: "select", label: "Seç", key: "V", hint: "Shift çoğaltır · çift tık nokta ekler · Alt+çapa siler · köşe oranlı ölçekler, üstteki halka döndürür" },
  { id: "pen", label: "Kalem", key: "P", hint: "Tıkla nokta ekle · ilk noktaya dön kapat · Enter bitir" },
  { id: "measure", label: "Mezura", key: "M", hint: "İki nokta arasını sürükle · cm" },
  { id: "not", label: "Not", key: "N", hint: "Tıkla not bırak · anlatacağın yerden sürükle, kılavuz çizgi çekilsin" },
  { id: "simge", label: "Simge", key: "S", hint: "Tıkla yerleştir · sürükle yönünü ve boyunu ver" },
  { id: "cut", label: "Makas", key: "C", hint: "Parçanın üzerinden bir çizgi çek · ikiye böler" },
  { id: "hand", label: "El", key: "H", hint: "Tuvali sürükle · tekerlek yakınlaştırır" },
];
const STITCHES: { id: Stitch; label: string }[] = [
  { id: "duz", label: "Düz dikiş" },
  { id: "ust", label: "Üst dikiş" },
  { id: "zigzag", label: "Zigzag" },
  { id: "surfile", label: "Sürfile" },
];
const VIEWS: { id: ViewId; label: string }[] = [
  { id: "front", label: "Ön" },
  { id: "back", label: "Arka" },
  { id: "detail", label: "Detay" },
];

const SELECT = "#6B7C93"; // mat mavi-gri — yalnızca seçim
const INK = "#1a1a1a";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

const uid = () => Math.random().toString(36).slice(2, 9);
const fmtCm = (units: number) => toCm(units).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const P = (x: number, y: number): Pt => ({ x, y });

/* Örnek doküman — keten bluz.

   YAKA ÜÇ NOKTA DEĞİL BEŞ. Eğri artık köşeye saygılı (bkz. geometry.ts):
   omuzdan yaka dibine tek sıçrayan üç nokta 112,6°'lik bir dönüş demek
   ve o açı KÖŞE sayılıp yuvarlak yaka sivri bir V'ye dönüşüyordu. Araya
   konan iki nokta dönüşü 47,9°'ye indiriyor, yani yaka eskisi gibi
   yuvarlak kalıyor. Kuralın kendisi de burada görünür oluyor: eğri
   isteyen nokta verir. */
const blouse = (neck: number): Pt[] => [
  P(-16, 106), P(-72, 122), P(-64, 172), P(-54, 292), P(-64, 410),
  P(64, 410), P(54, 292), P(64, 172), P(72, 122), P(16, 106),
  P(9, neck - 4), P(0, neck), P(-9, neck - 4),
];
const initialDoc: Doc = {
  front: {
    shapes: [
      { id: "s-front", name: "Ön beden", points: blouse(130), closed: true, smooth: true, stitch: "ust", fabricId: "organik-keten", visible: true, kalinlik: "kalin" },
      { id: "s-sleeve", name: "Kol", points: [P(150, 124), P(181, 104), P(212, 124), P(206, 250), P(196, 332), P(166, 332), P(156, 250)], closed: true, smooth: true, stitch: "duz", fabricId: "organik-keten", visible: true, kalinlik: "kalin" },
    ],
    measures: [{ id: "m1", a: P(-72, 122), b: P(72, 122) }],
    notlar: [],
    simgeler: [],
  },
  back: {
    shapes: [{ id: "s-back", name: "Arka beden", points: blouse(112), closed: true, smooth: true, stitch: "duz", fabricId: "organik-keten", visible: true, kalinlik: "kalin" }],
    measures: [],
    notlar: [],
    simgeler: [],
  },
  detail: {
    shapes: [
      { id: "s-cuff", name: "Manşet", points: [P(-80, 0), P(80, 0), P(80, 40), P(-80, 40)], closed: true, smooth: false, stitch: "surfile", fabricId: "organik-keten", visible: true, kalinlik: "orta" },
      { id: "s-pocket", name: "Cep", points: [P(120, 0), P(180, 0), P(180, 60), P(150, 72), P(120, 60)], closed: true, smooth: false, stitch: "zigzag", fabricId: "denim", visible: true, kalinlik: "orta" },
    ],
    measures: [{ id: "m2", a: P(-80, 52), b: P(80, 52) }],
    notlar: [],
    simgeler: [],
  },
};

/* ------------------------------------------------------------------
   ÇİZİMİN KAYDEDİLMESİ

   Belge eskiden yalnız React durumundaydı: sayfa yenilenince kullanıcının
   çizdiği her şey gidiyordu. Kod bunu ÜCRETLİ çıktı için zaten fark edip
   düzeltmişti (`kayitliTeknikCizimler` — üretilen altlıklar iş kaydından
   geri geliyor); kullanıcının KENDİ emeği için düzeltilmemişti. Yani araç,
   makinenin ürettiğini saklayıp insanın çizdiğini atıyordu.

   NEDEN localStorage, NEDEN SUNUCU DEĞİL. Sunucu kaydı hesaba bağlı ve
   ayrı bir karar (`/api/calisma`); o gelene kadar çizimin yenilemede
   yaşaması tek başına büyük fark. Sınırı da açıkça söylemek gerekiyor:
   bu kayıt TARAYICIYA ait — başka cihazda, gizli sekmede ya da site
   verisi silinince yok. Arayüzdeki etiket bu yüzden "Bu tarayıcıya
   kaydedildi" diyor, "kaydedildi" değil: `brand-studio.tsx`'teki
   "Otomatik kaydedildi" yazısı hiçbir kalıcılık olmadan yazıldığı için
   düpedüz yanlış, aynı hatayı burada tekrarlamıyoruz.

   SÜRÜM ANAHTARI: `Shape` alanı değiştiğinde eski kayıt okunamaz hâle
   gelir. Anahtarın sonundaki sürüm bunu sessiz bir çökme yerine temiz bir
   "kayıt yok" durumuna çeviriyor.
   ------------------------------------------------------------------ */
const KAYIT_ANAHTARI = "selvi-teknik-cizim-v1";

/** Okunan belgeyi bugünkü şekle uydurur — eksik alan çökme sebebi olmasın. */
function belgeyiOnar(ham: unknown): Doc | null {
  if (!ham || typeof ham !== "object") return null;
  const kaynak = ham as Partial<Record<ViewId, unknown>>;
  const cikti = {} as Doc;
  for (const v of VIEWS) {
    const g = kaynak[v.id] as { shapes?: unknown; measures?: unknown; notlar?: unknown; simgeler?: unknown } | undefined;
    if (!g) return null;
    const shapes = Array.isArray(g.shapes) ? g.shapes : [];
    const measures = Array.isArray(g.measures) ? g.measures : [];
    cikti[v.id] = {
      shapes: shapes
        .filter((x): x is Shape => !!x && Array.isArray((x as Shape).points))
        .map((x) => ({ ...x, kalinlik: x.kalinlik ?? "orta", visible: x.visible !== false })),
      /* Eski kayıtlarda ad ve tolerans yok; varsayılan tolerans veriliyor,
         ad boş kalıyor (adsız satır tabloda "Adsız ölçü" diye görünüyor
         ve kullanıcıyı adlandırmaya çağırıyor — uydurma bir ad koymak
         ölçüyü yanlış tanımlamak olurdu). */
      measures: (measures as Measure[]).map((m) => ({ ...m, tolerans: m.tolerans ?? VARSAYILAN_TOLERANS, artis: m.artis ?? 0 })),
      /* Eski kayıtlarda `notlar` yok; sürüm anahtarını değiştirmek yerine
         burada boşa düşürüyoruz — kullanıcının çizimini bir alan eklendi
         diye atmanın gerekçesi olmaz. */
      notlar: Array.isArray(g.notlar) ? (g.notlar as Not[]) : [],
      simgeler: Array.isArray(g.simgeler) ? (g.simgeler as Simge[]) : [],
    };
  }
  return cikti;
}

/**
 * Kayıt okuma — İKİ BİÇİMİ DE ANLIYOR.
 *
 * İlk sürüm belgeyi doğrudan yazıyordu; beden serisi eklenince kayıt
 * `{ doc, seri }` oldu. Sürüm anahtarını değiştirmek en kolayıydı ama
 * kullanıcının çizimini "bir alan eklendi" diye atmak demekti. Eski
 * kayıtta `doc` anahtarı yok — bu ayrım iki biçimi ayırt etmeye yetiyor
 * ve eski çizimler varsayılan seriyle açılıyor.
 */
function kayitOku(): { doc: Doc; seri: Seri } | null {
  /* try/catch ŞART: gizli sekmede ve site verisi kapalıyken erişimin
     KENDİSİ fırlatıyor — okumak değil, `localStorage`'a dokunmak. */
  try {
    const ham = window.localStorage.getItem(KAYIT_ANAHTARI);
    if (!ham) return null;
    const cozulen = JSON.parse(ham) as Record<string, unknown>;
    const eskiBicim = !("doc" in cozulen);
    const doc = belgeyiOnar(eskiBicim ? cozulen : cozulen.doc);
    if (!doc) return null;
    const s = (eskiBicim ? null : (cozulen.seri as Partial<Seri> | undefined)) ?? null;
    const bedenler = Array.isArray(s?.bedenler) && s.bedenler.length ? s.bedenler : VARSAYILAN_SERI.bedenler;
    const numune = typeof s?.numune === "number" ? Math.min(Math.max(0, s.numune), bedenler.length - 1) : VARSAYILAN_SERI.numune;
    return { doc, seri: { bedenler, numune } };
  } catch {
    return null;
  }
}

function kayitYaz(doc: Doc, seri: Seri): void {
  try {
    window.localStorage.setItem(KAYIT_ANAHTARI, JSON.stringify({ doc, seri }));
  } catch {
    /* Kota dolu ya da depolama kapalı. Sessiz geçiyoruz: kaydedememek
       çizimi kaybettirmez, kullanıcıyı uyarı yağmuruna tutmak ise
       çizimin ortasında dikkat dağıtır. */
  }
}

/* ------------------------------------------------------------------
   TOHUM ALTLIĞI — ana sayfada üretilen kare, çizimin arkasında

   HANGİ KARE VARSAYILAN OLUYOR. Türetilmiş çıktılara GİYSİ SİLUETİ
   eklendi (bkz. TURETILMIS_TURLER) ve altlık artık öncelikle onu alıyor:
   dördün içinde giysiyi gösteren tek kare o, yani kroki'nin arkasında
   üstünden çizilecek şeyin ta kendisi. Yoksa moodboard'a, o da yoksa
   seçilen ilham karesine düşüyor — ikisi de giysi değil, ama palet ve
   malzeme referansı olarak hâlâ işe yarıyorlar.

   ESKİDEN ÖYLE BİR KARE YOKTU: ilham karelerinde giysi açıkça yasak ve
   kalan üç çıktı düz yatık görseldi; bir doğa fotoğrafına "ürettiğimiz
   giysi" demek üretmediğimiz şeyi üretmiş gibi göstermek olurdu. Şimdi
   siluet gerçekten üretiliyor, o yüzden adıyla anılabiliyor.

   AMA FOTOĞRAF ZAYIF BİR KILAVUZ. Siluet karesi gerçek bir çekim gibi
   duruyor: perspektifi, gölgesi, kırışığı ve içinde bir beden var.
   Üstünden çizgi geçirmek için istenen şey TEKNİK ÇİZİM — sektörün düz
   yatık, simetrik, gölgesiz çizgi resmi. Araç onu istendiğinde
   üretebiliyor (bkz. TEKNİK ÇİZİM bloğu); fotoğraf altlığı YEDEK kaldı.

   ALTLIK GÖRÜNÜM BAŞINA TUTULUYOR. Eskiden tek bir değer hem öne hem
   arkaya konuyordu; siluet tek bir ÖNDEN karedir, arkaya konduğunda
   tasarımcı arkayı ön fotoğrafından çiziyordu. Teknik çizim işi zaten
   ön ve arka olmak üzere iki kare döndürüyor, o yüzden altlık da iki
   yuva: `front` ve `back`. Detayda figür yok, altlık da yok.

   OPAKLIK/ÖLÇEK/KONUM PAYLAŞILIYOR, görünüm başına DEĞİL. Bunlar karenin
   değil BAKIŞIN ayarı — "ne kadar soluk", "ne kadar büyük". İki teknik
   çizim aynı işten, aynı oranla, aynı kroki'nin üstüne geliyor; biri için
   ayarlanan kutu ötekine de oturuyor. Görünüm başına tutmak paneldeki
   dört sürgüyü sekize çıkarır, karşılığında hiçbir şey vermezdi.

   Bedeli bilinerek ödeniyor: iki görünümde FARKLI TÜR altlık varsa (biri
   çizim, öteki fotoğraf — üretimden yalnız bir kare döndüğünde olur) tek
   kutu ikisine birden hizmet ediyor ve öteki tür kendi çerçevesinde
   durmuyor. Panelin "sıfırla" düğmesi tek tıkla aktif türün çerçevesine
   döndürüyor.

   Kare kroki'nin ARKASINA, ayarlanabilir opaklıkta bir REFERANS ALTLIK
   olarak konuyor — tasarımcı üstünden çizer. Kutu panelden ayarlanıyor,
   tuvalden sürüklenerek değil: altlık `pointer-events-none` olmak
   ZORUNDA, aksi hâlde vuruş testi, kalem ve makas sessizce ölür.
   ------------------------------------------------------------------ */
type AltlikKutu = { x: number; y: number; w: number; h: number };

/** Altlık taşıyan görünümler — detayda manşet ve cep var, figür yok. */
type AltlikGorunum = "front" | "back";

/**
 * Bir görünümün altlığı. `tur` süs değil, tuvalde davranış değiştiriyor:
 * teknik çizim kutuya SIĞARAK (`meet`), fotoğraf kutuyu DOLDURARAK
 * (`slice`) yerleşiyor — gerekçe `image` düğümünün başında.
 */
type Altlik = { src: string; tur: "kare" | "teknik" };

/* Kroki'nin kapladığı alan — components/croquis.tsx'ten ölçüldü: baş
   elipsi (cy 40, ry 36) y=4'te başlıyor, ayak tabanı y=672, en dış kol
   çizgisi |x|=90. Altlık varsayılan olarak buraya oturuyor. */
const KROKI_ALAN: AltlikKutu = { x: -90, y: 4, w: 180, h: 668 };
const ALTLIK_OPAKLIK = 0.45;

/* ------------------------------------------------------------------
   TEKNİK ÇİZİM — istendiğinde üretilen ön/arka çizgi resmi

   NEDEN BURADAN, AKIŞTAN DEĞİL. Ana sayfa koşusu zaten sekiz kare
   harcıyor ve kullanıcıların çoğu bu aracı hiç açmıyor; iki kareyi
   herkese peşinen ödetmek yerine isteyene burada üretiliyor. Kolaj
   kesimindeki karar bu (bkz. components/kolaj-studio.tsx başı).

   NEDEN İKİ KARE. Araçta ön ve arka ayrı görünüm ve `Croquis` `back`
   propuyla dönüyor; ikisi birebir eşleşiyor. Yuva adları motorun
   sözlüğünden geliyor, burada ikinci bir sözlük tutulmuyor: `TEKNIK_YUVA`
   `TeknikEkseni` ile yazıldığı için eksen adı değişirse burası DERLENMEZ,
   sessizce boş kare beklemez.

   KAYNAK SİLUET. Giysi fotoğrafını çizgi resme çevirmek modelin
   yapabileceği bir iş; ilham karesinden yoktan teknik çizim uydurmak
   değil. Siluet yoksa düğme kapalı kalıyor.

   ÇİZİMLER ÇALIŞMA KAYDINA YAZILIYOR. `/api/teknik` iş kimliğini kayda
   işliyor, tohum da çizimleri adresleriyle geri veriyor (bkz.
   `StudyoTohum.teknik`). Eskiden yazmıyordu: çizim yalnız bu araç açıkken
   yaşıyordu ve sayfa tazelenince ÜCRETLİ çıktı siliniyordu — kareler
   kovada dururken kullanıcı aynı çizimi ikinci kez ödüyordu.
   ------------------------------------------------------------------ */

/**
 * Üretim oranı. Kroki alanı 180×668 birim, yani ~1:3,7; `ASPECTS` içinde
 * o kadar dar bir oran yok, en dikeyi 3:4. Kare kutuya `meet` ile
 * oturduğu için artan boşluk zarar vermiyor — kırpma verirdi.
 */
const TEKNIK_ORAN: Aspect = "3:4";

/**
 * Teknik çizimin YEDEK çerçevesi — ölçüm tutmadığında buraya oturuyor.
 *
 * TEK BAŞINA NEDEN YETMİYOR. Kare 3:4 geliyor ama giysinin o karenin
 * içinde bıraktığı payı her koşuda model belirliyor; sabit bir kutu bu
 * yüzden ancak yaklaşık tutuyordu — sahibinin bildirdiği hata buydu, omuz,
 * etek ucu ve en mankene oturmuyordu. Asıl yol artık ÖLÇÜM: zemin saf
 * beyaz olduğu için `giysiSiniriniOlc` beyaz olmayan pikselleri tarayıp
 * giysinin sınırını buluyor, `zarfaOturt` onu aşağıdaki GIYSI_ZARFI'na
 * oturtuyor. Burası ölçüm çöktüğünde (kare yüklenmedi, tuval okunamadı,
 * sınır inandırıcı çıkmadı) kalan yedek: yanlış ama GÖRÜNEN bir altlık,
 * hiç altlık olmamasından iyi — sürgüler zaten duruyor.
 *
 * Yedeğin ölçüsü şöyle çıkarılmıştı. Kroki alanı bütün figür: 180×668,
 * yani ~1:3,7. 3:4'lük bir kareyi oraya sığdırmak (`meet`) çizimi
 * genişlikten oturtur ve 180×240'a düşürür — çizim figürün ortasında
 * ufacık kalır. Çerçeve bu yüzden GİYSİNİN alanından türetildi: bu
 * dosyadaki örnek bluzdan omuz y=106, etek ucu y=410, omuz ucu |x|=72
 * (croquis.tsx da aynısını söylüyor — omuz ucu 72/118, kalça çizgisi 400),
 * giysi zarfı 144×304 ve merkezi (0, 258). Karedeki giysinin çerçeveyi
 * ~%85 doldurduğu VARSAYILDI: 304 / 0,85 ≈ 358 yükseklik, 3:4'te 268
 * genişlik. Kutu tam 3:4 olduğu için `meet` ile `slice` çakışıyor. Ölçüm
 * tam da bu %85 varsayımını kaldırıyor.
 */
const TEKNIK_ALAN: AltlikKutu = { x: -134, y: 79, w: 268, h: 358 };

/* ------------------------------------------------------------------
   GİYSİ ZARFI — teknik çizimin krokide oturması gereken alan.

   Ölçüler components/croquis.tsx'in kendi geometrisinden okundu; o dosya
   sabit bir vektör figür ve 4 birim = 1 cm:

   · Omuz çizgisi boyun dibinden çıkıyor (`M ±13 100`), omuz ucuna kadar
     hafifçe iniyor. Zarfın ÜST kenarı y=100. Yakaya pay bırakılmadı:
     çizimin üst kenarı zaten yakanın tepesi ve onu omuz çizgisine
     oturtmak, omuz dikişini bir yaka boyu aşağı kaydırmaktan iyi.
   · Omuz ucu `±72 118` → zarfın eni 144 birim (36 cm).
   · Kalça kılavuzu y=400 (croquis `guides`) ve gövde yanı orada en geniş
     (`±58 400`). Ceket eteği kalçanın altına düşer: ALT kenar y=430, yani
     kalça çizgisinden 30 birim (7,5 cm) aşağıda. Zarf boyu 330 birim.

   Zarf x=0'a simetrik, çünkü kroki de öyle.
   ------------------------------------------------------------------ */
const GIYSI_ZARFI: AltlikKutu = { x: -72, y: 100, w: 144, h: 330 };

/**
 * Ölçülen altlığın en tavanı: omuz açıklığının 2,5 katı, yani 360 birim.
 * Sayı ikinci bir yerden de doğrulanıyor — `fitView` ön/arka görünüm için
 * tam 360 birimlik kadraj açıyor, yani tavan "kadrajı taşma" demek.
 * Kolları çırpı gibi yatay çizilmiş bir kare boydan oturtulunca oraya
 * varabiliyor; tavan onu içeride tutuyor.
 */
const EN_TAVANI = GIYSI_ZARFI.w * 2.5;

/**
 * Ölçülen giysi sınırını zarfa oturtur.
 *
 * Dönen kutu KARENİN TAMAMININ kutusu — SVG `image` bütün kareyi çiziyor,
 * biz giysinin zarfa denk gelmesini istiyoruz. Kutu karenin kendi oranıyla
 * kuruluyor, o yüzden `meet`, `slice` ve `none` çakışıyor: çizim hiçbir
 * durumda esnemiyor, kırpılmıyor.
 *
 * BOYDAN OTURTULUYOR, sığdırarak değil. Çizimin dikey uzanımı giysinin
 * kendisi: üstte yaka/omuz, altta etek ucu. Yatay uzanım ise kolların ne
 * kadar yana açıldığına bağlı, o da modelin kararı. Boydan oturtunca omuz
 * çizgisi ve etek ucu TAM yerine geliyor — bildirilen şikâyetin ikisi de —
 * en ise çizimin kendi oranından çıkıyor. Sığdırılsaydı (`meet`) kolları
 * açık bir çizim enden sıkışır, etek ucu göbekte kalırdı.
 *
 * TAVANA ÇARPARSA ölçek enden bağlanıyor ve kutu ÜST kenardan çakılıyor:
 * omuz yine doğru yerde, etek ucu yukarıda kalıyor. Üst kenar iki durumda
 * da sabit — omuz, yerine oturması en çok işe yarayan hat.
 */
function zarfaOturt(sinir: GiysiSiniri): AltlikKutu {
  let kareBoy = GIYSI_ZARFI.h / sinir.h;
  let kareEn = kareBoy * sinir.oran;
  const giysiEn = sinir.w * kareEn;
  if (giysiEn > EN_TAVANI) {
    const kucult = EN_TAVANI / giysiEn;
    kareBoy *= kucult;
    kareEn *= kucult;
  }
  return {
    x: -(sinir.w * kareEn) / 2 - sinir.x * kareEn,
    y: GIYSI_ZARFI.y - sinir.y * kareBoy,
    w: kareEn,
    h: kareBoy,
  };
}

const esitKutu = (a: AltlikKutu, b: AltlikKutu) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/**
 * Kutuya kullanıcı dokunmamış mı: ya yedek çerçevede duruyor ya da
 * ÖLÇÜLMÜŞ bir çerçevede. Geç gelen bir ölçüm kutuyu ancak bu doğruysa
 * yerine oturtuyor — sürgüyle kurulmuş bir ayar ölçüm yüzünden bozulmamalı.
 *
 * Ölçülmüşleri de saymak şart: ön görünümün ölçüsü oturduktan sonra arkaya
 * geçilirse arkanınki de kendi çerçevesine oturabilsin. Aynı işten çıkan
 * iki karenin payı birebir aynı değil ve kutu görünümler arasında ORTAK
 * (bkz. TOHUM ALTLIĞI bloğu), yani en son ölçülen hangisiyse kutu onun.
 */
const dokunulmamisKutu = (k: AltlikKutu, olculenler: Map<string, AltlikKutu | null>) =>
  esitKutu(k, TEKNIK_ALAN) ||
  [...olculenler.values()].some((v) => v !== null && esitKutu(k, v));

/** Hangi görünümün altlığı hangi yuvadan gelir. */
const TEKNIK_YUVA: Record<AltlikGorunum, TeknikEkseni> = {
  front: "teknik-on",
  back: "teknik-arka",
};

/** Referans şeridinde üretilen çizimlerin adı. */
const TEKNIK_ETIKET: Record<AltlikGorunum, string> = {
  front: "Teknik ön",
  back: "Teknik arka",
};

/**
 * Altlığın varsayılan çerçevesi; ölçek ve konum sürgüleri de buna göre
 * okunuyor. Teknik çizimde ÖLÇÜLEN kutu varsa o kazanıyor: sürgülerin
 * sıfır noktası ve panelin "sıfırla" düğmesi böylece kullanıcının gördüğü
 * çerçeveyi gösteriyor, ölçümün çoktan geçtiği sabiti değil.
 */
const varsayilanKutu = (
  altlik: Altlik | null,
  olculenler: Record<string, AltlikKutu>,
): AltlikKutu =>
  altlik?.tur === "teknik" ? (olculenler[altlik.src] ?? TEKNIK_ALAN) : KROKI_ALAN;

const YOKLAMA_MS = 2000;
/** Bu süre sonunda yoklama bırakılır; sunucu kendi bekçisini işletiyor. */
const YOKLAMA_TAVANI_MS = 4 * 60 * 1000;

/** Eksen kodundan okunur ad; tohum kareleri bu kodlarla etiketleniyor. */
const EKSEN_ADI: Record<string, string> = {
  doga: "Doğa",
  sanat: "Sanat",
  doku: "Doku",
  mekan: "Mekân",
  moodboard: "Moodboard",
  kumas: "Kumaş",
  branding: "Marka",
  /* "Siluet" değil "Giysi siluet": şeritteki öteki yedi kare giysi değil,
     ayrımı etiket söylemeli. */
  siluet: "Giysi siluet",
};

/**
 * Üretilen kumaş karesinin kumaş kimliği — deseni `fab-tohum` oluyor.
 *
 * `fabrics` dizisinde BİLEREK YOK: kartelada kompozisyon, gramaj, en ve
 * fiyat gibi ölçülmüş veriler var, üretilen karede yalnız görüntü var.
 * Diziye uydurma bir satır eklemek o alanları yalan söyletirdi. Kimliği
 * ada çeviren tek yer bu yüzden `kumasAdi()`; `fabrics.find()` bu kimlikte
 * undefined döner ve panelde boşluk bırakırdı.
 */
const TOHUM_KUMAS = "tohum";

function kumasAdi(id: string | null): string {
  if (!id) return "—";
  if (id === TOHUM_KUMAS) return "Üretilen kumaş karesi";
  return fabrics.find((f) => f.id === id)?.name ?? id;
}

/** Şeritteki tek kare — tohumdan gelmiş ya da burada üretilmiş olabilir. */
type Referans = Altlik & { etiket: string };

/** Tohumdaki bütün kareler: dört ilham kaynağı ve türetilmiş çıktılar. */
function tohumKareleri(tohum: StudyoTohum | null | undefined): Referans[] {
  if (!tohum) return [];
  const adlar = new Map(tohum.kareler.map((k) => [k.url, EKSEN_ADI[k.etiket] ?? k.etiket]));
  const turetilmis = Object.values(tohum.turetilmis).filter((u): u is string => Boolean(u));
  return [...new Set([...tohum.ilham, ...turetilmis])].map((src) => ({
    src,
    tur: "kare" as const,
    etiket: adlar.get(src) ?? "Kare",
  }));
}

/**
 * Önceki oturumda üretilmiş teknik çizimler — görünüm başına, yoksa null.
 *
 * Okuma YUVA ADIYLA, dizi sırasıyla değil: bir kare üretilememişse tohum
 * o yuvayı hiç taşımıyor ve sıraya güvenmek arkadan gelen çizimi ön
 * görünüme bindirirdi. `teknikUygula` içindeki gerekçenin aynısı.
 */
function kayitliTeknikCizimler(
  tohum: StudyoTohum | null | undefined,
): Record<AltlikGorunum, Altlik | null> {
  const oku = (g: AltlikGorunum): Altlik | null => {
    const src = tohum?.teknik[TEKNIK_YUVA[g]];
    return src ? { src, tur: "teknik" } : null;
  };
  return { front: oku("front"), back: oku("back") };
}

type Drag =
  | { kind: "pan"; startClient: Pt; startView: Pt }
  /* Taşıma artık BİRDEN ÇOK parçayı kapsıyor: `orij` her seçili parçanın
     başlangıç noktalarını kimliğine göre tutuyor. Tek tek `updateShape`
     çağırmak yerine başlangıcı saklamanın sebebi, sürükleme boyunca
     birikimli hata olmaması — her karede kaynak noktalardan yeniden
     hesaplanıyor. */
  | { kind: "move"; ids: string[]; start: Pt; orij: Record<string, Pt[]>; recorded: boolean }
  | { kind: "anchor"; id: string; index: number }
  /* Dönüşüm — ölçekleme ve döndürme tek sürükleme türünde.
     `sabit` ölçeklemenin çıpası (tutulan tutamağın KARŞISI), `merkez`
     döndürmenin ekseni, `orij` her parçanın başlangıç noktaları.
     `baslangic` tutamağın basıldığı andaki konumu: oran ve açı hep ona
     göre hesaplanıyor, bir önceki kareye göre DEĞİL — aksi hâlde
     sürükleme boyunca yuvarlama hatası birikirdi. */
  | {
      kind: "transform";
      mod: "olcek" | "dondur";
      eksen: "iki" | "yatay" | "dikey";
      sabit: Pt;
      merkez: Pt;
      baslangic: Pt;
      orij: Record<string, Pt[]>;
      recorded: boolean;
    }
  | { kind: "measure"; a: Pt }
  | { kind: "not"; a: Pt }
  | { kind: "simge"; a: Pt }
  | { kind: "simgeTasi"; id: string; start: Pt; orij: Pt; recorded: boolean }
  | { kind: "notTasi"; id: string; start: Pt; orij: Pt; okOrij?: Pt; recorded: boolean }
  | { kind: "cut"; a: Pt };

/* ------------------------------------------------------------------
   Bileşen
   ------------------------------------------------------------------ */
/**
 * `tohum` verilirse ana sayfada üretilenler ARAÇTA GÖRÜNÜR olur: kareler
 * kroki'nin arkasına altlık olarak konabiliyor, üretilen kumaş karesi de
 * dolgu deseni oluyor. Belge TOHUMLANMIYOR — parçalar, ölçüler ve dikiş
 * tipleri bir görselden çıkarılamaz; uydurulursa araç ölçmediği şeyi
 * ölçmüş gibi gösterir. Tohumsuz açılışta araç eskisiyle birebir aynı.
 */
export function FlatSketch({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [doc, setDoc] = useState<Doc>(initialDoc);
  const [undo, setUndo] = useState<Doc[]>([]);
  /* İLERİ AL. Geri al varken ileri alın olmaması, kullanıcıyı bir adım
     geri gittiği anda cezalandırıyordu: dönüş yolu yoktu. */
  const [redo, setRedo] = useState<Doc[]>([]);
  const [seri, setSeri] = useState<Seri>(VARSAYILAN_SERI);
  /* Pano — kopyalanan parça. Tarayıcı panosu DEĞİL, bilerek: sistem
     panosuna yazmak izin istiyor ve başka uygulamalardan gelen içerikle
     karışıyor; buradaki kopyala yalnız bu tuval içinde anlamlı. */
  const [pano, setPano] = useState<Shape | null>(null);
  const [kayitDurumu, setKayitDurumu] = useState<"bos" | "yuklendi" | "yazildi">("bos");
  const [view, setView] = useState<ViewId>("front");
  const [tool, setTool] = useState<Tool>("select");
  const [stitch, setStitch] = useState<Stitch>("duz");
  /* Aktif kalınlık — dikiş tipi ve eğri anahtarıyla aynı desen: araç
     çubuğunda seçilen değer YENİ parçaya varsayılan oluyor, seçili parça
     varsa ona da uygulanıyor. */
  const [kalinlik, setKalinlik] = useState<Kalinlik>("orta");
  const [yakalamaAcik, setYakalamaAcik] = useState(true);
  const [simgeTur, setSimgeTur] = useState<SimgeTur>("grainline");
  const [simgeAcik, setSimgeAcik] = useState(false);
  const [smooth, setSmooth] = useState(true);
  const [stitchOpen, setStitchOpen] = useState(false);
  /* SEÇİM İKİ PARÇALI: bir BİRİNCİL parça (`selectedId`) ve Shift ile
     eklenenler (`ekSecim`). Tek bir dizi tutmak daha basit görünüyordu ama
     yanlış olurdu: panel tek bir parçanın adını, dikişini ve kalınlığını
     düzenliyor; "hangisinin ayarları gösteriliyor" sorusunun bir cevabı
     olmak zorunda. Vektör araçlarındaki "etkin nesne" kavramı da bu. */
  const [selectedId, setSelectedId] = useState<string | null>("s-front");
  const [ekSecim, setEkSecim] = useState<string[]>([]);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [hover, setHover] = useState<Pt | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [temp, setTemp] = useState<Pt | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [userView, setUserView] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  /* AÇI KİLİDİ İŞARETÇİDEN DEĞİL KLAVYEDEN OKUNUYOR.
     `e.shiftKey` yalnız o olayın taşıdığı anlık durumu veriyor ve
     kullanıcının gerçek alışkanlığını karşılamıyor: insanlar döndürmeye
     BAŞLAYIP sonra Shift'e basarak kilitliyor, sonra bırakıp serbest
     bırakıyor. Ayrı bir bayrak ikisini de çalıştırıyor. */
  const [shiftDown, setShiftDown] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  /* AÇILIŞTA ÖNCEKİ ÇİZİMLER GERİ YÜKLENİYOR. Teknik çizim ÜCRETLİ çıktı:
     her yuva bir üretim demek. Eskiden yalnız bileşen durumunda dururdu ve
     sayfa tazelenince siliniyordu — kareler sunucuda dururken kullanıcı
     onları bulacak adresi kaybediyor, aynı çizimi ikinci kez ödüyordu.
     Aşağıdaki üç durum bu yüzden tohumdan besleniyor: altlık, altlığın
     çerçevesi ve referans şeridi. */
  const kayitliTeknik = kayitliTeknikCizimler(tohum);

  /* Açılış altlığı: kayıtlı teknik çizim → giysi silueti → moodboard →
     seçilen ilham karesi. Çizim en önde çünkü fotoğraf zaten onun YEDEĞİ
     (bkz. TEKNİK ÇİZİM bloğu); geri gelen çizimi altlığa koymamak, onu
     üretmiş olmanın bütün sebebini boşa çıkarırdı.
     Fotoğraf yedeği: siluet önce çünkü tek GİYSİ olan o; ötekiler
     tasarımın kaynağı ya da özeti, üstünden kalıp çizilecek şey değil.
     Aynı kare iki görünüme de konuyor — siluet ÖNDEN bir kare ve arkada
     zayıf kalıyor, teknik çizim tam bu boşluğu dolduruyor. Tek yuva
     dönmüşse öteki görünüm kendi yedeğinde kalıyor; üretimden tek kare
     geldiğindeki davranışın aynısı. Kullanıcı panelden istediğine
     geçebiliyor. Tohum yalnız ilk kurulumda okunuyor. */
  const [altliklar, setAltliklar] = useState<Record<AltlikGorunum, Altlik | null>>(() => {
    const src = tohum?.turetilmis.siluet ?? tohum?.turetilmis.moodboard ?? tohum?.secilen ?? null;
    const ilk: Altlik | null = src ? { src, tur: "kare" } : null;
    return { front: kayitliTeknik.front ?? ilk, back: kayitliTeknik.back ?? ilk };
  });
  const [altlikOpaklik, setAltlikOpaklik] = useState(ALTLIK_OPAKLIK);
  /* Çerçeve `varsayilanKutu()` üzerinden: teknik çizim ile fotoğraf ayrı
     kutulara oturuyor ve ölçüler iki yerde yazılmamalı. Tek yuva dönmüş
     olsa bile kutu çizimin çerçevesine geçiyor — `teknikUygula` da öyle
     yapıyor, geri yüklenen çizim taze üretilenden ayırt edilmemeli.
     Hiç çizim yoksa `null` gidiyor ve kutu KROKI_ALAN kalıyor.
     Açılışta ölçüm daha yapılmadığı için boş harita gidiyor: kutu
     TEKNIK_ALAN'dan başlıyor, ölçüm gelince aşağıdaki etki oturtuyor. */
  const [altlikKutu, setAltlikKutu] = useState<AltlikKutu>(() =>
    varsayilanKutu(kayitliTeknik.front ?? kayitliTeknik.back, {}),
  );
  /* Ölçülmüş çerçeveler, kare ADRESİNE göre. Kare başına tutuluyor çünkü
     her çizimin payı kendine: aynı işten çıkan ön ve arka bile birebir
     aynı kadrajda değil. Bir kez ölçülen bir daha ölçülmüyor. */
  const [olculenKutular, setOlculenKutular] = useState<Record<string, AltlikKutu>>({});
  /* Üretilen teknik çizimler altlıktan AYRI tutuluyor: kullanıcı altlığı
     fotoğrafa çevirdiğinde çizim şeritten düşmemeli, geri dönebilmeli.
     Kayıtlı çizimler de buraya giriyor — şeritte "Teknik ön/arka" diye
     taze üretilmiş gibi görünmelerinin tek yolu bu. */
  const [teknikCizim, setTeknikCizim] = useState<Record<AltlikGorunum, string | null>>(() => ({
    front: kayitliTeknik.front?.src ?? null,
    back: kayitliTeknik.back?.src ?? null,
  }));
  const [teknikIsId, setTeknikIsId] = useState<string | null>(null);
  const [teknikCalisiyor, setTeknikCalisiyor] = useState(false);
  const [teknikAdim, setTeknikAdim] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* ---------- görünüm (pan/zoom) ---------- */
  const fitView = useCallback(
    (w: number, h: number) => {
      const box = view === "detail" ? { minX: -120, minY: -60, w: 340, h: 180 } : { minX: -130, minY: -30, w: 360, h: 740 };
      const zoom = Math.min((w - 80) / box.w, (h - 120) / box.h, 2.2);
      return { zoom, x: box.minX + box.w / 2 - w / 2 / zoom, y: box.minY + box.h / 2 - h / 2 / zoom };
    },
    [view],
  );
  const vp = userView ?? fitView(size.w, size.h);
  const vpRef = useRef(vp);
  const sizeRef = useRef(size);
  useEffect(() => {
    vpRef.current = vp;
    sizeRef.current = size;
  }, [vp, size]);

  // boyut gözlemi ve tekerlekle yakınlaştırma (pasif olmayan dinleyici)
  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(wrap);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const v = vpRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = v.x + mx / v.zoom;
      const cy = v.y + my / v.zoom;
      setUserView({ zoom, x: cx - mx / zoom, y: cy - my / zoom });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      svg.removeEventListener("wheel", onWheel);
    };
  }, []);

  const toCanvas = (clientX: number, clientY: number): Pt => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: vp.x + (clientX - rect.left) / vp.zoom, y: vp.y + (clientY - rect.top) / vp.zoom };
  };
  const zoomBy = (factor: number) => {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, vp.zoom * factor));
    const cx = vp.x + size.w / 2 / vp.zoom;
    const cy = vp.y + size.h / 2 / vp.zoom;
    setUserView({ zoom, x: cx - size.w / 2 / zoom, y: cy - size.h / 2 / zoom });
  };

  /* ---------- doküman yardımcıları ---------- */
  const cur = doc[view];
  const selected = cur.shapes.find((s) => s.id === selectedId) ?? null;
  const secimIdleri = selectedId ? [selectedId, ...ekSecim.filter((x) => x !== selectedId)] : ekSecim;
  /* Sıra BELGEDEKİ sıra, seçim sırası değil: hizalama ve dağıtma soldan
     sağa çalışıyor ve seçim sırasına bağlı olsaydı aynı seçim iki farklı
     sonuç verirdi. */
  const secililer = cur.shapes.filter((s) => secimIdleri.includes(s.id));
  const cokluSecim = secililer.length > 1;

  const secimeAl = (id: string, ekle: boolean) => {
    if (!ekle) {
      setSelectedId(id);
      setEkSecim([]);
      return;
    }
    if (id === selectedId) {
      /* Birincil parça Shift ile tıklanınca seçimden düşüyor ve yerine
         ek seçimin ilki birincil oluyor — yoksa seçim başsız kalırdı. */
      const [yeni, ...kalan] = ekSecim;
      setSelectedId(yeni ?? null);
      setEkSecim(kalan);
      return;
    }
    setEkSecim((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  };
  const olcumGuncelle = (id: string, yama: Partial<Measure>, kaydet = true) => {
    const uygula = (d: ViewDoc): ViewDoc => ({ ...d, measures: d.measures.map((m) => (m.id === id ? { ...m, ...yama } : m)) });
    if (kaydet) commit(uygula);
    else setDoc((d) => ({ ...d, [view]: uygula(d[view]) }));
  };
  const olcumSil = (id: string) =>
    commit((d) => ({ ...d, measures: d.measures.filter((m) => m.id !== id) }));

  const selectedSimge = cur.simgeler.find((x) => x.id === selectedId) ?? null;
  const simgeGuncelle = (id: string, yama: Partial<Simge>, kaydet = true) => {
    const uygula = (d: ViewDoc): ViewDoc => ({ ...d, simgeler: d.simgeler.map((x) => (x.id === id ? { ...x, ...yama } : x)) });
    if (kaydet) commit(uygula);
    else setDoc((d) => ({ ...d, [view]: uygula(d[view]) }));
  };
  const selectedNot = cur.notlar.find((n) => n.id === selectedId) ?? null;
  const notGuncelle = (id: string, yama: Partial<Not>, kaydet = true) => {
    const uygula = (d: ViewDoc): ViewDoc => ({ ...d, notlar: d.notlar.map((n) => (n.id === id ? { ...n, ...yama } : n)) });
    /* Yazarken geri al yığınına HER TUŞ için giriş atmıyoruz — parça adı
       alanı da aynı gerekçeyle böyle çalışıyor. */
    if (kaydet) commit(uygula);
    else setDoc((d) => ({ ...d, [view]: uygula(d[view]) }));
  };
  const secimiTemizle = () => {
    setSelectedId(null);
    setEkSecim([]);
  };
  const commit = (mutate: (d: ViewDoc) => ViewDoc) => {
    setUndo((u) => [...u.slice(-29), doc]);
    /* Yeni bir iş, ileri al yığınını geçersiz kılıyor: geri gidip başka
       bir yol seçtikten sonra eski dalın ileri alınması anlamsız. */
    setRedo([]);
    setDoc((d) => ({ ...d, [view]: mutate(d[view]) }));
  };
  const updateShape = (id: string, patch: Partial<Shape>, record = true) => {
    const apply = (d: ViewDoc): ViewDoc => ({ ...d, shapes: d.shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    if (record) commit(apply);
    else setDoc((d) => ({ ...d, [view]: apply(d[view]) }));
  };
  const undoLast = () => {
    if (undo.length === 0) return;
    setRedo((r) => [...r.slice(-29), doc]);
    setDoc(undo[undo.length - 1]);
    setUndo(undo.slice(0, -1));
  };
  const redoLast = () => {
    if (redo.length === 0) return;
    setUndo((u) => [...u.slice(-29), doc]);
    setDoc(redo[redo.length - 1]);
    setRedo(redo.slice(0, -1));
  };
  const removeSelected = () => {
    if (!secimIdleri.length) return;
    commit((d) => ({
      ...d,
      shapes: d.shapes.filter((s) => !secimIdleri.includes(s.id)),
      measures: d.measures.filter((m) => !secimIdleri.includes(m.id)),
      notlar: d.notlar.filter((n) => !secimIdleri.includes(n.id)),
      simgeler: d.simgeler.filter((x) => !secimIdleri.includes(x.id)),
    }));
    secimiTemizle();
  };
  const hitTest = (p: Pt): Shape | null => {
    const tol = 6 / vp.zoom;
    for (let i = cur.shapes.length - 1; i >= 0; i--) {
      const s = cur.shapes[i];
      if (!s.visible) continue;
      const poly = samplePath(s.points, s.closed, s.smooth, 4);
      if (s.closed && pointInPolygon(p, poly)) return s;
      if (distToPolyline(p, poly, s.closed) < tol) return s;
    }
    return null;
  };
  const finishDraft = (close: boolean) => {
    const pts = simplify(draft, 2 / vp.zoom);
    if (pts.length >= (close ? 3 : 2)) {
      const id = uid();
      const n = cur.shapes.length + 1;
      commit((d) => ({
        ...d,
        shapes: [...d.shapes, { id, name: `Parça ${n}`, points: pts, closed: close, smooth, stitch, fabricId: null, visible: true, kalinlik }],
      }));
      setSelectedId(id);
    }
    setDraft([]);
  };
  /* ---------- parça işlemleri ----------

     AYNALAMA, flat çiziminin ilk hamlesi: giysi simetriktir, tasarımcı
     yarısını çizip karşısını üretir. İki ayrı ihtiyaç var ve ikisi de
     gerçek — bu yüzden iki işlem:

       · `aynala`      — parçayı KENDİ ekseninde çevirir (ters duran bir
                         cebi düzeltmek, sağ kolu sola çevirmek).
       · `karsiYari`   — parçayı tuvalin ORTA ÇİZGİSİNE (x=0, kroki de
                         oraya simetrik) göre yansıtıp KOPYA üretir; yani
                         "yarısını çizdim, öbür yarısını ver".

     NOKTA SIRASI TERSİNİYOR. Yansıma sarım yönünü çeviriyor; zigzag ve
     sürfile ise dikişi segmentin normaline göre çiziyor. Sıra
     terslenmezse aynalanan parçanın dikişleri içeri düşerdi — görünen
     hata küçük ama teknik çizimde dikişin hangi tarafta olduğu bilgidir. */
  const yansit = (s: Shape, eksenX: number): Pt[] =>
    s.points.map((p) => ({ x: 2 * eksenX - p.x, y: p.y })).reverse();

  const aynala = () => {
    if (!selected) return;
    const k = bbox(selected.points);
    const merkez = k.minX + k.w / 2;
    updateShape(selected.id, { points: yansit(selected, merkez) });
  };

  const karsiYari = () => {
    if (!selected) return;
    const id = uid();
    const kopya: Shape = { ...selected, id, name: `${selected.name} · karşı`, points: yansit(selected, 0) };
    commit((d) => ({ ...d, shapes: [...d.shapes, kopya] }));
    setSelectedId(id);
    setToast("Karşı yarı üretildi");
  };

  /* Çoğaltma kaydırılarak konuyor: üst üste bindirilseydi kullanıcı yeni
     parçanın oluştuğunu göremez, iki kez basıp üç kopya biriktirirdi.
     12 birim = 3 cm — fark edilecek kadar büyük, yerini kaybettirmeyecek
     kadar küçük. */
  const KAYDIRMA = 12;
  const cogalt = (kaynak: Shape | null = selected) => {
    if (!kaynak) return;
    const id = uid();
    const kopya: Shape = {
      ...kaynak,
      id,
      name: `${kaynak.name} kopya`,
      points: kaynak.points.map((p) => ({ x: p.x + KAYDIRMA, y: p.y + KAYDIRMA })),
    };
    commit((d) => ({ ...d, shapes: [...d.shapes, kopya] }));
    setSelectedId(id);
  };

  /* Katman sırası. Dizinin SONU en üstte çiziliyor (SVG boyama sırası),
     o yüzden "öne getir" sona taşımak demek. */
  const katmanaTasi = (yon: "on" | "arka") => {
    if (!selectedId) return;
    commit((d) => {
      const i = d.shapes.findIndex((x) => x.id === selectedId);
      if (i < 0) return d;
      const kalan = d.shapes.filter((x) => x.id !== selectedId);
      const oge = d.shapes[i];
      return { ...d, shapes: yon === "on" ? [...kalan, oge] : [oge, ...kalan] };
    });
  };

  /* ---------- yakalama (snap) ----------

     8 ve 40 birimlik ızgarayı ÇİZİYORDUK ama hiçbir şey ona yakalanmıyordu
     — yani ızgara süstü. Yakalama üç hedefe bakıyor ve üçü de teknik
     çizimde gerçek bir anlam taşıyor:

       · ORTA ÇİZGİ (x=0) — kroki oraya simetrik; giysinin ön ortası,
         yaka ortası ve pat hattı hep o çizgide.
       · IZGARA (8 birim = 2 cm) — ölçülü çizim.
       · BAŞKA PARÇALARIN NOKTALARI — iki parçayı dikiş hattında
         buluşturmanın tek yolu.

     Eşik EKRAN PİKSELİ cinsinden: yakınlaştırınca yakalama gücü
     değişmemeli, yoksa 8x'te her şey birbirine yapışır, 0,25x'te hiçbir
     şey tutmazdı. */
  const YAKALAMA_PX = 6;
  const IZGARA_ADIM = 8;

  const [yakalamaCizgisi, setYakalamaCizgisi] = useState<{ x?: number; y?: number } | null>(null);

  /** Bir eksende en yakın hedefi bulur; eşiğin dışındaysa değeri korur. */
  const eksendeYakala = (deger: number, hedefler: number[], esik: number) => {
    let enYakin = esik;
    let sonuc: number | null = null;
    for (const h of hedefler) {
      const u = Math.abs(deger - h);
      if (u < enYakin) {
        enYakin = u;
        sonuc = h;
      }
    }
    return sonuc;
  };

  /**
   * Bir noktayı yakalar ve kılavuz çizgisini günceller.
   *
   * X ve Y AYRI AYRI yakalanıyor: nokta yalnız dikeyde ızgaraya oturup
   * yatayda serbest kalabilmeli. Tek bir "en yakın nokta" araması bunu
   * yapamaz ve çizimi ızgaraya zincirlerdi.
   */
  const noktayiYakala = (p: Pt, hariçId?: string, hariçIndeks?: number): Pt => {
    if (!yakalamaAcik) {
      setYakalamaCizgisi(null);
      return p;
    }
    const esik = YAKALAMA_PX / vp.zoom;
    const digerler = cur.shapes
      .filter((s) => s.visible)
      .flatMap((s) => s.points.filter((_, i) => !(s.id === hariçId && i === hariçIndeks)));
    const x = eksendeYakala(p.x, [0, Math.round(p.x / IZGARA_ADIM) * IZGARA_ADIM, ...digerler.map((q) => q.x)], esik);
    const y = eksendeYakala(p.y, [Math.round(p.y / IZGARA_ADIM) * IZGARA_ADIM, ...digerler.map((q) => q.y)], esik);
    setYakalamaCizgisi(x === null && y === null ? null : { x: x ?? undefined, y: y ?? undefined });
    return { x: x ?? p.x, y: y ?? p.y };
  };

  /**
   * Taşımada yakalanan şey noktanın kendisi değil, seçimin KUTUSU:
   * sol kenarı, ortası ve sağ kenarı. Bir parçayı ızgaraya oturturken
   * tasarımcının baktığı yer kenardır, rastgele bir çapa değil.
   */
  const tasimayiYakala = (noktalar: Pt[], dx: number, dy: number) => {
    if (!yakalamaAcik) {
      setYakalamaCizgisi(null);
      return { dx, dy };
    }
    const esik = YAKALAMA_PX / vp.zoom;
    const k = bbox(noktalar.map((q) => ({ x: q.x + dx, y: q.y + dy })));
    const xler = [k.minX, k.minX + k.w / 2, k.maxX];
    const yler = [k.minY, k.minY + k.h / 2, k.maxY];
    let duzeltX: number | null = null;
    let duzeltY: number | null = null;
    let cizgi: { x?: number; y?: number } | null = null;
    for (const v of xler) {
      const h = eksendeYakala(v, [0, Math.round(v / IZGARA_ADIM) * IZGARA_ADIM], esik);
      if (h !== null && (duzeltX === null || Math.abs(h - v) < Math.abs(duzeltX))) {
        duzeltX = h - v;
        cizgi = { ...(cizgi ?? {}), x: h };
      }
    }
    for (const v of yler) {
      const h = eksendeYakala(v, [Math.round(v / IZGARA_ADIM) * IZGARA_ADIM], esik);
      if (h !== null && (duzeltY === null || Math.abs(h - v) < Math.abs(duzeltY))) {
        duzeltY = h - v;
        cizgi = { ...(cizgi ?? {}), y: h };
      }
    }
    setYakalamaCizgisi(cizgi);
    return { dx: dx + (duzeltX ?? 0), dy: dy + (duzeltY ?? 0) };
  };

  /* ---------- hizalama ve dağıtma ----------

     HEDEF SEÇİMİN KUTUSU, "anahtar nesne" DEĞİL. Illustrator seçilen son
     nesneyi çıpa yapabiliyor; burada kasten seçim kutusuna hizalıyoruz,
     çünkü tıklama sırası ekranda görünmüyor — görünmeyen bir duruma bağlı
     sonuç, aynı seçimde iki farklı davranış demek olurdu.

     Parçalar KUTULARIYLA taşınıyor, noktalarıyla değil: bir cebin sol
     kenarı hizalanırken cebin kendi biçimi değişmemeli. */
  const secimKutusu = () => bbox(secililer.flatMap((s) => s.points));

  const secimiTasi = (kaydir: (s: Shape) => Pt) =>
    commit((d) => ({
      ...d,
      shapes: d.shapes.map((s) => {
        if (!secimIdleri.includes(s.id)) return s;
        const k = kaydir(s);
        if (!k.x && !k.y) return s;
        return { ...s, points: s.points.map((q) => ({ x: q.x + k.x, y: q.y + k.y })) };
      }),
    }));

  type Hiza = "sol" | "yatayOrta" | "sag" | "ust" | "dikeyOrta" | "alt";
  const hizala = (kenar: Hiza) => {
    if (secililer.length < 2) return;
    const h = secimKutusu();
    secimiTasi((s) => {
      const k = bbox(s.points);
      switch (kenar) {
        case "sol": return { x: h.minX - k.minX, y: 0 };
        case "sag": return { x: h.maxX - k.maxX, y: 0 };
        case "yatayOrta": return { x: h.minX + h.w / 2 - (k.minX + k.w / 2), y: 0 };
        case "ust": return { x: 0, y: h.minY - k.minY };
        case "alt": return { x: 0, y: h.maxY - k.maxY };
        case "dikeyOrta": return { x: 0, y: h.minY + h.h / 2 - (k.minY + k.h / 2) };
      }
    });
  };

  /* Dağıtma MERKEZLERİ eşitliyor, boşlukları değil. İkisi de meşru ama
     merkez daha öngörülebilir: farklı genişlikte parçalarda boşluk eşitleme
     görsel olarak "kaymış" duruyor. En baştaki ve en sondaki parça yerinde
     kalıyor — dağıtmanın seçimi büyütmemesi gerekiyor. */
  const dagit = (eksen: "yatay" | "dikey") => {
    if (secililer.length < 3) return;
    const merkez = (s: Shape) => {
      const k = bbox(s.points);
      return eksen === "yatay" ? k.minX + k.w / 2 : k.minY + k.h / 2;
    };
    const sirali = [...secililer].sort((a, b) => merkez(a) - merkez(b));
    const ilk = merkez(sirali[0]);
    const adim = (merkez(sirali[sirali.length - 1]) - ilk) / (sirali.length - 1);
    const hedef = new Map(sirali.map((s, i) => [s.id, ilk + adim * i]));
    secimiTasi((s) => {
      const d = (hedef.get(s.id) ?? merkez(s)) - merkez(s);
      return eksen === "yatay" ? { x: d, y: 0 } : { x: 0, y: d };
    });
  };

  /* ---------- yola nokta ekleme / silme ----------

     Eğri motorumuz "az noktayla köşe, çok noktayla eğri" kuralına dayanıyor
     (bkz. lib/geometry.ts). Yani kullanıcının en çok ihtiyaç duyduğu
     düzeltme aracı nokta EKLEMEK — ve bugüne kadar yalnız çizerken
     mümkündü, çizim bitince yol donuyordu.

     Eklenen nokta tıklanan yere değil, en yakın kontrol kenarına DÜŞÜRÜLEN
     dik izdüşüme konuyor: tıklama eğrinin üstüne isabet ediyor ama eğri
     kontrol çokgeninin dışında geziyor, tıklanan noktayı olduğu gibi
     eklemek parçayı oraya doğru şişirirdi. İzdüşüm ise biçimi neredeyse
     hiç değiştirmiyor. */
  const enYakinKenar = (s: Shape, p: Pt) => {
    const n = s.points.length;
    const kenarSayisi = s.closed ? n : n - 1;
    let enIyi = { indeks: 0, nokta: p, uzaklik: Infinity };
    for (let i = 0; i < kenarSayisi; i++) {
      const a = s.points[i], b = s.points[(i + 1) % n];
      const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
      const q = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
      const u = dist(p, q);
      if (u < enIyi.uzaklik) enIyi = { indeks: i, nokta: q, uzaklik: u };
    }
    return enIyi;
  };

  const noktaEkle = (p: Pt) => {
    const hedef = hitTest(p) ?? selected;
    if (!hedef) return;
    const { indeks, nokta } = enYakinKenar(hedef, p);
    updateShape(hedef.id, { points: [...hedef.points.slice(0, indeks + 1), nokta, ...hedef.points.slice(indeks + 1)] });
    setSelectedId(hedef.id);
    setEkSecim([]);
  };

  const noktaSil = (id: string, indeks: number) => {
    const hedef = cur.shapes.find((x) => x.id === id);
    if (!hedef) return;
    /* Alt sınır: kapalı parça üçgenden aşağı inemez, açık yol doğrudan.
       Altına inmek parçayı çizilemez hâle getirirdi. */
    const enAz = hedef.closed ? 3 : 2;
    if (hedef.points.length <= enAz) {
      setToast(hedef.closed ? "Kapalı parça en az üç nokta ister" : "Yol en az iki nokta ister");
      return;
    }
    updateShape(id, { points: hedef.points.filter((_, i) => i !== indeks) });
  };

  const applyFabric = (shapeId: string, fabricId: string | null) => {
    updateShape(shapeId, { fabricId });
    /* Ad `kumasAdi()` üzerinden: tohum kumaşı kartelada olmadığı için
       `fabrics.find()` onda sessizce hiçbir şey söylemezdi. */
    if (fabricId) setToast(`${kumasAdi(fabricId)} uygulandı`);
  };

  /* ---------- kayıt ----------

     İKİ ETKİ, BİR BAYRAK. Yükleme yalnız bir kez çalışıyor; yazma ise her
     değişiklikte. `hazirRef` ikisinin çarpışmasını önlüyor: yükleme
     bitmeden yazma çalışırsa, kayıtlı belge daha okunmadan demo belgesiyle
     ÜZERİNE YAZILIRDI — yani kaydın kendisi kaydı silerdi.

     Yükleme neden `useState` başlatıcısında değil: `localStorage` sunucuda
     yok. Başlatıcıda okunsaydı sunucu demo belgesini, istemci kayıtlı
     belgeyi üretir ve hidrasyon uyuşmazlığı çıkardı. */
  const hazirRef = useRef(false);
  useEffect(() => {
    const kayit = kayitOku();
    if (kayit) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect --
         Kural haklı ama bu durum onun hedefi değil. Etki BİR KEZ çalışıyor
         (boş bağımlılık) ve tek bir ek çizim yaptırıyor; "basamaklı render"
         diye bir şey doğmuyor. Alternatifleri denedim ve ikisi de daha
         kötü: `useState` başlatıcısında okumak sunucuda `localStorage`
         olmadığı için hidrasyon uyuşmazlığı verir, `useSyncExternalStore`
         ise belgeyi türetilmiş değere çevirip `setDoc`'u imkânsızlaştırır.
         Aynı desen depoda tema anahtarında da var (tema-anahtari.tsx). */
      setDoc(kayit.doc);
      setSeri(kayit.seri);
      setKayitDurumu("yuklendi");
    }
    hazirRef.current = true;
  }, []);

  useEffect(() => {
    if (!hazirRef.current) return;
    /* Gecikme ŞART: nokta sürüklerken `updateShape(..., false)` her
       karede çalışıyor. Geciktirilmezse saniyede altmış kez JSON
       üretilip diske yazılırdı. */
    const zaman = window.setTimeout(() => {
      kayitYaz(doc, seri);
      setKayitDurumu("yazildi");
    }, 400);
    return () => window.clearTimeout(zaman);
  }, [doc, seri]);

  /* ---------- klavye ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* Shift takibi metin alanı denetiminden ÖNCE: bir alanda basılıp
         dışarıda bırakılan Shift bayrağı asılı bırakırdı. */
      if (e.key === "Shift") setShiftDown(true);
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.code === "Space") {
        if (!e.repeat) setSpaceDown(true);
        e.preventDefault();
        return;
      }
      const komut = e.ctrlKey || e.metaKey;
      if (komut && e.key.toLowerCase() === "z") {
        e.preventDefault();
        /* Shift+Ctrl+Z ileri al — Ctrl+Y değil: Ctrl+Y tarayıcıda geçmişi
           açıyor ve vektör araçlarının tamamı Shift'li biçimi kullanıyor. */
        if (e.shiftKey) redoLast();
        else undoLast();
        return;
      }
      if (komut && e.key.toLowerCase() === "d") {
        e.preventDefault();
        cogalt();
        return;
      }
      if (komut && e.key.toLowerCase() === "c") {
        if (selected) setPano(selected);
        return;
      }
      if (komut && e.key.toLowerCase() === "v") {
        e.preventDefault();
        cogalt(pano);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "]") {
        katmanaTasi("on");
        return;
      }
      if (k === "[") {
        katmanaTasi("arka");
        return;
      }
      if (k === "v") setTool("select");
      else if (k === "p") setTool("pen");
      else if (k === "m") setTool("measure");
      else if (k === "n") setTool("not");
      else if (k === "s") setTool("simge");
      else if (k === "c") setTool("cut");
      else if (k === "h") setTool("hand");
      else if (k === "escape") {
        setDraft([]);
        setSelectedId(null);
        setStitchOpen(false);
      } else if (k === "enter") {
        if (draft.length) finishDraft(false);
      } else if (k === "delete" || k === "backspace") {
        if (draft.length) setDraft((d) => d.slice(0, -1));
        else removeSelected();
      } else if (k === "+" || k === "=") zoomBy(1.2);
      else if (k === "-") zoomBy(1 / 1.2);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
      if (e.key === "Shift") setShiftDown(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  });

  /* ---------- işaretçi ---------- */
  const panning = tool === "hand" || spaceDown;

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button === 1 || panning) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ kind: "pan", startClient: { x: e.clientX, y: e.clientY }, startView: { x: vp.x, y: vp.y } });
      return;
    }
    if (e.button !== 0) return;
    const p = toCanvas(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    setStitchOpen(false);
    setSimgeAcik(false);
    if (tool === "select") {
      const hit = hitTest(p);
      if (hit) {
        /* Zaten seçili bir parçaya Shift'siz basmak seçimi BOZMUYOR:
           birden çok parça seçip birlikte taşımanın tek yolu bu. Shift'siz
           tıklama yalnız seçimin DIŞINDAKİ bir parçaya basıldığında
           seçimi tekilleştiriyor. */
        const zatenSecili = secimIdleri.includes(hit.id);
        if (e.shiftKey) secimeAl(hit.id, true);
        else if (!zatenSecili) secimeAl(hit.id, false);
        else setSelectedId(hit.id);

        const tasinacak = e.shiftKey ? [] : zatenSecili ? secimIdleri : [hit.id];
        if (tasinacak.length) {
          const orij: Record<string, Pt[]> = {};
          for (const sid of tasinacak) {
            const parca = cur.shapes.find((x) => x.id === sid);
            if (parca) orij[sid] = parca.points;
          }
          setDrag({ kind: "move", ids: Object.keys(orij), start: p, orij, recorded: false });
        }
      } else if (!e.shiftKey) {
        secimiTemizle();
      }
    } else if (tool === "pen") {
      if (draft.length >= 3 && dist(p, draft[0]) < 8 / vp.zoom) {
        finishDraft(true);
      } else {
        /* Kalem de yakalıyor: ölçülü çizmenin tek yolu noktayı ızgaraya
           oturtabilmek. Kapatma kontrolü (ilk noktaya dönme) YAKALAMADAN
           ÖNCE yapılıyor — yakalanmış nokta ilk noktaya yapışırsa yol
           kendiliğinden kapanmış gibi görünürdü. */
        setDraft((d) => [...d, noktayiYakala(p)]);
      }
    } else if (tool === "measure") {
      setDrag({ kind: "measure", a: p });
      setTemp(p);
    } else if (tool === "not") {
      setDrag({ kind: "not", a: p });
      setTemp(p);
    } else if (tool === "simge") {
      setDrag({ kind: "simge", a: p });
      setTemp(p);
    } else if (tool === "cut") {
      setDrag({ kind: "cut", a: p });
      setTemp(p);
    }
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const p = toCanvas(e.clientX, e.clientY);
    setHover(p);
    if (!drag) return;
    if (drag.kind === "pan") {
      const dx = (e.clientX - drag.startClient.x) / vp.zoom;
      const dy = (e.clientY - drag.startClient.y) / vp.zoom;
      setUserView({ zoom: vp.zoom, x: drag.startView.x - dx, y: drag.startView.y - dy });
    } else if (drag.kind === "move") {
      const hamDx = p.x - drag.start.x;
      const hamDy = p.y - drag.start.y;
      if (!drag.recorded && Math.hypot(hamDx, hamDy) > 1 / vp.zoom) {
        setUndo((u) => [...u.slice(-29), doc]);
        setDrag({ ...drag, recorded: true });
      }
      const { dx, dy } = tasimayiYakala(Object.values(drag.orij).flat(), hamDx, hamDy);
      setDoc((d) => ({
        ...d,
        [view]: {
          ...d[view],
          shapes: d[view].shapes.map((s) =>
            drag.orij[s.id] ? { ...s, points: drag.orij[s.id].map((q) => ({ x: q.x + dx, y: q.y + dy })) } : s,
          ),
        },
      }));
    } else if (drag.kind === "transform") {
      if (!drag.recorded && dist(p, drag.baslangic) > 2 / vp.zoom) {
        setUndo((u) => [...u.slice(-29), doc]);
        setDrag({ ...drag, recorded: true });
      }
      donusumUygula(drag, p, shiftDown || e.shiftKey);
    } else if (drag.kind === "simgeTasi") {
      const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      if (!drag.recorded && Math.hypot(dx, dy) > 1 / vp.zoom) {
        setUndo((u) => [...u.slice(-29), doc]);
        setDrag({ ...drag, recorded: true });
      }
      setDoc((d) => ({
        ...d,
        [view]: {
          ...d[view],
          simgeler: d[view].simgeler.map((x) => (x.id === drag.id ? { ...x, p: { x: drag.orij.x + dx, y: drag.orij.y + dy } } : x)),
        },
      }));
    } else if (drag.kind === "notTasi") {
      const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      if (!drag.recorded && Math.hypot(dx, dy) > 1 / vp.zoom) {
        setUndo((u) => [...u.slice(-29), doc]);
        setDrag({ ...drag, recorded: true });
      }
      /* Kılavuz çizgisinin UCU yerinde kalıyor, yalnız etiket taşınıyor:
         ok neyi gösterdiğini söylüyor, etiket nereye sığdığını. İkisini
         birlikte taşımak callout'u anlamsız kılardı. */
      setDoc((d) => ({
        ...d,
        [view]: {
          ...d[view],
          notlar: d[view].notlar.map((n) => (n.id === drag.id ? { ...n, p: { x: drag.orij.x + dx, y: drag.orij.y + dy } } : n)),
        },
      }));
    } else if (drag.kind === "anchor") {
      const y = noktayiYakala(p, drag.id, drag.index);
      setDoc((d) => ({
        ...d,
        [view]: {
          ...d[view],
          shapes: d[view].shapes.map((s) => (s.id === drag.id ? { ...s, points: s.points.map((q, i) => (i === drag.index ? y : q)) } : s)),
        },
      }));
    } else {
      setTemp(p);
    }
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const p = toCanvas(e.clientX, e.clientY);
    if (drag.kind === "simge") {
      const id = uid();
      const uzunluk = dist(drag.a, p);
      const varsayilan = SIMGELER.find((x) => x.id === simgeTur)?.varsayilanBoy ?? 60;
      /* Sürükleme hem YÖNÜ hem BOYU veriyor; kısa bir tıklama ise dik
         duran, varsayılan boyda bir simge bırakıyor. Dokuma yönü çoğu
         zaman dikeydir, o yüzden varsayılan açı 90° (aşağı). */
      const surukledi = uzunluk > 8 / vp.zoom;
      const aci = surukledi ? (Math.atan2(p.y - drag.a.y, p.x - drag.a.x) * 180) / Math.PI : 90;
      commit((d) => ({
        ...d,
        simgeler: [...d.simgeler, { id, tur: simgeTur, p: drag.a, aci, boy: surukledi ? uzunluk : varsayilan }],
      }));
      setSelectedId(id);
      setEkSecim([]);
    } else if (drag.kind === "not") {
      const id = uid();
      /* Sürükleme uzunluğu callout ile serbest notu ayırıyor: kısa bir
         tıklama "buraya not", uzun bir sürükleme "şurayı anlatan not".
         Eşik mezuranınkiyle aynı, çünkü ikisi de aynı el hareketini
         ayırt ediyor. */
      const okVar = dist(drag.a, p) > 6 / vp.zoom;
      commit((d) => ({
        ...d,
        notlar: [...d.notlar, { id, p: okVar ? p : drag.a, metin: "Not", ...(okVar ? { ok: drag.a } : {}) }],
      }));
      setSelectedId(id);
      setEkSecim([]);
    } else if (drag.kind === "measure") {
      if (dist(drag.a, p) > 6 / vp.zoom) {
        const id = uid();
        commit((d) => ({ ...d, measures: [...d.measures, { id, a: drag.a, b: p, tolerans: VARSAYILAN_TOLERANS }] }));
        setSelectedId(id);
      }
    } else if (drag.kind === "cut") {
      if (dist(drag.a, p) > 6 / vp.zoom) {
        let pieces = 0;
        const next: Shape[] = [];
        for (const s of cur.shapes) {
          if (!s.closed) { next.push(s); continue; }
          const poly = samplePath(s.points, s.closed, s.smooth, 4);
          const split = splitPolygon(poly, drag.a, p);
          if (!split) { next.push(s); continue; }
          pieces += 1;
          next.push(
            { ...s, id: uid(), name: `${s.name} A`, points: split[0], smooth: false },
            { ...s, id: uid(), name: `${s.name} B`, points: split[1], smooth: false },
          );
        }
        if (pieces) {
          commit((d) => ({ ...d, shapes: next }));
          secimiTemizle();
        }
        setToast(pieces ? `${pieces} parça ikiye bölündü` : "Kesim çizgisi bir parçadan geçmedi");
      }
    }
    setDrag(null);
    setTemp(null);
    setYakalamaCizgisi(null);
  }

  /* ---------- dönüşüm kutusu ----------

     KÖŞE ORANLI, KENAR TEK EKSENLİ. Çoğu vektör aracında köşe serbest,
     Shift'le oranlı. Burada tersi bilerek: teknik çizimde bir parçayı
     yanlışlıkla ezmek sessiz ve pahalı bir hata (kalıp oranı bozulur,
     ölçü tablosu yanlış çıkar), oysa TEK EKSENDE esnetmek ayrı ve bilinçli
     bir istek. İkisini iki ayrı tutamağa ayırmak, kimseyi kısayol
     ezberlemeye mecbur bırakmadan doğruyu varsayılan yapıyor.

     Ölçekleme TUTULAN TUTAMAĞIN KARŞISINI sabit tutuyor: kullanıcı bir
     köşeyi çekerken karşı köşenin yerinde kalmasını bekliyor. */
  const TUTAMAK_PAY = 8;

  const donusumKutusu = secililer.length ? bbox(secililer.flatMap((x) => x.points)) : null;

  type TutamakId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "dondur";
  const tutamakYerleri = (k: NonNullable<typeof donusumKutusu>, pay: number) => {
    const sol = k.minX - pay, sag = k.maxX + pay, ust = k.minY - pay, alt = k.maxY + pay;
    const ox = (sol + sag) / 2, oy = (ust + alt) / 2;
    return {
      nw: { x: sol, y: ust }, n: { x: ox, y: ust }, ne: { x: sag, y: ust },
      e: { x: sag, y: oy }, se: { x: sag, y: alt }, s: { x: ox, y: alt },
      sw: { x: sol, y: alt }, w: { x: sol, y: oy },
      dondur: { x: ox, y: ust - pay * 2.5 },
    } as Record<TutamakId, Pt>;
  };
  const KARSI: Record<Exclude<TutamakId, "dondur">, Exclude<TutamakId, "dondur">> = {
    nw: "se", n: "s", ne: "sw", e: "w", se: "nw", s: "n", sw: "ne", w: "e",
  };
  const EKSEN: Record<Exclude<TutamakId, "dondur">, "iki" | "yatay" | "dikey"> = {
    nw: "iki", ne: "iki", se: "iki", sw: "iki", n: "dikey", s: "dikey", e: "yatay", w: "yatay",
  };

  function onTutamakDown(e: ReactPointerEvent<SVGElement>, tutamak: TutamakId) {
    if (tool !== "select" || !donusumKutusu) return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    /* ÇIPA PARÇANIN KUTUSU, TUTAMAĞIN KUTUSU DEĞİL. Tutamaklar görünürlük
       için parçadan pay kadar dışarıda duruyor; çıpayı oraya koymak
       ölçeklemede parçanın karşı köşesini pay oranında kaydırıyordu
       (ölçüldü: 144 birimlik parça 1,268 kat büyürken sol kenar -72'den
       -69,59'a kayıyordu). Payın kendisi ekran pikseline bağlı ve sabit
       olduğu için, parça köşesi sabitken kutu köşesi de sabit kalıyor —
       yani doğru çıpa ikisini birden yerinde tutuyor.

       BAŞLANGIÇ İŞARETÇİNİN GERÇEK KONUMU, tutamağın merkezi değil: oran
       ona göre hesaplandığı için basıldığı anda 1 olmalı. Tutamağın kutu
       konumu alınsaydı, fare basıldığı anda parça pay kadar sıçrardı. */
    const yerler = tutamakYerleri(donusumKutusu, 0);
    const merkez = { x: donusumKutusu.minX + donusumKutusu.w / 2, y: donusumKutusu.minY + donusumKutusu.h / 2 };
    const orij: Record<string, Pt[]> = {};
    for (const x of secililer) orij[x.id] = x.points;
    setDrag({
      kind: "transform",
      mod: tutamak === "dondur" ? "dondur" : "olcek",
      eksen: tutamak === "dondur" ? "iki" : EKSEN[tutamak],
      sabit: tutamak === "dondur" ? merkez : yerler[KARSI[tutamak]],
      merkez,
      baslangic: toCanvas(e.clientX, e.clientY),
      orij,
      recorded: false,
    });
  }

  /** Sürükleme boyunca dönüşümü uygular. */
  const donusumUygula = (d: Extract<Drag, { kind: "transform" }>, p: Pt, shift: boolean) => {
    const donustur = (q: Pt): Pt => {
      if (d.mod === "dondur") {
        const a0 = Math.atan2(d.baslangic.y - d.merkez.y, d.baslangic.x - d.merkez.x);
        let aci = Math.atan2(p.y - d.merkez.y, p.x - d.merkez.x) - a0;
        /* Shift 15°'ye kilitliyor — teknik çizimde açılar genelde yuvarlak
           ve serbest döndürme "biraz eğri" parçalar bırakıyor. */
        if (shift) aci = Math.round(aci / (Math.PI / 12)) * (Math.PI / 12);
        const c = Math.cos(aci), sn = Math.sin(aci);
        const dx = q.x - d.merkez.x, dy = q.y - d.merkez.y;
        return { x: d.merkez.x + dx * c - dy * sn, y: d.merkez.y + dx * sn + dy * c };
      }
      /* Ölçek, sabit noktaya olan UZAKLIK oranından: köşede iki eksene
         birden uygulanınca parça oranını koruyor, kenarda tek eksene
         uygulanınca esniyor. Alt sınır sıfırdan geçip parçayı aynalamayı
         engelliyor; aynalamanın kendi düğmesi var. */
      const enAz = 0.02;
      let sx = 1, sy = 1;
      if (d.eksen === "iki") {
        const b = dist(d.baslangic, d.sabit);
        sx = sy = b < 1e-6 ? 1 : Math.max(enAz, dist(p, d.sabit) / b);
      } else if (d.eksen === "yatay") {
        const b = d.baslangic.x - d.sabit.x;
        sx = Math.abs(b) < 1e-6 ? 1 : Math.max(enAz, (p.x - d.sabit.x) / b);
      } else {
        const b = d.baslangic.y - d.sabit.y;
        sy = Math.abs(b) < 1e-6 ? 1 : Math.max(enAz, (p.y - d.sabit.y) / b);
      }
      return { x: d.sabit.x + (q.x - d.sabit.x) * sx, y: d.sabit.y + (q.y - d.sabit.y) * sy };
    };
    setDoc((belge) => ({
      ...belge,
      [view]: {
        ...belge[view],
        shapes: belge[view].shapes.map((x) => (d.orij[x.id] ? { ...x, points: d.orij[x.id].map(donustur) } : x)),
      },
    }));
  };

  function onSimgeDown(e: ReactPointerEvent<SVGGElement>, x: Simge) {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(x.id);
    setEkSecim([]);
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ kind: "simgeTasi", id: x.id, start: toCanvas(e.clientX, e.clientY), orij: x.p, recorded: false });
  }

  function onNotDown(e: ReactPointerEvent<SVGGElement>, n: Not) {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(n.id);
    setEkSecim([]);
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ kind: "notTasi", id: n.id, start: toCanvas(e.clientX, e.clientY), orij: n.p, okOrij: n.ok, recorded: false });
  }

  function onAnchorDown(e: ReactPointerEvent<SVGRectElement>, id: string, index: number) {
    if (tool !== "select") return;
    e.stopPropagation();
    /* Alt ile çapaya basmak noktayı SİLİYOR — vektör araçlarının ortak
       kısayolu. Sürüklemeden önce bakılıyor, yoksa silinen noktanın
       ardından bir sürükleme başlar ve komşu nokta yerinden oynardı. */
    if (e.altKey) {
      noktaSil(id, index);
      return;
    }
    svgRef.current?.setPointerCapture(e.pointerId);
    setUndo((u) => [...u.slice(-29), doc]);
    setDrag({ kind: "anchor", id, index });
  }

  /**
   * Çift tıklama — araca göre iki ayrı iş.
   *
   * Kalemde açık yolu bitiriyor (eskiden beri böyle), seçim aracında yola
   * NOKTA EKLİYOR. Tek işleyicide birleşiyorlar çünkü SVG'ye ikinci bir
   * `onDoubleClick` yazmak sessizce ilkini eziyordu.
   */
  function onDoubleClick(e: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "pen") {
      if (draft.length >= 2) finishDraft(false);
      return;
    }
    if (tool === "select") noktaEkle(toCanvas(e.clientX, e.clientY));
  }

  /* ---------- kumaş sürükle-bırak ---------- */
  function onDropFabric(e: DragEvent<SVGSVGElement>) {
    e.preventDefault();
    const fabricId = e.dataTransfer.getData("text/fabric");
    if (!fabricId) return;
    const p = toCanvas(e.clientX, e.clientY);
    const hit = hitTest(p);
    if (hit && hit.closed) {
      setSelectedId(hit.id);
      applyFabric(hit.id, fabricId);
    } else {
      setToast("Kumaşı kapalı bir parçanın üstüne bırakın");
    }
  }

  /* ---------- teknik çizim üretimi ---------- */
  /* Kaynak KİMLİĞİYLE gidiyor, adresiyle değil: `/api/teknik` "hangi işin
     kaçıncı karesi" diyeni kovadaki yola kendisi çeviriyor ve o sırada
     karenin bu oturuma ait olduğunu doğruluyor. İstemcinin depo yolu
     bilmesi gerekmiyor — kesim ve çekim uçlarındaki gerekçenin aynısı. */
  const siluetKare = tohum?.kareler.find((k) => k.etiket === "siluet") ?? null;

  async function teknikUret() {
    if (!siluetKare) {
      setToast("Akışta giysi silueti yok; teknik çizim ondan üretiliyor.");
      return;
    }
    setTeknikCalisiyor(true);
    setTeknikAdim(null);
    try {
      const r = await fetch("/api/teknik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kaynak: { isId: siluetKare.isId, sira: siluetKare.sira },
          /* Ayrı bir not alanı YOK: çizim tamamen kaynak karenin
             kopyası, serbest metin onu ancak saptırır. Brief yine de
             gidiyor — giysinin adını modelin sözlüğüne koyuyor. */
          metin: tohum?.brief ?? "",
          aspect: TEKNIK_ORAN,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        /* Ucun kendi metni gösteriliyor: 429 "zaten süren bir iş var"
           diyor ve kullanıcı bunu bilmeden düğmeye basmayı sürdürür. */
        setToast(j.error ?? "Teknik çizim başlatılamadı.");
        setTeknikCalisiyor(false);
        return;
      }
      setTeknikIsId(j.jobId as string);
    } catch {
      setToast("Bağlantı kurulamadı.");
      setTeknikCalisiyor(false);
    }
  }

  /* Gelen kareleri yuva ADIYLA eşleştirir, dizi sırasıyla değil: bir kare
     üretilemezse iş onu atlayıp ötekini döndürüyor ve sırayla okunsaydı
     arkadan gelen çizim ön görünüme düşerdi.

     `dataUrl` YEDEĞİ OKUNMAK ZORUNDA. Koşucu kareyi kovaya yükleyemezse
     (5xx, zaman aşımı, dolu kova) `url` boş kalıyor ve baytlar `dataUrl`
     olarak geliyor — kare üretilmiş ve parası ödenmiş demektir. Kolaj
     aracında yalnız `url` okunuyordu ve o kareler sessizce atılıyordu. */
  const teknikUygula = useCallback((gelenler: { eksen: string; url?: string; dataUrl?: string }[]) => {
    const gelen = new Map<string, string>();
    for (const kare of gelenler) {
      const adres = kare.url ?? kare.dataUrl;
      if (adres) gelen.set(kare.eksen, adres);
    }
    const on = gelen.get(TEKNIK_YUVA.front) ?? null;
    const arka = gelen.get(TEKNIK_YUVA.back) ?? null;
    if (!on && !arka) {
      setToast("Teknik çizim gelmedi. Tekrar deneyin.");
      return;
    }

    setTeknikCizim((c) => ({ front: on ?? c.front, back: arka ?? c.back }));
    /* Gelen çizim doğrudan altlığa oturuyor: üretmenin bütün sebebi bu.
       Yalnız gelen yuva değişiyor — biri düştüyse öteki görünümün altlığı
       yerinde kalsın. */
    setAltliklar((a) => ({
      front: on ? { src: on, tur: "teknik" } : a.front,
      back: arka ? { src: arka, tur: "teknik" } : a.back,
    }));
    /* Kutu çizimin YEDEK çerçevesine dönüyor: kullanıcının fotoğraf için
       ayarladığı ölçek ve kaydırma başka bir kadraja göreydi. Taze gelen
       kare henüz ölçülmedi — ölçüm aşağıdaki etkide, çizim ekrana çıktıktan
       sonra yürüyüp kutuyu yerine oturtuyor. Geri yüklenen çizim de aynı
       etkiden geçiyor; ikisi bu yüzden ayırt edilemiyor. */
    setAltlikKutu(TEKNIK_ALAN);
    setToast(
      on && arka
        ? "Teknik çizim geldi — ön ve arka altlığa kondu."
        : on
          ? "Yalnız ön teknik çizim geldi; arka eski altlığında kaldı."
          : "Yalnız arka teknik çizim geldi; ön eski altlığında kaldı.",
    );
  }, []);

  useEffect(() => {
    if (!teknikIsId) return;
    let iptal = false;
    const basladi = Date.now();

    const tur = async () => {
      if (iptal) return;
      try {
        const r = await fetch(`/api/jobs/${teknikIsId}`, { cache: "no-store" });
        const j = await r.json();
        if (iptal) return;

        if (j.status === "completed") {
          teknikUygula(j.kareler ?? []);
          setTeknikCalisiyor(false);
          setTeknikIsId(null);
          return;
        }
        if (j.status === "failed") {
          setToast(j.error ?? "Teknik çizim tamamlanamadı.");
          setTeknikCalisiyor(false);
          setTeknikIsId(null);
          return;
        }
        setTeknikAdim(typeof j.step === "string" ? j.step : null);
      } catch {
        /* Ağ tökezlemesi işi bitirmez; sonraki turda tekrar denenir. */
      }
      if (Date.now() - basladi > YOKLAMA_TAVANI_MS) {
        if (!iptal) {
          setToast("Teknik çizim beklenenden uzun sürdü.");
          setTeknikCalisiyor(false);
          setTeknikIsId(null);
        }
        return;
      }
      setTimeout(tur, YOKLAMA_MS);
    };

    void tur();
    return () => {
      iptal = true;
    };
  }, [teknikIsId, teknikUygula]);

  /* ---------- dışa aktar ----------

     ESKİ HÂLİ ÜÇ YERDEN BOZUKTU ve üçü de sessizdi:

       1. GÖRSELLER BAĞLANTI KALIYORDU. Kartela kumaşları mutlak adres
          taşıdığı için çevrimiçi açılınca çözülüyordu ama üretilen kare
          göreceli (`/api/kare/...`) ve diskteki dosyada BOŞ kalıyordu.
          Kod bunu biliyor ve toast'la itiraf ediyordu — itiraf, düzeltme
          değil.
       2. KADRAJ EKRANIN KADRAJIYDI. `viewBox` canlı görünümden
          kopyalanıyordu; yakınlaşmış bir kullanıcı çiziminin KIRPILMIŞ
          hâlini indiriyordu ve bunu hiçbir yerde yazmıyorduk.
       3. TUVAL KROMU DOSYAYA GİRİYORDU: 40.000 birimlik ızgara
          dikdörtgeni ve eksen çizgileri.

     Şimdi dosya çizimin KENDİ sınırına kırpılıyor ve boyutu SANTİMETRE
     cinsinden yazılıyor — 4 birim = 1 cm olduğu için Illustrator'da
     gerçek ölçüsüyle açılıyor. Teknik çizimde bir dosyanın en temel
     şartı bu: gönderildiği yerde aynı ölçüde görünmesi. */
  const [disaAktariliyor, setDisaAktariliyor] = useState(false);

  async function gorseliGom(src: string): Promise<string> {
    const yanit = await fetch(src);
    if (!yanit.ok) throw new Error(String(yanit.status));
    const blob = await yanit.blob();
    return new Promise<string>((coz, hata) => {
      const okuyucu = new FileReader();
      okuyucu.onload = () => coz(String(okuyucu.result));
      okuyucu.onerror = () => hata(okuyucu.error ?? new Error("okunamadı"));
      okuyucu.readAsDataURL(blob);
    });
  }

  /* ÖLÇÜ TABLOSU CSV — üretici tarafı tabloyu Excel'de istiyor.

     ÜÇ GÖRÜNÜM BİRDEN gidiyor: ön, arka ve detay aynı giysinin
     parçaları ve üretici tek dosya bekliyor. Görünüm sütunu numaranın
     hangi sayfaya ait olduğunu söylüyor — numaralar her görünümde
     birden başlıyor, çünkü çizimdeki daireler de öyle.

     Ayırıcı noktalı virgül ve başta BOM: Türkçe Excel virgülü ondalık
     ayırıcı sayıyor ve BOM olmadan Türkçe karakterleri bozuk açıyor. */
  function pomCsv() {
    /* Numune beden başlıkta İŞARETLİ. Tabloda türetilmiş sayılarla
       ölçülmüş sayı yan yana duruyor; hangisinin ölçüldüğünü söylemeyen
       bir dosya gradasyon hatasını fark edilmez kılar. */
    const basliklar = [
      "Görünüm",
      "No",
      "Ölçüm noktası",
      ...seri.bedenler.map((b, i) => (i === seri.numune ? `${b} (numune)` : b)),
      "Tolerans (±cm)",
      "Artış (cm/beden)",
    ];
    const satirlar: string[][] = [];
    for (const v of VIEWS) {
      doc[v.id].measures.forEach((m, i) => {
        satirlar.push([
          v.label,
          String(i + 1),
          m.ad?.trim() || "Adsız ölçü",
          ...seri.bedenler.map((_, bi) => bedendeOlcu(m, seri, bi).toFixed(1)),
          (m.tolerans ?? VARSAYILAN_TOLERANS).toFixed(1),
          (m.artis ?? 0).toFixed(1),
        ]);
      });
    }
    if (!satirlar.length) {
      setToast("Ölçü yok — mezurayla (M) iki nokta arasını sürükleyin");
      return;
    }
    const kacir = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const govde = [basliklar, ...satirlar].map((r) => r.map(kacir).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + govde], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "olcu-tablosu.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const adsiz = satirlar.filter((r) => r[2] === "Adsız ölçü").length;
    setToast(
      adsiz
        ? `CSV indirildi — ${satirlar.length} ölçü, ${adsiz} tanesi adsız`
        : `CSV indirildi — ${satirlar.length} ölçü`,
    );
  }

  async function exportSvg() {
    const svg = svgRef.current;
    if (!svg || disaAktariliyor) return;
    setDisaAktariliyor(true);
    setToast("SVG hazırlanıyor…");
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clone.querySelectorAll("[data-ui]").forEach((el) => el.remove());
    clone.removeAttribute("class");
    clone.removeAttribute("style");

    /* KULLANILMAYAN TANIMLAR ATILIYOR — kimliğe göre değil, KULLANIMA
       göre. Dokuz kartela deseni her zaman `defs` içinde duruyor ve
       hepsini gömmek dosyaya dokuz makro fotoğraf eklerdi; ızgara
       desenleri ise onları kullanan dikdörtgen krom olduğu için zaten
       öksüz kalıyor. Önce hangi kimliklerin gerçekten `url(#…)` ile
       çağrıldığını topluyoruz, sonra çağrılmayan her tanımı atıyoruz.
       Kimliğe göre elemek (`pattern[id^='fab-']`) ızgarayı dosyada
       bırakıyordu — ölçüldü. */
    const cagrilanlar = () => {
      const k = new Set<string>();
      clone.querySelectorAll("*").forEach((el) => {
        for (const oz of Array.from(el.attributes)) {
          const eslesme = oz.value.match(/url\(#([^)]+)\)/);
          if (eslesme) k.add(eslesme[1]);
        }
      });
      return k;
    };
    /* TEK GEÇİŞ YETMİYOR, ölçüldü. `grid-major` deseninin İÇİNDE
       `grid-minor` çağrılıyor; ilk geçişte major atılıyor ama minor
       "çağrılmış" sayıldığı için dosyada kalıyordu. Zincir tükenene
       kadar tekrarlıyoruz; beş tur, sonsuz döngüye karşı üst sınır. */
    for (let tur = 0; tur < 5; tur++) {
      const cagrilan = cagrilanlar();
      const atilacak = [...clone.querySelectorAll("defs > *")].filter((el) => el.id && !cagrilan.has(el.id));
      if (!atilacak.length) break;
      atilacak.forEach((el) => el.remove());
    }

    let gomulemeyen = 0;
    await Promise.all(
      [...clone.querySelectorAll("image")].map(async (im) => {
        const src = im.getAttribute("href") ?? im.getAttribute("xlink:href");
        if (!src || src.startsWith("data:")) return;
        try {
          const veri = await gorseliGom(src);
          im.setAttribute("href", veri);
          im.removeAttribute("xlink:href");
        } catch {
          /* Çevrimdışıyken ya da uzak sunucu izin vermediğinde olur.
             Bağlantıyı bozmuyoruz — dosya çevrimiçi açılınca yine
             çalışsın — ama kaç tanesinin gömülemediğini SÖYLÜYORUZ. */
          gomulemeyen += 1;
        }
      }),
    );

    /* `var(--font-sans)` uygulamanın dışında tanımsız: dosyayı tek başına
       açan kişi ölçü etiketlerini ve notları varsayılan yazıyla görürdü. */
    clone.querySelectorAll("[font-family]").forEach((el) => {
      el.setAttribute("font-family", "ui-sans-serif, system-ui, Segoe UI, Helvetica, Arial, sans-serif");
    });

    /* Sınır ölçülebilmek için klon belgeye GİRİYOR: `getBBox` yalnız
       yerleştirilmiş öğelerde çalışıyor. Görünmez ve akış dışı. */
    clone.style.position = "absolute";
    clone.style.left = "-99999px";
    clone.style.width = "1000px";
    clone.style.height = "1000px";
    document.body.appendChild(clone);
    let kutu: DOMRect | null = null;
    try {
      kutu = clone.getBBox() as DOMRect;
    } catch {
      kutu = null;
    }
    document.body.removeChild(clone);
    clone.removeAttribute("style");

    if (kutu && kutu.width > 0 && kutu.height > 0) {
      const pay = 16; // 4 cm kenar payı
      const en = kutu.width + pay * 2;
      const boy = kutu.height + pay * 2;
      clone.setAttribute("viewBox", `${(kutu.x - pay).toFixed(2)} ${(kutu.y - pay).toFixed(2)} ${en.toFixed(2)} ${boy.toFixed(2)}`);
      clone.setAttribute("width", `${toCm(en).toFixed(2)}cm`);
      clone.setAttribute("height", `${toCm(boy).toFixed(2)}cm`);
    }

    const metin = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([metin], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teknik-cizim-${view}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDisaAktariliyor(false);
    setToast(
      gomulemeyen
        ? `SVG indirildi — ${gomulemeyen} görsel gömülemedi, dosya çevrimiçi açılmalı`
        : "SVG indirildi — görseller dosyanın içinde",
    );
  }

  /* ---------- türetilen ---------- */
  const cursor = panning
    ? drag?.kind === "pan" ? "grabbing" : "grab"
    : tool === "select" ? (drag?.kind === "move" ? "grabbing" : "default") : "crosshair";
  const nearFirst = tool === "pen" && draft.length >= 3 && hover && dist(hover, draft[0]) < 8 / vp.zoom;
  const selBox = selected ? bbox(selected.points) : null;
  const toolMeta = TOOLS.find((t) => t.id === tool) ?? TOOLS[0];
  const pct = Math.round(vp.zoom * 100);

  /* ---------- tohum ---------- */
  /* Üretilen çizimler şeridin SONUNA ekleniyor: tohum kareleri
     kullanıcının ana sayfadan tanıdığı sırada kalsın, yeni gelen de
     bulunabilsin. Şeritte durmaları şart — altlığı fotoğrafa çevirip
     çizime geri dönmenin başka yolu olmazdı. */
  const referanslar: Referans[] = [
    ...tohumKareleri(tohum),
    ...(["front", "back"] as const).flatMap((g) => {
      const src = teknikCizim[g];
      return src ? [{ src, tur: "teknik" as const, etiket: TEKNIK_ETIKET[g] }] : [];
    }),
  ];
  const tohumKumas = tohum?.turetilmis.kumas ?? null;
  /* Kartela + (varsa) üretilen kare. Üretilen SONA konuyor: kartelanın
     sırası kullanıcının alıştığı sıra. Alanlar tek tek birleştiriliyor,
     çünkü kartelaya ileride boş kalabilen bir alan eklenebilir ve ipucunda
     "undefined" görünmemeli. */
  const kumasSecenekleri: { id: string; ad: string; gorsel: string; ipucu: string }[] = [
    ...fabrics.map((f) => ({
      id: f.id,
      ad: f.name,
      gorsel: f.image,
      ipucu: [f.name, f.composition].filter(Boolean).join(" · "),
    })),
    ...(tohumKumas
      ? [{
          id: TOHUM_KUMAS,
          ad: "Üretilen",
          gorsel: tohumKumas,
          ipucu: "Ana sayfada üretilen kumaş karesi — gramaj, en, fiyat gibi kartela verisi yok",
        }]
      : []),
  ];
  /* Başlık tohumdan; tohum yoksa örnek belgenin adı kalıyor. "Kaydedildi
     10:52" KALDIRILDI — kaydetme diye bir şey yok, sabit bir saat yazmak
     kullanıcıya olmayan bir güvence veriyordu. */
  const baslik = tohum?.brief.trim() || "Keten bluz";

  /* Panelin hangi görünümün altlığını düzenlediği. Detayda altlık
     çizilmiyor ama panel açık kalıyor; seçim ÖNE uygulanıyor ki tıklama
     sessizce kaybolmasın (panel bunu ayrıca yazıyor). */
  const altlikGorunum: AltlikGorunum = view === "back" ? "back" : "front";
  const aktifAltlik = altliklar[altlikGorunum];
  const gorunumAdi = VIEWS.find((v) => v.id === altlikGorunum)?.label ?? "Ön";
  const altligiSec = (secim: Altlik | null) => {
    setAltliklar((a) => ({ ...a, [altlikGorunum]: secim }));
    /* TÜR değişince kutu o türün çerçevesine dönüyor — fotoğraf çerçevesi
       kroki'nin tamamı, teknik çizim çerçevesi giysinin alanı; ikisi aynı
       kutuya sığmıyor. Aynı tür içinde geçişte kullanıcının ayarı
       korunuyor: iki fotoğraf arasında gidip gelmek ayarı silmemeli. */
    if (secim && secim.tur !== aktifAltlik?.tur) setAltlikKutu(varsayilanKutu(secim, olculenKutular));
  };

  /* ---------- altlık ölçümü ---------- */
  /* ÖLÇÜM EKRANI BEKLETMİYOR. Çizim geldiği anda TEKNIK_ALAN'a oturup
     GÖRÜNÜYOR; ölçüm arkasından yürüyüp kutuyu yerine oturtuyor. Ters sıra
     (önce ölç, sonra göster) ücretli bir çıktıyı bir indirme ve bir kare
     taraması boyunca saklamak olurdu — hem taze üretimde hem sayfa
     açılışında. Tarama zaten etkide, yani boyama bittikten sonra başlıyor
     ve tuval işi ~0,25 megapiksele bağlanmış (bkz. TARAMA_KENARI).

     Ölçüm başarısızsa hiçbir şey yapılmıyor: kutu yedek çerçevede kalıyor.

     Sonuç kare adresine yazılıyor, kutuya değil; kutuyu ancak KULLANICI
     DOKUNMAMIŞSA değiştiriyor. Dokunduysa ayarı ezilmiyor — panelin
     "sıfırla" düğmesi artık ölçülen kutuya döndürdüğü için istediği an tek
     tıkla alıyor.

     Sonuçlar hem durumda hem REF'te: durum ekranı besliyor (sürgülerin
     sıfır noktası, düğme adı), ref ise geç gelen bir ölçümün "kutuya
     dokunuldu mu" testini — etkinin bağımlılığına girmeden, yani her yeni
     ölçüm taramayı baştan kurdurmadan. */
  const olculenlerRef = useRef<Map<string, AltlikKutu | null>>(new Map());
  useEffect(() => {
    /* YALNIZ TEKNİK ÇİZİM ölçülüyor. Fotoğraf altlıklarının (giysi
       silueti, ilham kareleri) zemini beyaz değil; tarama onlarda karenin
       tamamını döndürür, yani hiçbir şey söylemez. Davranışları aynı kaldı. */
    if (aktifAltlik?.tur !== "teknik") return;
    const src = aktifAltlik.src;
    /* Bir kare bir kez deneniyor: `null` "denendi, ölçülemedi" demek ve
       aynı kareye her dönüşte taramayı baştan başlatmayı engelliyor. */
    if (olculenlerRef.current.has(src)) return;
    olculenlerRef.current.set(src, null);

    let iptal = false;
    void (async () => {
      const sinir = await giysiSiniriniOlc(src);
      if (!sinir) return;
      const kutu = zarfaOturt(sinir);
      olculenlerRef.current.set(src, kutu);
      setOlculenKutular((o) => ({ ...o, [src]: kutu }));
      /* İptal, altlığın bu arada değişmesi demek: kutuyu artık başka bir
         kare dolduruyor, ölçüm yalnız haritaya yazılıp bırakılıyor. */
      if (iptal) return;
      setAltlikKutu((k) => (dokunulmamisKutu(k, olculenlerRef.current) ? kutu : k));
    })();
    return () => {
      iptal = true;
    };
  }, [aktifAltlik]);

  const teknikDugmesi = teknikCalisiyor
    ? teknikAdim?.startsWith("model-cagriliyor")
      ? "Çiziliyor…"
      : "Sıraya alındı…"
    : `Teknik çizim üret · ${TEKNIK_EKSENLERI.length} kare`;

  /* Altlık kutusu panelden ayarlanıyor; sürgüler kutunun KENDİSİNDEN
     türüyor, ayrı bir ölçek/konum durumu tutulmuyor ki ikisi ayrışmasın.

     Sıfır noktası AKTİF ALTLIĞIN çerçevesi: %100 ve 0 cm "geldiği gibi"
     demek. Ölçüyü hep kroki alanına bağlamak, teknik çizim seçiliyken
     dokunulmamış bir kutuya "%149" dedirtirdi. Çizim ölçüldüyse sıfır
     noktası ÖLÇÜLEN çerçeve oluyor — kullanıcının ekranda gördüğü kutuya
     "%100" demeyen bir sürgü yalan söylerdi. */
  const temelKutu = varsayilanKutu(aktifAltlik, olculenKutular);
  const altlikOlcek = Math.round((altlikKutu.w / temelKutu.w) * 100);
  const kutuMerkez = { x: altlikKutu.x + altlikKutu.w / 2, y: altlikKutu.y + altlikKutu.h / 2 };
  const temelMerkez = { x: temelKutu.x + temelKutu.w / 2, y: temelKutu.y + temelKutu.h / 2 };
  const altligiOlcekle = (yuzde: number) => {
    const w = (temelKutu.w * yuzde) / 100;
    const h = (temelKutu.h * yuzde) / 100;
    // merkez sabit kalıyor: ölçek değişince altlık figürün altından kaçmasın
    setAltlikKutu((k) => ({ x: k.x + k.w / 2 - w / 2, y: k.y + k.h / 2 - h / 2, w, h }));
  };
  const altligiTasi = (eksen: "x" | "y", sapma: number) =>
    setAltlikKutu((k) =>
      eksen === "x"
        ? { ...k, x: temelMerkez.x + sapma - k.w / 2 }
        : { ...k, y: temelMerkez.y + sapma - k.h / 2 },
    );

  return (
    <div ref={wrapRef} className="tuval relative flex-1 select-none overflow-hidden bg-paper min-h-[calc(100svh-4rem-3.25rem)] lg:min-h-[calc(100svh-5rem)]">
      {/* ---------------- TUVAL ---------------- */}
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor }}
        viewBox={`${vp.x} ${vp.y} ${size.w / vp.zoom} ${size.h / vp.zoom}`}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropFabric}
        role="application"
        aria-label="Teknik çizim tuvali"
      >
        <defs>
          <pattern id="grid-minor" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke={INK} strokeOpacity="0.06" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-major" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="url(#grid-minor)" />
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={INK} strokeOpacity="0.13" strokeWidth="0.6" />
          </pattern>
          {fabrics.map((f) => (
            <pattern key={f.id} id={`fab-${f.id}`} width="96" height="96" patternUnits="userSpaceOnUse">
              <image href={f.image} width="96" height="96" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          ))}
          {/* Üretilen kumaş karesi de bir desen: kartela kumaşlarıyla aynı
              yoldan (tıkla ya da sürükle-bırak) uygulanıyor. */}
          {tohumKumas && (
            <pattern id={`fab-${TOHUM_KUMAS}`} width="96" height="96" patternUnits="userSpaceOnUse">
              <image href={tohumKumas} width="96" height="96" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          )}
        </defs>

        {/* Sonsuz zemin ve eksenler TUVAL KROMU, çizimin parçası değil —
            `data-ui` ile dışa aktarmada düşüyorlar. Eskiden düşmüyorlardı
            ve indirilen dosyanın içinde 40.000 birimlik bir ızgara
            dikdörtgeni ile aynı boyda iki eksen çizgisi kalıyordu; hem
            dosyayı şişiriyor hem çizimin sınırını anlamsız kılıyordu. */}
        <rect data-ui x="-20000" y="-20000" width="40000" height="40000" fill="url(#grid-major)" />
        <g data-ui stroke={INK} strokeOpacity="0.18" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <line x1="-20000" y1="0" x2="20000" y2="0" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="-20000" x2="0" y2="20000" vectorEffect="non-scaling-stroke" />
        </g>

        {/* Altlık — sıralama: zemin → ALTLIK → kroki → parçalar. Yalnız ön
            ve arka görünümde; detay görünümünde manşet ve cep var, figür
            yok, altlık orada anlamsız kalır.

            `pointer-events-none` ZORUNLU: tuvalin bütün vuruş testi
            SVG'nin kendi işaretçi olaylarından geçiyor, araya olay alan
            bir görsel girerse seçim, kalem ve makas SESSİZCE ölür.

            `data-ui` dışa aktarmada düşürüyor (exportSvg [data-ui] taşıyan
            her düğümü siliyor): altlık referans, çizimin parçası değil —
            ayrıca kare adresi göreceli olduğu için diskteki dosyada zaten
            çözülemezdi.

            YERLEŞİM TÜRE GÖRE. Fotoğraf `slice` ile yerleşiyor: kutu ne
            ise o görünüyor, kare kırpılıyor — kutu sürgüleri dürüst kalsın
            diye, kareden daha çoğunu görmek için kutuyu genişletmek
            yetiyor. Teknik çizim ise `meet` ile SIĞARAK yerleşiyor: kutu
            kroki gibi dar (180×668) ve çizim 3:4; `slice` olsaydı çizimin
            kolları kırpılırdı, yani üstünden çizilecek şeyin ta kendisi
            kesilirdi. Fotoğrafta kırpma zararsız, çizimde değil.

            Kutu ÖLÇÜLDÜYSE `meet` boşa çalışıyor ve kalması bilerek:
            `zarfaOturt` kutuyu karenin kendi oranıyla kuruyor, sürgüler de
            eni ile boyu birlikte ölçekliyor, yani meet ile slice çakışıyor.
            Kalıyor çünkü ölçüm tutmadığında kutu 3:4'e zorlanmış yedek
            çerçeveye düşüyor ve orada çizimi kırpılmaktan koruyan tek şey o. */}
        {view !== "detail" && aktifAltlik && (
          <image
            data-ui
            href={aktifAltlik.src}
            x={altlikKutu.x}
            y={altlikKutu.y}
            width={altlikKutu.w}
            height={altlikKutu.h}
            opacity={altlikOpaklik}
            preserveAspectRatio={aktifAltlik.tur === "teknik" ? "xMidYMid meet" : "xMidYMid slice"}
            className="pointer-events-none"
          />
        )}

        {/* Kroki de `data-ui`: tuvalde bir çizim yardımcısı, üstünden
            çizilsin diye var. Şartnamede giysinin kendisi olmalı, onu
            tutan figür değil — baskı ağacı da aynı kararı veriyor.
            Ölçülünce görüldü: kroki dosyada kalınca dışa aktarılan SVG
            "181 cm boy" diye açılıyordu, yani giysinin değil mankenin
            ölçüsünü söylüyordu. */}
        {view !== "detail" && (
          <g data-ui>
            <Croquis back={view === "back"} />
          </g>
        )}

        {/* parçalar */}
        {cur.shapes.map((s) => {
          if (!s.visible) return null;
          /* Yol seçim çerçevesi için burada da hesaplanıyor; gövdeyi
             `ParcaGovde` çiziyor. */
          const d = s.smooth ? smoothPath(s.points, s.closed) : polyPath(s.points, s.closed);
          const isSel = secimIdleri.includes(s.id);
          /* ÇAPALAR YALNIZ TEK SEÇİMDE. Çoklu seçimde her parçanın
             noktalarını basmak tuvali okunmaz hâle getiriyor ve nokta
             sürüklerken yanlış parçayı yakalamak kolaylaşıyor. Seçim
             çizgisi yine hepsinde görünüyor, yani neyin seçili olduğu
             belirsiz kalmıyor. */
          const capaliGoster = s.id === selectedId && !cokluSecim;
          return (
            <g key={s.id}>
              <ParcaGovde s={s} />
              {isSel && (
                <g data-ui>
                  <path d={d} fill="none" stroke={SELECT} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  {capaliGoster && s.points.map((q, i) => (
                    <rect
                      key={i}
                      x={q.x - 3 / vp.zoom}
                      y={q.y - 3 / vp.zoom}
                      width={6 / vp.zoom}
                      height={6 / vp.zoom}
                      fill="#fff"
                      stroke={SELECT}
                      strokeWidth={1 / vp.zoom}
                      style={{ cursor: "move" }}
                      onPointerDown={(e) => onAnchorDown(e, s.id, i)}
                    />
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* ölçüler */}
        {cur.measures.map((m, i) => (
          <MeasureMark key={m.id} a={m.a} b={m.b} no={i + 1} zoom={vp.zoom} selected={m.id === selectedId} onSelect={() => { setSelectedId(m.id); setEkSecim([]); }} />
        ))}

        {/* giysi simgeleri */}
        {cur.simgeler.map((x) => (
          <SimgeIsareti key={x.id} simge={x} selected={x.id === selectedId} onDown={(e) => onSimgeDown(e, x)} />
        ))}

        {/* notlar */}
        {cur.notlar.map((n) => (
          <NotIsareti
            key={n.id}
            not={n}
            zoom={vp.zoom}
            selected={n.id === selectedId}
            onDown={(e) => onNotDown(e, n)}
          />
        ))}

        {/* geçici ölçü / kesim */}
        {drag && (drag.kind === "measure" || drag.kind === "cut") && temp && (
          <g data-ui>
            <line x1={drag.a.x} y1={drag.a.y} x2={temp.x} y2={temp.y} stroke={SELECT} strokeWidth="1" strokeDasharray={drag.kind === "cut" ? "5 4" : undefined} vectorEffect="non-scaling-stroke" />
            {drag.kind === "measure" && <MeasureLabel a={drag.a} b={temp} zoom={vp.zoom} />}
          </g>
        )}

        {/* DÖNÜŞÜM KUTUSU. Kutu parçanın kendi çapalarından PAY kadar
            dışarıda duruyor: içeride olsaydı köşe tutamakları çapaların
            üstüne biner ve nokta çekmek isteyen kullanıcı parçayı
            ölçeklerdi. Sürükleme sırasında da görünüyor — kaybolan bir
            kutu, neyi dönüştürdüğünü göstermeyi bırakmak demek. */}
        {tool === "select" && donusumKutusu && (() => {
          const pay = TUTAMAK_PAY / vp.zoom;
          const yerler = tutamakYerleri(donusumKutusu, pay);
          /* Tutamak boyu EKRAN PİKSELİ. 7 denendi ve küçüktü: döndürme
             halkası 5 piksel çapa düşüyor, fareyle tutturmak zorlaşıyordu.
             Karo 9, halka yarıçapı da karo boyu — yani ~9 piksellik hedef,
             vektör araçlarının kullandığı bantta. */
          const b = 9 / vp.zoom;
          const imlec: Record<TutamakId, string> = {
            nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize",
            n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", dondur: "grab",
          };
          return (
            <g data-ui>
              <rect
                x={donusumKutusu.minX - pay}
                y={donusumKutusu.minY - pay}
                width={donusumKutusu.w + pay * 2}
                height={donusumKutusu.h + pay * 2}
                fill="none"
                stroke={SELECT}
                strokeOpacity="0.55"
                strokeWidth="1"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={yerler.n.x}
                y1={yerler.n.y}
                x2={yerler.dondur.x}
                y2={yerler.dondur.y}
                stroke={SELECT}
                strokeOpacity="0.55"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={yerler.dondur.x}
                cy={yerler.dondur.y}
                r={b * 0.62}
                fill="#fff"
                stroke={SELECT}
                strokeWidth={1 / vp.zoom}
                style={{ cursor: imlec.dondur }}
                onPointerDown={(e) => onTutamakDown(e, "dondur")}
              />
              {(Object.keys(KARSI) as Exclude<TutamakId, "dondur">[]).map((t) => (
                <rect
                  key={t}
                  x={yerler[t].x - b / 2}
                  y={yerler[t].y - b / 2}
                  width={b}
                  height={b}
                  fill="#fff"
                  stroke={SELECT}
                  strokeWidth={1 / vp.zoom}
                  style={{ cursor: imlec[t] }}
                  onPointerDown={(e) => onTutamakDown(e, t)}
                />
              ))}
            </g>
          );
        })()}

        {/* YAKALAMA KILAVUZU. Görünmeyen bir yakalama, kullanıcı için
            "noktam neden zıpladı" demek. Çizgi hangi hizaya oturduğunu
            söylüyor ve sürükleme biter bitmez sönüyor. */}
        {yakalamaCizgisi && (
          <g data-ui pointerEvents="none">
            {yakalamaCizgisi.x !== undefined && (
              <line
                x1={yakalamaCizgisi.x}
                y1={vp.y}
                x2={yakalamaCizgisi.x}
                y2={vp.y + size.h / vp.zoom}
                stroke={SELECT}
                strokeWidth="1"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {yakalamaCizgisi.y !== undefined && (
              <line
                x1={vp.x}
                y1={yakalamaCizgisi.y}
                x2={vp.x + size.w / vp.zoom}
                y2={yakalamaCizgisi.y}
                stroke={SELECT}
                strokeWidth="1"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        )}

        {/* kalem taslağı */}
        {draft.length > 0 && (
          <g data-ui>
            <path d={smooth ? smoothPath(draft, false) : polyPath(draft, false)} fill="none" stroke={INK} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {hover && <line x1={draft[draft.length - 1].x} y1={draft[draft.length - 1].y} x2={hover.x} y2={hover.y} stroke={SELECT} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
            {draft.map((q, i) => (
              <rect key={i} x={q.x - 2.5 / vp.zoom} y={q.y - 2.5 / vp.zoom} width={5 / vp.zoom} height={5 / vp.zoom} fill="#fff" stroke={INK} strokeWidth={1 / vp.zoom} />
            ))}
            {nearFirst && <circle cx={draft[0].x} cy={draft[0].y} r={7 / vp.zoom} fill="none" stroke={SELECT} strokeWidth={1 / vp.zoom} />}
          </g>
        )}
      </svg>

      {/* ---------------- ÜST: başlık ve araç çubuğu ---------------- */}
      <div className="pointer-events-none absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-3">
        <Glass className="pointer-events-auto flex items-center gap-0.5 p-1">
          {TOOLS.map((t) => (
            <ToolButton key={t.id} label={`${t.label} · ${t.key}`} active={tool === t.id} onClick={() => { setTool(t.id); setDraft([]); }}>
              <ToolIcon id={t.id} />
            </ToolButton>
          ))}
          <Sep />
          <div className="relative">
            <button
              type="button"
              onClick={() => setStitchOpen((o) => !o)}
              aria-expanded={stitchOpen}
              className="flex h-9 items-center gap-2 px-3 eyebrow text-ink transition-colors hover:bg-ink/[0.04]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <path d="M3 12h3M9 12h3M15 12h3" />
                <path d="M3 16l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2" opacity="0.5" />
              </svg>
              {STITCHES.find((s) => s.id === (selected?.stitch ?? stitch))?.label}
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-ash" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 6l5 5 5-5" /></svg>
            </button>
            {stitchOpen && (
              <Glass className="absolute left-0 top-full mt-1.5 flex w-44 flex-col p-1">
                {STITCHES.map((s) => {
                  const active = (selected?.stitch ?? stitch) === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStitch(s.id);
                        if (selected) updateShape(selected.id, { stitch: s.id });
                        setStitchOpen(false);
                      }}
                      className={cn("flex items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-ink/[0.04]", active ? "text-ink" : "text-smoke")}
                    >
                      {s.label}
                      <StitchSample id={s.id} />
                    </button>
                  );
                })}
              </Glass>
            )}
          </div>

          {/* SİMGE SEÇİCİ YALNIZ SİMGE ARACINDA. Araç çubuğu zaten
              kalabalık; hiç kullanılmayacakken duran bir açılır liste
              ötekilerin okunmasını zorlaştırıyor. */}
          {tool === "simge" && (
            <>
              <Sep />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSimgeAcik((o) => !o)}
                  aria-expanded={simgeAcik}
                  className="flex h-9 items-center gap-2 px-3 eyebrow text-ink transition-colors hover:bg-ink/[0.04]"
                >
                  {SIMGELER.find((x) => x.id === simgeTur)?.label}
                  <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-ash" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 6l5 5 5-5" /></svg>
                </button>
                {simgeAcik && (
                  <Glass className="absolute left-0 top-[calc(100%+6px)] z-20 flex w-56 flex-col py-1">
                    {SIMGELER.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => {
                          setSimgeTur(x.id);
                          setSimgeAcik(false);
                        }}
                        title={x.ipucu}
                        className={cn(
                          "px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-ink/[0.04]",
                          simgeTur === x.id ? "text-ink" : "text-smoke",
                        )}
                      >
                        {x.label}
                        <span className="block text-[10.5px] leading-4 text-ash">{x.ipucu}</span>
                      </button>
                    ))}
                  </Glass>
                )}
              </div>
            </>
          )}

          <Sep />
          <ToolButton
            label={smooth ? "Eğri · açık" : "Eğri · kapalı"}
            active={smooth}
            onClick={() => {
              setSmooth((v) => !v);
              if (selected) updateShape(selected.id, { smooth: !selected.smooth });
            }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M4 18c7 0 6-12 16-12" /><circle cx="4" cy="18" r="1.2" /><circle cx="20" cy="6" r="1.2" /></svg>
          </ToolButton>
          <ToolButton
            label={yakalamaAcik ? "Yakalama · açık" : "Yakalama · kapalı"}
            active={yakalamaAcik}
            onClick={() => setYakalamaAcik((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
              <path d="M4 9h16M4 15h16M9 4v16M15 4v16" strokeOpacity="0.45" />
              <circle cx="9" cy="9" r="2.2" />
            </svg>
          </ToolButton>
          <Sep />
          <ToolButton label="Geri al · Ctrl+Z" onClick={undoLast} disabled={undo.length === 0}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7L4 11l4 4" /><path d="M4 11h10a5 5 0 0 1 0 10h-3" /></svg>
          </ToolButton>
          <ToolButton label="İleri al · Shift+Ctrl+Z" onClick={redoLast} disabled={redo.length === 0}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7l4 4-4 4" /><path d="M20 11H10a5 5 0 0 0 0 10h3" /></svg>
          </ToolButton>
          <Sep />
          <ToolButton label="Aynala — parçayı kendi ekseninde çevirir" onClick={aynala} disabled={!selected}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" strokeDasharray="2 2" /><path d="M9 7L4 12l5 5z" /><path d="M15 7l5 5-5 5z" /></svg>
          </ToolButton>
          <ToolButton label="Karşı yarıyı üret — orta çizgiye göre yansıtır" onClick={karsiYari} disabled={!selected}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" strokeDasharray="2 2" /><path d="M10 6H5l-2 6 2 6h5z" /><path d="M14 6h5l2 6-2 6h-5" strokeDasharray="3 2" /></svg>
          </ToolButton>
          <ToolButton label="Çoğalt · Ctrl+D" onClick={() => cogalt()} disabled={!selected}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"><rect x="4" y="4" width="12" height="12" /><path d="M8 20h12V8" /></svg>
          </ToolButton>
          <Sep />
          <ToolButton label="Sil · Delete" onClick={removeSelected} disabled={!selectedId}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" /></svg>
          </ToolButton>
        </Glass>

        <Glass className="pointer-events-auto flex items-center gap-4 px-4 py-2.5">
          <span className="eyebrow max-w-[42ch] truncate text-ink" title={baslik}>
            Teknik çizim · {baslik}
          </span>
          {/* Kayıt durumu OLDUĞU GİBİ yazılıyor. Kayıt TARAYICIYA ait;
              düz "kaydedildi" demek başka cihazda da duracağını ima ederdi.
              (brand-studio'daki "Otomatik kaydedildi" yazısı hiçbir
              kalıcılık olmadan duruyor — o hatayı burada tekrarlamıyoruz.)

              Koşul saklanacak bir İŞ olmasına bakıyor: demo belgesi de
              diske yazılıyor ama daha hiçbir şey çizmemiş kullanıcıya
              "kaydedildi" demek doğru olsa bile gürültü. */}
          <span className="eyebrow shrink-0 text-ash">
            {kayitDurumu === "yuklendi" || undo.length > 0 ? "Bu tarayıcıya kaydedildi" : "Taslak"}
          </span>
        </Glass>
      </div>

      {/* ---------------- SAĞ PANEL ---------------- */}
      <aside
        className={cn(
          "absolute bottom-20 right-4 top-20 flex flex-col transition-[width,opacity] duration-500 ease-[var(--ease-out-expo)]",
          panelOpen ? "w-72" : "w-0 opacity-0 pointer-events-none",
        )}
        aria-hidden={!panelOpen}
      >
        <Glass className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <span className="eyebrow">Kumaş ve katmanlar</span>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Paneli kapat" className="flex h-7 w-7 items-center justify-center text-ash hover:text-ink">
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1"><path d="M6 3l5 5-5 5" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
            {/* Referans — ana sayfada üretilen kareler ve burada üretilen
                teknik çizimler.
                Tohum etiketleri kendi eksen adlarından geliyor (doğa,
                sanat, doku, mekân, moodboard, kumaş, marka, giysi
                siluet). Yalnız siluet giysi; ötekiler ne "giysi" ne
                "manken" diyor çünkü değiller. Şerit GÖRÜNÜM BAŞINA
                seçiyor: tıklama açık olan görünümün altlığını değiştirir. */}
            {referanslar.length > 0 && (
              <section className="mb-7">
                <div className="flex items-baseline justify-between">
                  <p className="eyebrow text-ash">Referans</p>
                  <span className="eyebrow text-ash">{gorunumAdi} görünümü</span>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-fog">
                  Seçilen kare kroki&apos;nin arkasına altlık olur, üstünden çizersiniz. Teknik
                  çizim tam bunun için üretilmiş çizgi resimdir: düz yatık, simetrik, gölgesiz —
                  dikiş, pens ve kapama hatları okunur. Fotoğraf kareleri yedek; içlerinde
                  perspektif, gölge ve beden var.
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {referanslar.map((r) => {
                    const aktif = r.src === aktifAltlik?.src;
                    return (
                      <button
                        key={r.src}
                        type="button"
                        onClick={() => altligiSec(aktif ? null : { src: r.src, tur: r.tur })}
                        title={
                          aktif
                            ? `${r.etiket} · ${gorunumAdi} altlığından kaldır`
                            : `${r.etiket} · ${gorunumAdi} altlığına koy`
                        }
                        aria-label={r.etiket}
                        aria-pressed={aktif}
                        className="group flex flex-col items-center gap-1.5"
                      >
                        <span
                          className={cn(
                            "block h-11 w-full border border-ink/10 bg-cover bg-center transition-[outline-color,scale] duration-300 outline outline-1 outline-offset-2",
                            aktif ? "outline-[#6B7C93]" : "outline-transparent group-hover:scale-105",
                          )}
                          style={{ backgroundImage: `url(${r.src})` }}
                        />
                        <span className="w-full truncate text-center text-[9px] leading-3 text-ash">{r.etiket}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Detayda tıklama sessizce kaybolmasın: seçim öne
                    uygulanıyor ve bunu yazmak, hiçbir şey olmamasından iyi. */}
                {view === "detail" && (
                  <p className="mt-3 text-[11px] leading-4 text-fog">
                    Detay görünümünde altlık çizilmiyor — figür yok. Seçim ön görünüme uygulanır.
                  </p>
                )}

                {/* Maliyet DÜĞMENİN KENDİSİNDE: "· 2 kare". Kullanıcı basmadan
                    önce ne harcadığını bilmeli; altındaki satır bunun iki ayrı
                    üretim demek olduğunu açıyor. */}
                <div className="mt-4 border-t border-mist pt-4">
                  <button
                    type="button"
                    onClick={teknikUret}
                    disabled={teknikCalisiyor || !siluetKare}
                    className="w-full border border-ink/15 px-3 py-2 eyebrow text-ink transition-colors duration-300 hover:bg-ink/[0.04] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {teknikDugmesi}
                  </button>
                  <p className="mt-2 text-[11px] leading-4 text-fog">
                    {siluetKare
                      ? "Giysi siluetinden ön ve arka çizgi çizimi üretilir; iki kare, iki üretim demek. Gelenler doğrudan altlığa oturur."
                      : "Teknik çizim giysi siluetinden üretiliyor; akışta o kare yok. Önce ana sayfada üretin."}
                  </p>
                </div>

                {aktifAltlik ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="eyebrow text-ash">{gorunumAdi} altlığı</p>
                      <span className="eyebrow text-ash">
                        {aktifAltlik.tur === "teknik" ? "Teknik çizim" : "Fotoğraf"}
                      </span>
                    </div>
                    <p className="text-[11px] leading-4 text-fog">
                      Opaklık, ölçek ve konum iki görünümde ortak.
                    </p>
                    <Kaydirac
                      id="altlik-opaklik"
                      etiket="Opaklık"
                      deger={Math.round(altlikOpaklik * 100)}
                      min={5}
                      max={100}
                      step={5}
                      bicim={(v) => `%${v}`}
                      onChange={(v) => setAltlikOpaklik(v / 100)}
                    />
                    <Kaydirac
                      id="altlik-olcek"
                      etiket="Ölçek"
                      deger={altlikOlcek}
                      min={40}
                      max={250}
                      step={5}
                      bicim={(v) => `%${v}`}
                      onChange={altligiOlcekle}
                    />
                    <Kaydirac
                      id="altlik-yatay"
                      etiket="Yatay"
                      deger={Math.round(kutuMerkez.x - temelMerkez.x)}
                      min={-300}
                      max={300}
                      step={4}
                      bicim={(v) => `${fmtCm(v)} cm`}
                      onChange={(v) => altligiTasi("x", v)}
                    />
                    <Kaydirac
                      id="altlik-dikey"
                      etiket="Dikey"
                      deger={Math.round(kutuMerkez.y - temelMerkez.y)}
                      min={-300}
                      max={300}
                      step={4}
                      bicim={(v) => `${fmtCm(v)} cm`}
                      onChange={(v) => altligiTasi("y", v)}
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      {/* Düğmenin adı hangi çerçeveye döneceğini söylüyor:
                          ölçüm tuttuysa karenin KENDİ ölçüsüne, tutmadıysa
                          giysi alanına — ikisi aynı şey değil ve "giysi
                          alanı" demek ölçülmüş kutuyu gizlerdi. */}
                      <button type="button" onClick={() => setAltlikKutu(temelKutu)} className="eyebrow u-line text-ash hover:text-ink">
                        {aktifAltlik.tur !== "teknik"
                          ? "Kroki boyuna sıfırla"
                          : olculenKutular[aktifAltlik.src]
                            ? "Ölçülen çerçeveye sıfırla"
                            : "Giysi alanına sıfırla"}
                      </button>
                      <button type="button" onClick={() => altligiSec(null)} className="eyebrow u-line text-ash hover:text-ink">
                        Altlığı kaldır
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-[11px] leading-4 text-fog">
                    {gorunumAdi} görünümünde altlık kapalı — bir kareye tıklayın.
                  </p>
                )}
              </section>
            )}

            {/* Seçim */}
            <div className="flex items-baseline justify-between">
              <p className="eyebrow text-ash">Seçim</p>
              <span className="eyebrow text-ash">{cokluSecim ? `${secililer.length} parça` : "Shift ile çoğalt"}</span>
            </div>

            {/* HİZALAMA YALNIZ ÇOKLU SEÇİMDE. Tek parçada hizalayacak bir
                referans yok; düğmeleri hep göstermek "neye göre hizalıyor"
                sorusunu cevapsız bırakırdı. */}
            {cokluSecim && (
              <div className="mt-3 space-y-2 text-[12px] leading-4">
                <Row k="Hizala">
                  <span className="inline-flex items-center gap-1">
                    {([
                      ["sol", "Sol kenar", "M4 3v18M8 8h11M8 16h7"],
                      ["yatayOrta", "Yatay orta", "M12 3v18M6 8h12M8 16h8"],
                      ["sag", "Sağ kenar", "M20 3v18M5 8h11M9 16h7"],
                      ["ust", "Üst kenar", "M3 4h18M8 8v11M16 8v7"],
                      ["dikeyOrta", "Dikey orta", "M3 12h18M8 6v12M16 8v8"],
                      ["alt", "Alt kenar", "M3 20h18M8 5v11M16 9v7"],
                    ] as [Hiza, string, string][]).map(([id, ad, yol]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => hizala(id)}
                        title={ad}
                        aria-label={ad}
                        className="flex h-6 w-6 items-center justify-center border border-mist text-smoke transition-colors hover:border-ink/40 hover:text-ink"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                          <path d={yol} />
                        </svg>
                      </button>
                    ))}
                  </span>
                </Row>
                <Row k="Dağıt">
                  <span className="inline-flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => dagit("yatay")}
                      disabled={secililer.length < 3}
                      title="Merkezleri yatayda eşitle — en az üç parça"
                      className="eyebrow text-ash u-line hover:text-ink disabled:opacity-40 disabled:hover:text-ash"
                    >
                      Yatay
                    </button>
                    <button
                      type="button"
                      onClick={() => dagit("dikey")}
                      disabled={secililer.length < 3}
                      title="Merkezleri dikeyde eşitle — en az üç parça"
                      className="eyebrow text-ash u-line hover:text-ink disabled:opacity-40 disabled:hover:text-ash"
                    >
                      Dikey
                    </button>
                  </span>
                </Row>
              </div>
            )}

            {selectedSimge ? (
              <div className="mt-3 space-y-2 text-[12px] leading-4">
                <p className="font-display text-lg leading-6">{SIMGELER.find((x) => x.id === selectedSimge.tur)?.label}</p>
                <p className="text-[11px] leading-4 text-ash">{SIMGELER.find((x) => x.id === selectedSimge.tur)?.ipucu}</p>
                {/* Açı ve boy SAYIYLA giriliyor: simge bir talimat, "gözüne
                    göre" değil ölçüyle konuyor. Dokuma yönünü 90° yerine
                    88° bırakmak kesimhanede fark eder. */}
                <Row k="Açı">
                  <span className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      value={Math.round(selectedSimge.aci)}
                      onChange={(e) => simgeGuncelle(selectedSimge.id, { aci: Number(e.target.value) || 0 }, false)}
                      aria-label="Simge açısı"
                      className="w-14 border-b border-mist bg-transparent py-0.5 text-right tabular-nums outline-none focus:border-ink"
                    />
                    <span className="text-ash">°</span>
                  </span>
                </Row>
                <Row k="Boy">
                  <span className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={Number(toCm(selectedSimge.boy).toFixed(1))}
                      onChange={(e) => simgeGuncelle(selectedSimge.id, { boy: Math.max(2, (Number(e.target.value) || 0) * UNITS_PER_CM) }, false)}
                      aria-label="Simge boyu"
                      className="w-16 border-b border-mist bg-transparent py-0.5 text-right tabular-nums outline-none focus:border-ink"
                    />
                    <span className="text-ash">cm</span>
                  </span>
                </Row>
                <p className="text-[11px] leading-4 text-ash">Sürükleyerek taşıyın. Silmek için Delete.</p>
              </div>
            ) : selectedNot ? (
              <div className="mt-3 space-y-3 text-[12px] leading-4">
                <textarea
                  value={selectedNot.metin}
                  onChange={(e) => notGuncelle(selectedNot.id, { metin: e.target.value }, false)}
                  rows={3}
                  aria-label="Not metni"
                  placeholder="Kenardan 6 mm üst dikiş"
                  className="w-full resize-none border-b border-mist bg-transparent py-1.5 text-[13px] leading-5 outline-none focus:border-ink"
                />
                <Row k="Kılavuz">
                  <button
                    type="button"
                    onClick={() =>
                      notGuncelle(
                        selectedNot.id,
                        selectedNot.ok
                          ? { ok: undefined }
                          : /* Ok yoksa etiketin biraz soluna koyuyoruz:
                               tam altına konsa çizgi görünmez uzunlukta
                               olur ve kullanıcı bir şey olmadı sanır. */
                            { ok: { x: selectedNot.p.x - 40, y: selectedNot.p.y + 20 } },
                      )
                    }
                    className="eyebrow text-ash u-line hover:text-ink"
                  >
                    {selectedNot.ok ? "Kaldır" : "Ekle"}
                  </button>
                </Row>
                <p className="text-[11px] leading-4 text-ash">
                  Notu sürükleyerek taşıyın. Silmek için Delete.
                </p>
              </div>
            ) : selected ? (
              <div className="mt-3 space-y-2 text-[12px] leading-4">
                <input
                  value={selected.name}
                  onChange={(e) => updateShape(selected.id, { name: e.target.value }, false)}
                  aria-label="Parça adı"
                  className="w-full border-b border-mist bg-transparent py-1.5 font-display text-lg leading-6 outline-none focus:border-ink"
                />
                <Row k="Boyut">{selBox ? `${fmtCm(selBox.w)} × ${fmtCm(selBox.h)} cm` : "—"}</Row>
                <Row k="Nokta">{selected.points.length}{selected.closed ? " · kapalı" : " · açık"}</Row>
                <Row k="Dikiş">{STITCHES.find((s) => s.id === selected.stitch)?.label}</Row>
                <Row k="Kalınlık">
                  <span className="inline-flex items-center gap-1">
                    {KALINLIKLAR.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => {
                          setKalinlik(x.id);
                          updateShape(selected.id, { kalinlik: x.id });
                        }}
                        aria-pressed={selected.kalinlik === x.id}
                        title={`${x.label} — dış hat`}
                        className={cn(
                          "flex h-5 w-7 items-center justify-center border transition-colors",
                          selected.kalinlik === x.id ? "border-ink text-ink" : "border-mist text-smoke hover:border-ink/40",
                        )}
                      >
                        {/* Örnek çizgi, kalınlığın kendisiyle çiziliyor:
                            etiket okumadan seçilebilsin. */}
                        <svg viewBox="0 0 20 6" className="h-1.5 w-4" aria-hidden>
                          <line x1="1" y1="3" x2="19" y2="3" stroke="currentColor" strokeWidth={x.px} />
                        </svg>
                      </button>
                    ))}
                  </span>
                </Row>
                <Row k="Sıra">
                  <span className="inline-flex items-center gap-3">
                    <button type="button" onClick={() => katmanaTasi("on")} className="eyebrow text-ash u-line hover:text-ink" title="Öne getir · ]">
                      Öne
                    </button>
                    <button type="button" onClick={() => katmanaTasi("arka")} className="eyebrow text-ash u-line hover:text-ink" title="Arkaya gönder · [">
                      Arkaya
                    </button>
                  </span>
                </Row>
                <Row k="Kumaş">
                  {kumasAdi(selected.fabricId)}
                  {selected.fabricId && (
                    <button type="button" onClick={() => applyFabric(selected.id, null)} className="ml-2 eyebrow text-ash u-line hover:text-ink">
                      Kaldır
                    </button>
                  )}
                </Row>
              </div>
            ) : (
              <p className="mt-3 text-[11px] leading-4 text-ash">Bir parça seçin; kumaşı tıklayarak ya da sürükleyip bırakarak uygulayın.</p>
            )}

            {/* Kumaş */}
            <div className="mt-7 flex items-baseline justify-between">
              <p className="eyebrow text-ash">Kumaş</p>
              <span className="eyebrow text-ash">{tohumKumas ? "Kartela · üretilen" : "Kumaş sayfasından"}</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {kumasSecenekleri.map((k) => {
                const active = selected?.fabricId === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/fabric", k.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => {
                      if (selected && selected.closed) applyFabric(selected.id, k.id);
                      else setToast("Önce kapalı bir parça seçin ya da kumaşı parçanın üstüne sürükleyin");
                    }}
                    title={k.ipucu}
                    aria-label={k.ad}
                    aria-pressed={active}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "block h-9 w-9 rounded-full border border-ink/10 bg-cover bg-center transition-[outline-color,scale] duration-300 outline outline-1 outline-offset-2",
                        active ? "outline-[#6B7C93]" : "outline-transparent group-hover:scale-105",
                      )}
                      style={{ backgroundImage: `url(${k.gorsel})` }}
                    />
                    <span className="w-full truncate text-center text-[9px] leading-3 text-ash">{k.ad}</span>
                  </button>
                );
              })}
            </div>

            {/* Katmanlar */}
            <div className="mt-7 flex items-baseline justify-between">
              <p className="eyebrow text-ash">Katmanlar · {VIEWS.find((v) => v.id === view)?.label}</p>
              <span className="eyebrow tabular-nums text-ash">{cur.shapes.length}</span>
            </div>
            <ul className="mt-3 divide-y divide-mist border-y border-mist">
              {[...cur.shapes].reverse().map((s) => {
                const isSel = secimIdleri.includes(s.id);
                return (
                  <li key={s.id} className={cn("flex items-center gap-2 py-2", !s.visible && "opacity-50")}>
                    <button
                      type="button"
                      onClick={(e) => secimeAl(s.id, e.shiftKey)}
                      title="Shift ile birden çok parça seçilir"
                      className={cn("flex min-w-0 flex-1 items-center gap-2.5 text-left", isSel ? "text-ink" : "text-smoke hover:text-ink")}
                    >
                      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0", isSel ? "bg-[#6B7C93]" : "border border-ink/30")} />
                      <span className="truncate text-[12.5px]">{s.name}</span>
                      <span className="ml-auto shrink-0 eyebrow text-ash">{STITCHES.find((x) => x.id === s.stitch)?.label.split(" ")[0]}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={s.visible ? `${s.name} gizle` : `${s.name} göster`}
                      onClick={() => updateShape(s.id, { visible: !s.visible }, false)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center text-ash hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                        {s.visible ? <circle cx="12" cy="12" r="2.5" /> : <path d="M4 4l16 16" />}
                      </svg>
                    </button>
                  </li>
                );
              })}
              {cur.shapes.length === 0 && <li className="py-3 text-[11px] text-ash">Bu görünümde parça yok — kalemle çizin.</li>}
            </ul>

            {/* ÖLÇÜ TABLOSU (POM).

                Satırın DEĞERİ yazılmıyor, ÖLÇÜLÜYOR: çizimdeki iki nokta
                arası zaten mesafe veriyor. Elle girilseydi çizimle tablo
                birbirinden ayrı düşer ve hangisinin doğru olduğu belirsiz
                kalırdı — tech pack'lerdeki en sık uyuşmazlık bu.

                Satır numarası tuvaldeki daireyle aynı; tabloyu çizime
                bağlayan tek şey o. */}
            <div className="mt-7 flex items-baseline justify-between">
              <p className="eyebrow text-ash">Ölçü tablosu · {VIEWS.find((v) => v.id === view)?.label}</p>
              <span className="eyebrow tabular-nums text-ash">{cur.measures.length}</span>
            </div>
            {/* BEDEN SERİSİ. Numune beden tıklanarak seçiliyor; hangi
                bedenin ÖLÇÜLDÜĞÜ, hangilerinin TÜRETİLDİĞİ ayrımı
                gradasyonun tamamını belirliyor. */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {seri.bedenler.map((b, i) => (
                <button
                  key={`${b}-${i}`}
                  type="button"
                  onClick={() => setSeri((x) => ({ ...x, numune: i }))}
                  title={i === seri.numune ? "Numune beden — ölçülen" : "Numune beden yap"}
                  aria-pressed={i === seri.numune}
                  className={cn(
                    "border px-2 py-0.5 text-[11px] tabular-nums transition-colors",
                    i === seri.numune ? "border-ink bg-ink text-bone" : "border-mist text-smoke hover:border-ink/40",
                  )}
                >
                  {b}
                </button>
              ))}
              <input
                value={seri.bedenler.join(" ")}
                aria-label="Beden serisi"
                onChange={(e) => {
                  const bedenler = e.target.value.split(/[\s,]+/).filter(Boolean);
                  if (!bedenler.length) return;
                  setSeri((x) => ({ bedenler, numune: Math.min(x.numune, bedenler.length - 1) }));
                }}
                className="ml-1 w-28 border-b border-mist bg-transparent py-0.5 text-[11px] outline-none focus:border-ink"
              />
            </div>

            <datalist id="pom-onerileri">
              {POM_ONERILERI.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
            <ul className="mt-3 divide-y divide-mist border-y border-mist">
              {cur.measures.map((m, i) => (
                <li key={m.id} className={cn("py-2.5", m.id === selectedId && "bg-ink/[0.03]")}>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-ink/30 text-[10px] tabular-nums text-smoke"
                    >
                      {i + 1}
                    </span>
                    <input
                      value={m.ad ?? ""}
                      list="pom-onerileri"
                      placeholder="Ölçü adı"
                      aria-label={`${i + 1}. ölçünün adı`}
                      onChange={(e) => olcumGuncelle(m.id, { ad: e.target.value }, false)}
                      onFocus={() => { setSelectedId(m.id); setEkSecim([]); }}
                      className="min-w-0 flex-1 border-b border-transparent bg-transparent py-0.5 text-[12.5px] outline-none placeholder:text-ash focus:border-ink"
                    />
                    <span className="shrink-0 text-[12.5px] tabular-nums">{fmtCm(dist(m.a, m.b))}</span>
                    <button
                      type="button"
                      onClick={() => olcumSil(m.id)}
                      aria-label={`${i + 1}. ölçüyü sil`}
                      className="shrink-0 text-ash transition-colors hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                  {/* Tolerans ve artış ikinci satırda: ilk satıra sıkışınca
                      ölçü ADI okunmaz hâle geliyordu ve asıl aranan o. */}
                  <div className="mt-1 flex items-center gap-3 pl-[27px] text-[11px] text-ash">
                    <label className="flex items-center gap-1">
                      Tolerans ±
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={m.tolerans ?? VARSAYILAN_TOLERANS}
                        aria-label={`${i + 1}. ölçünün toleransı`}
                        onChange={(e) => olcumGuncelle(m.id, { tolerans: Math.max(0, Number(e.target.value) || 0) }, false)}
                        className="w-9 border-b border-transparent bg-transparent py-0.5 text-right tabular-nums text-smoke outline-none focus:border-ink"
                      />
                    </label>
                    <label className="flex items-center gap-1" title="Beden başına artış — gradasyon kuralı">
                      Artış
                      <input
                        type="number"
                        step="0.1"
                        value={m.artis ?? 0}
                        aria-label={`${i + 1}. ölçünün beden başına artışı`}
                        onChange={(e) => olcumGuncelle(m.id, { artis: Number(e.target.value) || 0 }, false)}
                        className="w-10 border-b border-transparent bg-transparent py-0.5 text-right tabular-nums text-smoke outline-none focus:border-ink"
                      />
                      cm
                    </label>
                  </div>
                </li>
              ))}
              {cur.measures.length === 0 && (
                <li className="py-3 text-[11px] leading-4 text-ash">
                  Ölçü yok — mezurayla (M) iki nokta arasını sürükleyin. Her ölçü tabloya bir satır olarak düşer.
                </li>
              )}
            </ul>
          </div>
          <div className="flex items-center gap-5 border-t border-ink/10 px-4 py-3">
            <button
              type="button"
              onClick={exportSvg}
              disabled={disaAktariliyor}
              className="eyebrow u-line disabled:opacity-40"
            >
              {disaAktariliyor ? "Hazırlanıyor…" : "SVG indir"}
            </button>
            <button type="button" onClick={() => window.print()} className="eyebrow u-line">
              PDF olarak yazdır
            </button>
            <button type="button" onClick={pomCsv} className="eyebrow u-line">
              Ölçü tablosu · CSV
            </button>
          </div>
        </Glass>
      </aside>
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute right-4 top-20 flex h-9 items-center gap-2 border border-ink/10 bg-paper/70 px-3 eyebrow backdrop-blur-md transition-colors hover:bg-paper"
          aria-label="Paneli aç"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1"><path d="M10 3L5 8l5 5" /></svg>
          Kumaş · Katmanlar
        </button>
      )}

      {/* ---------------- ALT: görünümler, durum, zoom ---------------- */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3">
        <Glass className="pointer-events-auto flex items-center gap-6 px-4 py-2.5" role="tablist" aria-label="Görünümler">
          {VIEWS.map((v) => {
            const active = v.id === view;
            return (
              <button
                key={v.id}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setView(v.id);
                  setSelectedId(null);
                  setDraft([]);
                  setUserView(null);
                }}
                data-active={active}
                className={cn("eyebrow u-line transition-colors", active ? "text-ink" : "text-ash hover:text-ink")}
              >
                {v.label}
              </button>
            );
          })}
        </Glass>

        <Glass className="pointer-events-auto hidden items-center gap-4 px-4 py-2.5 md:flex">
          <span className="eyebrow tabular-nums text-ash">
            {hover ? `x ${fmtCm(hover.x)} · y ${fmtCm(hover.y)} cm` : "—"}
          </span>
          <span className="h-3 w-px bg-ink/10" />
          <span className="eyebrow text-ash">{toolMeta.label}: {toolMeta.hint}</span>
        </Glass>

        <Glass className="pointer-events-auto flex items-center gap-1 p-1">
          <ToolButton label="Uzaklaştır · −" onClick={() => zoomBy(1 / 1.2)}>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 8h10" /></svg>
          </ToolButton>
          <span className="w-12 text-center eyebrow tabular-nums">{pct}%</span>
          <ToolButton label="Yakınlaştır · +" onClick={() => zoomBy(1.2)}>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 8h10M8 3v10" /></svg>
          </ToolButton>
          <Sep />
          <button type="button" onClick={() => setUserView(null)} className="h-9 px-3 eyebrow text-ink transition-colors hover:bg-ink/[0.04]">
            Sığdır
          </button>
        </Glass>
      </div>

      <Toast message={toast} onHide={() => setToast(null)} />

      {/* BASKI AĞACI — ekranda görünmez, DOM'da durur. Yazdırma anında
          üretilemez: görsellerin çoktan yüklenmiş olması gerekiyor
          (lookbook baskısındaki yorum aynı gerekçeyi anlatıyor).

          İçi boş görünümler sayfa AÇMIYOR: parçası olmayan bir "Detay"
          sekmesi için boş bir A4 basmak, dosyayı alan kişiye eksik iş
          teslim etmek gibi görünürdü. */}
      <div className="lookbook-baski-kok" aria-hidden>
        {VIEWS.map((v) => (
          <BaskiSayfa
            key={v.id}
            g={doc[v.id]}
            seri={seri}
            baslik={baslik}
            gorunum={v.label}
            tohumKumas={tohumKumas ?? null}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Parçalar
   ------------------------------------------------------------------ */

function Glass({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border border-ink/10 bg-paper/75 backdrop-blur-md", className)} {...rest}>
      {children}
    </div>
  );
}

function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-ink/10" />;
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center transition-colors duration-300 disabled:opacity-30",
        active ? "bg-ink text-bone" : "text-[#1a1a1a]/75 hover:bg-ink/[0.04] hover:text-ink",
      )}
    >
      {children}
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1.5 eyebrow text-bone opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}

function ToolIcon({ id }: { id: Tool }) {
  const c = { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "select":
      return <svg {...c}><path d="M6 4l11 8.5-5 .8 3 6-2 1-3-6-4 3.7z" /></svg>;
    case "pen":
      return <svg {...c}><path d="M4 20l4-1 10-10-3-3L5 16z" /><path d="M13 8l3 3" /><path d="M4 20l1-4" /></svg>;
    case "measure":
      return <svg {...c}><rect x="3" y="9" width="18" height="6" /><path d="M7 9v2.5M11 9v3.5M15 9v2.5M19 9v3.5" /></svg>;
    case "not":
      return <svg {...c}><rect x="3" y="4" width="13" height="10" /><path d="M6 7.5h7M6 10.5h5" /><path d="M9 14l-2 6 6-6" /></svg>;
    case "simge":
      return <svg {...c}><path d="M12 3v18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3" /></svg>;
    case "cut":
      return <svg {...c}><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="6.5" cy="17.5" r="2.5" /><path d="M8.5 8.2L20 17M8.5 15.8L20 7" /></svg>;
    case "hand":
      return <svg {...c}><path d="M8 12.5V6.5a1.5 1.5 0 0 1 3 0v5M11 11.5V4.5a1.5 1.5 0 0 1 3 0v7M14 11.5v-5a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-12 0v-3.5a1.5 1.5 0 0 1 3 0" /></svg>;
  }
}

function StitchSample({ id }: { id: Stitch }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1 };
  return (
    <svg viewBox="0 0 40 10" className="h-2.5 w-10 text-ink/70" aria-hidden>
      {id === "duz" && <path d="M0 5h40" {...common} />}
      {id === "ust" && (<><path d="M0 3h40" {...common} /><path d="M0 7h40" {...common} strokeDasharray="3 2" /></>)}
      {id === "zigzag" && <path d="M0 8l4-6 4 6 4-6 4 6 4-6 4 6 4-6 4 6 4-6 4 6" {...common} />}
      {id === "surfile" && (<><path d="M0 5h40" {...common} /><path d="M2 5v4M6 5v4M10 5v4M14 5v4M18 5v4M22 5v4M26 5v4M30 5v4M34 5v4M38 5v4" {...common} /></>)}
    </svg>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-mist pb-1.5 last:border-b-0">
      <span className="eyebrow text-ash">{k}</span>
      <span className="text-right tabular-nums text-smoke">{children}</span>
    </div>
  );
}

/** Sürgü — dolu kısmın yüzdesi `--p` ile veriliyor (bkz. .slider). */
function Kaydirac({
  id,
  etiket,
  deger,
  min,
  max,
  step = 1,
  bicim,
  onChange,
}: {
  id: string;
  etiket: string;
  deger: number;
  min: number;
  max: number;
  step?: number;
  bicim: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const oran = ((deger - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="eyebrow text-ash">
          {etiket}
        </label>
        <span className="text-[12px] tabular-nums text-fog">{bicim(deger)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={deger}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={bicim(deger)}
        className="slider mt-1"
        style={{ "--p": `${oran}%` } as CSSProperties}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   BASKI AĞACI

   Depoda çalışan bir baskı hattı zaten vardı (lookbook, moodboard,
   kolaj) ama teknik çizim ona hiç bağlanmamıştı — yani üründeki en
   "gönderilecek" belge, gönderilemeyen tek belgeydi.

   MANKEN BASKIYA GİRMİYOR. Kroki tuvalde bir çizim yardımcısı: üstünden
   çizilsin diye var. Şartnamede giysinin kendisi olmalı, onu tutan
   figür değil — altlık fotoğrafın dışarıda kalmasıyla aynı gerekçe.

   Sayfa A4 YATAY, çünkü baskı hattının `@page` kuralı öyle ve tek bir
   stüdyo için ikinci bir sayfa boyu tanımlamak, bugün üç stüdyoda
   çalışan kuralı dallandırmak demekti. Çizim sayfaya oranını koruyarak
   sığıyor, yani yatay kâğıt bir kayıp değil.
   ------------------------------------------------------------------ */
function baskiKutusu(g: ViewDoc) {
  const noktalar: Pt[] = [
    ...g.shapes.filter((x) => x.visible).flatMap((x) => x.points),
    ...g.measures.flatMap((m) => [m.a, m.b]),
    ...g.notlar.flatMap((n) => (n.ok ? [n.p, n.ok] : [n.p])),
    ...g.simgeler.flatMap((x) => {
      const r = (x.aci * Math.PI) / 180;
      return [x.p, { x: x.p.x + x.boy * Math.cos(r), y: x.p.y + x.boy * Math.sin(r) }];
    }),
  ];
  return noktalar.length ? bbox(noktalar) : null;
}

function BaskiSayfa({
  g,
  seri,
  baslik,
  gorunum,
  tohumKumas,
}: {
  g: ViewDoc;
  seri: Seri;
  baslik: string;
  gorunum: string;
  tohumKumas: string | null;
}) {
  const k = baskiKutusu(g);
  if (!k) return null;
  const pay = 24;
  const en = k.w + pay * 2;
  const boy = k.h + pay * 2;
  /* Metin boyu KÂĞITTAN türetiliyor. `NotIsareti` yazıyı `11/zoom` ile
     çiziyor; kâğıtta ~3 mm istiyoruz ve 297 mm genişlik `en` birime denk
     geliyor, yani zoom = 11·297/(3·en). Sabit bir sayı yazsaydık küçük
     bir detay çiziminde not devasa, uzun bir paltoda okunmaz çıkardı. */
  const baskiZoom = (11 * 297) / (3 * en);
  const kullanilan = new Set(g.shapes.filter((x) => x.visible && x.fabricId).map((x) => x.fabricId));

  return (
    <div className="lookbook-sayfa" style={{ background: "#fff", color: INK, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8mm",
          padding: "9mm 12mm 3mm",
          fontSize: "3mm",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          borderBottom: `0.2mm solid ${INK}`,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{baslik}</span>
        <span style={{ whiteSpace: "nowrap" }}>{gorunum}</span>
      </div>
      <svg
        viewBox={`${(k.minX - pay).toFixed(2)} ${(k.minY - pay).toFixed(2)} ${en.toFixed(2)} ${boy.toFixed(2)}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ flex: 1, minHeight: 0, width: "100%", padding: "4mm 12mm" }}
      >
        <defs>
          {fabrics
            .filter((f) => kullanilan.has(f.id))
            .map((f) => (
              <pattern key={f.id} id={`bfab-${f.id}`} width="96" height="96" patternUnits="userSpaceOnUse">
                <image href={f.image} width="96" height="96" preserveAspectRatio="xMidYMid slice" />
              </pattern>
            ))}
          {tohumKumas && kullanilan.has(TOHUM_KUMAS) && (
            <pattern id={`bfab-${TOHUM_KUMAS}`} width="96" height="96" patternUnits="userSpaceOnUse">
              <image href={tohumKumas} width="96" height="96" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          )}
        </defs>
        {g.shapes.filter((x) => x.visible).map((x) => (
          <ParcaGovde key={x.id} s={x} desenOneki="bfab" />
        ))}
        {g.simgeler.map((x) => (
          <SimgeIsareti key={x.id} simge={x} selected={false} onDown={() => {}} />
        ))}
        {/* Tuvaldeki işaretin AYNISI: numara, uç çentikleri ve cm etiketi.
            Baskı için ayrı bir çizim yazsaydık numaralandırma iki yerde
            yaşar ve biri kayınca tablo çizimi göstermez olurdu. */}
        {g.measures.map((m, i) => (
          <MeasureMark key={m.id} a={m.a} b={m.b} no={i + 1} zoom={baskiZoom} selected={false} onSelect={() => {}} />
        ))}
        {g.notlar.map((n) => (
          <NotIsareti key={n.id} not={n} zoom={baskiZoom} selected={false} onDown={() => {}} />
        ))}
      </svg>
      {/* ÖLÇÜ TABLOSU sayfanın altında, çizimle AYNI sayfada. Ayrı bir
          sayfaya konsa atölye numarayı aramak için kâğıt çevirirdi. */}
      {g.measures.length > 0 && (
        <table style={{ width: "calc(100% - 24mm)", margin: "0 12mm", borderCollapse: "collapse", fontSize: "2.7mm" }}>
          <tbody>
            <tr style={{ borderBottom: "0.2mm solid #1a1a1a" }}>
              {["No", "Ölçüm noktası", ...seri.bedenler, "Tol."].map((h, i) => (
                <td
                  key={`${h}-${i}`}
                  style={{
                    padding: "1.2mm 2mm",
                    fontSize: "2.4mm",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#55525c",
                    textAlign: i >= 2 ? "right" : "left",
                    width: i === 0 ? "9mm" : i >= 2 ? "17mm" : undefined,
                    /* NUMUNE BEDEN İŞARETLİ. Türetilmiş sayılarla ölçülmüş
                       sayı aynı tabloda duruyor; hangisinin ölçüldüğünü
                       söylemeyen bir tablo, gradasyon hatasını fark
                       edilmez kılar. */
                    borderBottom: i - 2 === seri.numune ? "0.6mm solid #1a1a1a" : undefined,
                  }}
                >
                  {h}
                </td>
              ))}
            </tr>
            {g.measures.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: "0.12mm solid #d8d6dc" }}>
                <td style={{ padding: "1.2mm 2mm", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                <td style={{ padding: "1.2mm 2mm" }}>{m.ad?.trim() || "Adsız ölçü"}</td>
                {seri.bedenler.map((b, bi) => (
                  <td
                    key={`${b}-${bi}`}
                    style={{
                      padding: "1.2mm 2mm",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: bi === seri.numune ? "#1a1a1a" : "#55525c",
                    }}
                  >
                    {bedendeOlcu(m, seri, bi).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                ))}
                <td style={{ padding: "1.2mm 2mm", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#55525c" }}>
                  ± {(m.tolerans ?? VARSAYILAN_TOLERANS).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "3mm 12mm 9mm",
          fontSize: "2.6mm",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#6a6870",
        }}
      >
        <span>Selvi AI · teknik çizim</span>
        <span suppressHydrationWarning>{new Date().toLocaleDateString("tr-TR")}</span>
      </div>
    </div>
  );
}

/**
 * Bir parçanın GÖVDESİ — yol, dolgu ve dikişi.
 *
 * Tuval ile BASKI aynı bileşeni kullanıyor. Eskiden yalnız tuvalde vardı;
 * baskı ağacı eklenirken aynı otuz satırı ikinci kez yazmak, birinde
 * düzeltilen bir dikiş hatasının ötekinde yaşaması demekti — depo bu
 * hatayı baskı CSS'inde zaten bir kez yapmış ve yorumunda anlatıyor.
 * Seçim çerçevesi ve çapalar burada YOK: onlar tuvalin kromu.
 */
function ParcaGovde({ s, desenOneki = "fab" }: { s: Shape; desenOneki?: string }) {
  const d = s.smooth ? smoothPath(s.points, s.closed) : polyPath(s.points, s.closed);
  const sampled = s.stitch === "zigzag" || s.stitch === "surfile" ? samplePath(s.points, s.closed, s.smooth, 4) : [];
  return (
    <>
      <path
        d={d}
        /* Desen kimliği ÖNEKLE geliyor: baskı ağacının kendi SVG'si var
           ve desen tanımları SVG'ye özel. İki ağaç aynı kimliği
           kullansaydı tarayıcı ilkini bulur, baskıda kumaş dolgusu
           tuvalinkine bağlanırdı. */
        fill={s.closed ? (s.fabricId ? `url(#${desenOneki}-${s.fabricId})` : "rgba(26,26,26,0.035)") : "none"}
        fillOpacity={s.fabricId ? 0.95 : 1}
        stroke={INK}
        strokeOpacity={s.stitch === "zigzag" ? 0.45 : 1}
        strokeWidth={kalinlikPx(s.kalinlik)}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* DİKİŞLER HER ZAMAN İNCE. Kalınlık seçimi parçanın DIŞ HATTINA
          ait; dikişi de kalınlaştırmak hiyerarşiyi yok eder ve kalınlık
          seçimini süse çevirirdi. */}
      {s.stitch === "ust" && s.closed && (
        <path d={s.smooth ? smoothPath(inset(s.points, 4), true) : polyPath(inset(s.points, 4), true)} fill="none" stroke={INK} strokeWidth={kalinlikPx("ince")} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      )}
      {s.stitch === "zigzag" && <path d={zigzag(sampled, s.closed, 2)} fill="none" stroke={INK} strokeWidth={kalinlikPx("ince")} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      {s.stitch === "surfile" && <path d={overlockTicks(sampled, s.closed, 3.5)} fill="none" stroke={INK} strokeWidth={kalinlikPx("ince")} vectorEffect="non-scaling-stroke" />}
    </>
  );
}

/**
 * Giysi simgesi.
 *
 * Hepsi yerel koordinatta ÇİZİLİP tek bir `rotate` ile döndürülüyor:
 * beş ayrı geometriyi beş kez açıyla hesaplamak yerine, her biri "sağa
 * doğru duran" hâliyle yazılıyor. Okunması da bakımı da böyle kolay.
 */
function SimgeIsareti({
  simge,
  selected,
  onDown,
}: {
  simge: Simge;
  selected: boolean;
  onDown: (e: ReactPointerEvent<SVGGElement>) => void;
}) {
  const L = simge.boy;
  const renk = selected ? SELECT : INK;
  const ortak = {
    fill: "none",
    stroke: renk,
    strokeWidth: kalinlikPx(simge.tur === "grainline" ? "orta" : "ince"),
    strokeLinecap: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };
  /* Ok ucu boyun bir oranı değil sabit: uzun bir grainline'da orantılı ok
     devasa olurdu, kısa bir kertikte görünmezdi. */
  const ok = Math.min(7, L * 0.22);

  const govde = () => {
    switch (simge.tur) {
      case "grainline":
        return (
          <>
            <line x1={0} y1={0} x2={L} y2={0} {...ortak} />
            <path d={`M ${ok} ${-ok * 0.6} L 0 0 L ${ok} ${ok * 0.6}`} {...ortak} />
            <path d={`M ${L - ok} ${-ok * 0.6} L ${L} 0 L ${L - ok} ${ok * 0.6}`} {...ortak} />
          </>
        );
      case "kertik":
        /* Kertik dikiş hattını KESEN kısa bir çizgi; ortasındaki nokta
           hangi noktada buluşulacağını işaretliyor. */
        return (
          <>
            <line x1={0} y1={0} x2={L} y2={0} {...ortak} />
            <circle cx={L / 2} cy={0} r={1.6} fill={renk} stroke="none" />
          </>
        );
      case "pens": {
        const g = L * 0.28;
        return (
          <>
            <line x1={0} y1={-g / 2} x2={L} y2={0} {...ortak} />
            <line x1={0} y1={g / 2} x2={L} y2={0} {...ortak} />
            <line x1={0} y1={-g / 2} x2={0} y2={g / 2} {...ortak} strokeDasharray="3 3" />
          </>
        );
      }
      case "pile": {
        const g = L * 0.3;
        return (
          <>
            <line x1={0} y1={-g / 2} x2={L} y2={-g / 2} {...ortak} />
            <line x1={0} y1={g / 2} x2={L} y2={g / 2} {...ortak} />
            {/* Çapraz ok katlamanın hangi yöne yattığını söylüyor. */}
            <line x1={L * 0.15} y1={g / 2} x2={L * 0.85} y2={-g / 2} {...ortak} />
            <path d={`M ${L * 0.85 - ok} ${-g / 2 - ok * 0.2} L ${L * 0.85} ${-g / 2} L ${L * 0.85 - ok * 0.5} ${-g / 2 + ok * 0.7}`} {...ortak} />
          </>
        );
      }
      case "katlama":
        return <line x1={0} y1={0} x2={L} y2={0} {...ortak} strokeDasharray="10 4 2 4" />;
    }
  };

  return (
    <g
      transform={`translate(${simge.p.x} ${simge.p.y}) rotate(${simge.aci})`}
      onPointerDown={onDown}
      style={{ cursor: "move" }}
    >
      {/* Görünmez yakalama şeridi: ince çizgileri fareyle tutturmak
          zorlaşıyor, tıklama alanı çizgiden kalın olmalı. */}
      <rect x={-4} y={-10} width={L + 8} height={20} fill="transparent" />
      {govde()}
    </g>
  );
}

/**
 * Not / açıklama balonu.
 *
 * METİN EKRAN BOYUNDA, tuval boyunda değil. Ölçü etiketleri de böyle
 * çalışıyor ve tutarlılık burada işlevsel: bir açıklama her yakınlaştırma
 * kademesinde okunabilir olmalı, yoksa 0,25x'te not diye bir leke kalır.
 * Bedeli, dışa aktarılan SVG'de metnin o anki kademeye göre donması —
 * ölçü etiketlerinin bugün zaten yaptığı şey.
 *
 * Plaka ZORUNLU: notlar çoğu zaman altlık fotoğrafın ya da kumaş
 * dolgusunun üstüne düşüyor ve düz metin orada okunmuyor.
 */
function NotIsareti({
  not,
  zoom,
  selected,
  onDown,
}: {
  not: Not;
  zoom: number;
  selected: boolean;
  onDown: (e: ReactPointerEvent<SVGGElement>) => void;
}) {
  const fs = 11 / zoom;
  const satirlar = not.metin.split("\n");
  const en = Math.max(1, ...satirlar.map((x) => x.length)) * 6.1 / zoom;
  const boy = satirlar.length * fs * 1.3;
  const pay = 5 / zoom;
  const x = not.p.x, y = not.p.y;
  const stroke = selected ? SELECT : INK;
  return (
    <g onPointerDown={onDown} style={{ cursor: "move" }}>
      {not.ok && (
        <line
          x1={x}
          y1={y}
          x2={not.ok.x}
          y2={not.ok.y}
          stroke={stroke}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {not.ok && <circle cx={not.ok.x} cy={not.ok.y} r={2 / zoom} fill={stroke} />}
      <rect
        x={x - pay}
        y={y - boy - pay}
        width={en + pay * 2}
        height={boy + pay * 2}
        fill="#fff"
        fillOpacity="0.92"
        stroke={stroke}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {satirlar.map((satir, i) => (
        <text
          key={i}
          x={x}
          y={y - boy + fs * (i + 0.95) * 1.3 - fs * 0.3}
          fontSize={fs}
          fontFamily="var(--font-sans)"
          fill={INK}
        >
          {satir}
        </text>
      ))}
    </g>
  );
}

function MeasureLabel({ a, b, zoom }: { a: Pt; b: Pt; zoom: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const fs = 10 / zoom;
  const text = `${fmtCm(dist(a, b))} cm`;
  const w = (text.length * 6.2) / zoom;
  return (
    <g>
      <rect x={mx - w / 2 - 4 / zoom} y={my - fs - 6 / zoom} width={w + 8 / zoom} height={fs + 6 / zoom} fill="#fff" stroke={SELECT} strokeWidth={1 / zoom} />
      <text x={mx} y={my - 4 / zoom} textAnchor="middle" fontSize={fs} fontFamily="var(--font-sans)" fill={INK} style={{ letterSpacing: 0.5 / zoom }}>
        {text}
      </text>
    </g>
  );
}

/**
 * Ölçüm işareti — çizgi, uç çentikleri, cm etiketi ve SIRA NUMARASI.
 *
 * Numara POM tablosunun çizime bağlandığı yer. Onsuz tabloda "Göğüs
 * genişliği 36,0 cm" yazıyor ama atölye o ölçünün çizimde nereden
 * alındığını bilmiyor — tech pack'i tech pack yapan bağ tam olarak bu.
 * Numara `a` ucunda duruyor, cm etiketi ortada: ikisi aynı yere konsa
 * kısa ölçülerde üst üste binerdi.
 */
function MeasureMark({
  a,
  b,
  no,
  zoom,
  selected,
  onSelect,
}: {
  a: Pt;
  b: Pt;
  no: number;
  zoom: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (5 / zoom), ny = (dx / len) * (5 / zoom);
  const stroke = selected ? SELECT : INK;
  const r = 6.5 / zoom;
  /* Numara çizginin dışına, `a` ucundan geriye doğru kaydırılıyor;
     üstüne binerse ölçü çizgisinin ucu okunmaz oluyor. */
  const ux = dx / len, uy = dy / len;
  const cx = a.x - ux * (r * 1.6), cy = a.y - uy * (r * 1.6);
  return (
    <g onPointerDown={(e) => { e.stopPropagation(); onSelect(); }} style={{ cursor: "pointer" }}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1={a.x - nx} y1={a.y - ny} x2={a.x + nx} y2={a.y + ny} stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1={b.x - nx} y1={b.y - ny} x2={b.x + nx} y2={b.y + ny} stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <text
        x={cx}
        y={cy + r * 0.36}
        textAnchor="middle"
        fontSize={r * 1.1}
        fontFamily="var(--font-sans)"
        fill={stroke}
      >
        {no}
      </text>
      <MeasureLabel a={a} b={b} zoom={zoom} />
    </g>
  );
}
