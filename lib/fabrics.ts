import type { StudyoTohum } from "@/lib/ai/tohum";

const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Dokuma türleri tek yerde: arayüz de bu listeden seçtiriyor. */
export const DOKUMALAR = ["Düz dokuma", "Dimi", "Saten", "Örme", "Krep"] as const;
export type Weave = (typeof DOKUMALAR)[number];

/* ------------------------------------------------------------------
   KUMAŞ — veri modeli.

   NEDEN ÖLÇÜLEBİLİR ALANLAR NULL OLABİLİYOR. Kütüphaneye artık ana
   sayfada ÜRETİLMİŞ kumaş karesi de giriyor (`tohumdanKumas`) ve o
   karenin ölçülebilir hiçbir alanı bilinmiyor:

   - Kare tek bir kumaş DEĞİL. `lib/ai/prompt.ts` üretim isteminde
     "dört ilâ altı, her biri farklı ağırlık ya da dokuda parça"
     istiyor; ona tek bir kompozisyon/gramaj/döküm yazmak veri
     UYDURMAK olurdu.
   - Modele de sorulamıyor: `lib/ai/metin.ts` yalnız METİN çalışıyor,
     ona görsel gösterilemiyor.

   Bu yüzden null "sıfır" değil, "ÖLÇÜLMEDİ" demek. Arayüz alanı böyle
   yazıyor ve değeri kullanıcı giriyor. Kataloğun dokuz kaydı gerçek
   değerlerini koruyor; onlarda hiçbir alan null'a düşmüyor.

   UYUMLULUK — `components/flat-sketch.tsx`. Orası `f.name`, `f.image`,
   `f.id` ve `f.composition` okuyor. `name` ve `image` zaten null'a
   düşmüyor; `composition` yalnız `` `${f.name} · ${f.composition}` ``
   şablonunda geçiyor ve TypeScript şablon dizisinde null'ı kabul
   ediyor — yani o dosyaya dokunmadan derleniyor. Çalışma zamanında da
   sorun yok: flat-sketch yalnız `fabrics` dizisini geziyor, üretilen
   kayıt o diziye HİÇ girmiyor (kütüphaneye kumaş bileşeninin içinde
   ekleniyor). Alternatif "composition'ı string tutup 'Ölçülmedi'
   yazmak"tı; seçmedik, çünkü o zaman "ölçüldü mü" sorusunun cevabı bir
   METİN KARŞILAŞTIRMASINA dönerdi.
   ------------------------------------------------------------------ */

export type Fabric = {
  id: string;
  name: string;
  composition: string | null;
  color: string | null;
  weave: Weave | null;
  /** g/m² */
  weight: number | null;
  /** % esneme */
  stretch: number | null;
  /** 0 sert — 100 akışkan */
  drape: number | null;
  /** kumaş eni, cm */
  width: number | null;
  /** ₺ / metre */
  price: number | null;
  /** desen tekrarı, cm — düz kumaşta null; üretilen kayıtta "ölçülmedi" */
  repeat: number | null;
  image: string;
  /** Ana sayfadaki akıştan gelen kare mi — ölçülmemiş kaydı işaretler. */
  uretilen?: boolean;
};

export const fabrics: Fabric[] = [
  {
    id: "ipek-krep",
    name: "İpek Krep",
    composition: "%100 Dut İpeği",
    color: "Fildişi",
    weave: "Krep",
    weight: 60,
    stretch: 2,
    drape: 92,
    width: 114,
    price: 1480,
    repeat: null,
    image: u("1619043518800-7f14be467dca"),
  },
  {
    id: "organik-keten",
    name: "Organik Keten",
    composition: "%100 Organik Keten",
    color: "Ham",
    weave: "Düz dokuma",
    weight: 160,
    stretch: 3,
    drape: 55,
    width: 140,
    price: 620,
    repeat: null,
    image: u("1686806374120-e7ae3f19801d"),
  },
  {
    id: "gabardin",
    name: "Gabardin",
    composition: "%97 Pamuk · %3 Elastan",
    color: "Karamel",
    weave: "Dimi",
    weight: 240,
    stretch: 12,
    drape: 35,
    width: 150,
    price: 410,
    repeat: null,
    image: u("1705493253566-1522b9015c58"),
  },
  {
    id: "denim",
    name: "Denim",
    composition: "%100 Pamuk · 12 oz",
    color: "İndigo",
    weave: "Dimi",
    weight: 407,
    stretch: 1,
    drape: 20,
    width: 150,
    price: 390,
    repeat: null,
    image: u("1631112230741-446762ee05ac"),
  },
  {
    id: "poplin",
    name: "Poplin",
    composition: "%100 Uzun Elyaf Pamuk",
    color: "Beyaz",
    weave: "Düz dokuma",
    weight: 110,
    stretch: 0,
    drape: 40,
    width: 150,
    price: 280,
    repeat: null,
    image: u("1604147706283-d7119b5b822c"),
  },
  {
    id: "yun-flanel",
    name: "Yün Flanel",
    composition: "%90 Yün · %10 Kaşmir",
    color: "Antrasit",
    weave: "Dimi",
    weight: 320,
    stretch: 4,
    drape: 48,
    width: 150,
    price: 1150,
    repeat: null,
    image: u("1699245111017-658557db0abb"),
  },
  {
    id: "pied-de-poule",
    name: "Pied-de-poule Yün",
    composition: "%100 Yün",
    color: "Kahve · Bej",
    weave: "Dimi",
    weight: 280,
    stretch: 3,
    drape: 42,
    width: 150,
    price: 980,
    repeat: 4,
    image: u("1705493254703-0eb2b654d538"),
  },
  {
    id: "viskon-saten",
    name: "Viskon Saten",
    composition: "%100 Viskon",
    color: "Pudra",
    weave: "Saten",
    weight: 130,
    stretch: 2,
    drape: 85,
    width: 140,
    price: 340,
    repeat: null,
    image: u("1617055407123-3d7130c1f940"),
  },
  {
    id: "triko-kasmir",
    name: "Triko Kaşmir",
    composition: "%100 Kaşmir",
    color: "Kum",
    weave: "Örme",
    weight: 210,
    stretch: 30,
    drape: 70,
    width: 160,
    price: 2600,
    repeat: null,
    image: u("1643313260651-9c335822ecde"),
  },
];

/**
 * Akıştan kumaş kaydı kurar — `tohumdanMoodboard` / `tohumdanLookbook`
 * ile aynı kalıp: tohum adresi taşıyor, araç onu kendi modeline
 * çeviriyor.
 *
 * FARKI: burada ölçülebilir HİÇBİR alan doldurulmuyor (yukarıdaki nota
 * bakın). Doldurulan üç şey var — kimlik, ad ve görsel. Kaydın kataloğa
 * girmesinin sebebi de zaten bu: değeri veri olarak değil, SEÇİLEBİLİR
 * kayıt olarak taşımak. Referans şeridindeki 80×96 küçük resim ne
 * seçilebiliyordu ne de üstüne ölçüm yazılabiliyordu.
 *
 * Kimlik sabit "uretilen": çalışma başına tek üretilmiş kumaş karesi
 * var; ikincisi üretilse tohum onu zaten `turetilmis.kumas`'ın üstüne
 * yazıyor.
 */
export function tohumdanKumas(tohum: StudyoTohum): Fabric | null {
  const kare = tohum.turetilmis.kumas;
  if (!kare) return null;
  return {
    id: "uretilen",
    name: "Üretilen kumaş çalışması",
    composition: null,
    color: null,
    weave: null,
    weight: null,
    stretch: null,
    drape: null,
    width: null,
    price: null,
    repeat: null,
    image: kare,
    uretilen: true,
  };
}
