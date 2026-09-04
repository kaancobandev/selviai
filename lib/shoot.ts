import { CEKIM_EKSENLERI, CROPS, LIGHTINGS, type Crop, type Lighting } from "@/lib/ai/types";
import type { StudyoTohum } from "@/lib/ai/tohum";

/* ------------------------------------------------------------------
   Shooting — çekim listesi verisi

   PRODÜKSİYON MASASI DEĞİL, ÇEKİM LİSTESİ. Ekip, lokasyon, call sheet,
   gün ışığı şeridi ve prop listesi daha önce silinmişti; gerekçe ürünün
   kendisiydi: Selvi tam da o insanlara ve o efora ihtiyaç kalmasın diye
   var, kendi ekranımızda rol listesi tutmak bunun tersini söylüyordu.

   BU TURDA GERİYE KALAN DA GİTTİ. Mood seçici + tearsheet ızgarası +
   look–model tahtası el ele bir araç değildi: ilk ikisi moodboard
   stüdyosuyla belirgin biçimde örtüşüyordu, üçüncüsü ise akışın artık
   üretmediği bir şeyi (look listesi) örnek verilerle taklit ediyordu.

   Araç bugün TEK BİR ŞEY yapıyor: kullanıcının tasarladığı giysiden
   üretilecek karelerin listesi. Her satır bir kadraj ve bir ışık
   senaryosu. Çekim organize edilmiyor, ÜRETİLİYOR.

   SÖZLÜK MOTORUN SÖZLÜĞÜ. Kadrajlar `CROPS`, ışıklar `LIGHTINGS` —
   ikisi de lib/ai/types.ts'ten geliyor ve isteğe olduğu gibi gidiyor.
   Eski `moods` dizisi kendi kimliklerini taşıyordu (daylight/golden/
   night/studio); ikinci bir sözlük tutmak satırı isteğe çevirirken bir
   eşleme tablosu gerektirir, o tablo da sessizce eskir — bu ekranda
   tam olarak öyle olmuştu (bkz. tearsheet etiketleri). Metinler
   `Record<Crop|Lighting, …>` olarak yazılıyor: motora yeni bir değer
   eklendiğinde burası DERLENMİYOR, sessizce eksik kalmıyor.
   ------------------------------------------------------------------ */

/** Tohum yokken başlıkta duran örnek iş adı — araç tek başına da anlaşılır olmalı. */
export const ORNEK_BASLIK = "SS26 Kampanya";

/**
 * Listedeki en çok satır. Tavanı sunucu koyuyor: kareler kovaya yuva
 * adıyla yazılıyor ve yuva sayısı `CEKIM_EKSENLERI` kadar. Sayıyı
 * elle yazmak iki yerde tutarlılık demekti.
 */
export const EN_COK_CEKIM = CEKIM_EKSENLERI.length;

/* ---------------- kadrajlar ---------------- */

/**
 * Kadraj metinleri GİYSİYE göre yazıldı, kişiye göre değil: kaynak kare
 * düz zeminde tek bir parça gösteriyor (bkz. TURETILMIS_TURLER, siluet).
 * Kompozisyon stüdyosundaki "Ürün detayı" gibi adlar oraya ait — orada
 * karede bir model var, burada yok.
 */
const KADRAJ_METNI: Record<Crop, { ad: string; not: string }> = {
  portre: { ad: "Portre", not: "Omuz ve yaka hizası; üst gövde." },
  yarim: { ad: "Yarım boy", not: "Bel üstü; kesim ve dikiş okunur." },
  tam: { ad: "Tam boy", not: "Giysinin tamamı; düşüm görünür." },
  detay: { ad: "Detay", not: "Tek bölge — yaka, manşet, dikiş." },
};

export const KADRAJLAR = CROPS.map((id) => ({ id, ...KADRAJ_METNI[id] }));

/* ---------------- ışık senaryoları ---------------- */

/**
 * ÜÇÜ ESKİ MOOD'LARIN AYNISI: stüdyo, altın saat ve gece hem anlamca
 * hem kelvin olarak birebir karşılık buluyordu, metinleri olduğu gibi
 * taşındı. Altın saatin "son 40 dakika için iki look" cümlesi düştü —
 * look programı çekim günü lojistiğiydi ve o liste artık yok.
 *
 * DÖRDÜNCÜSÜ GERİ GELDİ ama BAŞKA BİR KAPIDAN. Eski "Gündüz · Doğal ışık"
 * (5600 K kuzey penceresi) `LIGHTINGS` içinde doğrudan karşılık bulmuyor;
 * kalan tek değer `sahne` ve motorun genel sözlüğünde anlamı "referansın
 * ışığını aynen devral" (bkz. LIGHTING_TEXT, lib/ai/prompt.ts).
 *
 * BU ARAÇTA O ANLAM GEÇERSİZ ve `buildCekimPrompt` bunu zaten biliyor:
 * `sahne` geldiğinde LIGHTING_TEXT'i kullanmıyor, `CEKIM_ISIK_YEDEK` ile
 * doğal gün ışığına düşüyor. Sebebi sağlam — kaynak, giysinin DÜZ ZEMİNDE
 * ve yassı ışıkta çekilmiş karesi; o ışığı bir sokak sahnesine taşımak
 * editoryal kare değil ürün fotoğrafı verir.
 *
 * İLK YAZIMDA BURASI "Kaynağın ışığı · Değişmez · giysi karesinin kendi
 * ışığı korunur" diyordu ve YANLIŞTI: motor tam tersini yapıyor. Etiket
 * motorun gerçekte ürettiği şeyi söylemeli, yoksa kullanıcı seçtiği şeyi
 * alamadığını ancak kareye bakınca anlar. Adı gün ışığı olunca eski
 * dördüncü senaryo da kendiliğinden geri gelmiş oluyor.
 *
 * `window` alanı (09:00 – 15:30) silindi: saat aralığı lokasyonda çekim
 * yapan bir ekibin bilgisiydi, üretilen karenin değil.
 */
const ISIK_METNI: Record<Lighting, { ad: string; kelvin: string; not: string }> = {
  sahne: {
    ad: "Gündüz",
    kelvin: "5600 K",
    not: "Yumuşak yönlü gün ışığı, nötr sıcaklık, yönü belli hafif gölge.",
  },
  studyo: {
    ad: "Stüdyo",
    kelvin: "5600 K",
    not: "Çift softbox, nötr gri zemin, yumuşak gölge. Işık değişmez.",
  },
  altin: {
    ad: "Altın saat",
    kelvin: "3400 K",
    not: "Düşük güneş, sırt ışığı; kontrollü flare.",
  },
  gece: {
    ad: "Gece",
    kelvin: "2800 K",
    not: "Tek flaş + ışık kılıcı, sokak lambası karışımı.",
  },
};

export const ISIKLAR = LIGHTINGS.map((id) => ({ id, ...ISIK_METNI[id] }));

/* ---------------- çekim satırı ---------------- */

export type Cekim = {
  id: string;
  kadraj: Crop;
  isik: Lighting;
  /** Üretilen karenin adresi — `url ?? dataUrl`, ikisi de olabilir. */
  sonuc?: string;
  /** İş bitti ama bu satıra kare gelmedi; satır sessizce boş kalmasın. */
  basarisiz?: boolean;
};

/**
 * Açılış listesi — BOŞ DEĞİL, ÜÇ SATIR.
 *
 * Boş liste "ne yapacağım?" sorusu doğuruyor (kolaj tuvalindeki aynı
 * gerekçe). Üçte durmasının sebebi maliyet: her satır bir üretim demek,
 * açılışta altı satır göstermek düğmeye basan kullanıcıya sormadan altı
 * kare harcamak olurdu.
 *
 * Sıra bir çekimin doğal sırası: önce giysinin tamamı, sonra kesim,
 * sonra tek bir ayrıntı.
 */
export function varsayilanCekimler(): Cekim[] {
  return [
    { id: "c1", kadraj: "tam", isik: "sahne" },
    { id: "c2", kadraj: "yarim", isik: "studyo" },
    { id: "c3", kadraj: "detay", isik: "altin" },
  ];
}

/* Eklenen satırların kimliği açılış satırlarıyla ÇAKIŞMAMALI: kimlik
   hem React anahtarı hem de iş dönünce satırı bulan adres. Sayaç sunucu
   tarafında da artabilir ama satır eklemek yalnız tarayıcıda oluyor. */
let ekSayac = 0;

export function yeniCekim(): Cekim {
  ekSayac += 1;
  return { id: `ek${ekSayac}`, kadraj: "tam", isik: "studyo" };
}

/* ---------------- kaynak kare ---------------- */

/**
 * Kare etiketlerinin okunur adları. Eksen adları (doga, kumas…) iç
 * sözlük; kullanıcıya "doga" yazmak sızıntıdır.
 */
const KARE_ADI: Record<string, string> = {
  doga: "Doğa",
  sanat: "Sanat",
  doku: "Doku",
  mekan: "Mekân",
  moodboard: "Moodboard",
  kumas: "Kumaş",
  branding: "Marka",
  siluet: "Siluet",
};

/**
 * Çekilebilecek bir kare. `isId`/`sira` taşınıyor, kovadaki yol DEĞİL:
 * uç "hangi işin kaçıncı karesi" diyeni çözüp sahipliği kendisi
 * doğruluyor (bkz. app/api/kesim/route.ts'teki aynı gerekçe).
 */
export type KaynakKare = {
  isId: string;
  sira: number;
  url: string;
  ad: string;
  /** Akıştaki tek giysi karesi mi — liste varsayılan olarak onu çekiyor. */
  siluet: boolean;
};

export function kaynakKareler(tohum: StudyoTohum | null | undefined): KaynakKare[] {
  if (!tohum) return [];
  return tohum.kareler.map((k) => ({
    isId: k.isId,
    sira: k.sira,
    url: k.url,
    ad: KARE_ADI[k.etiket] ?? k.etiket,
    siluet: k.etiket === "siluet",
  }));
}

/**
 * Varsayılan kaynak SİLUET: türetilmiş dört çıktı içinde giysinin
 * kendisini gösteren tek kare o. Moodboard, kumaş ve marka kareleri
 * düz yatık çıktılar; onlardan "yarım boy, stüdyo ışığı" istemek
 * anlamsız olurdu.
 *
 * Siluet yoksa (türetme işi bitmemiş ya da o kare düşmüş olabilir)
 * kullanıcının seçtiği ilham karesine, o da yoksa ilk kareye düşülüyor —
 * araç kaynaksız kalmasın.
 */
export function varsayilanKaynak(kareler: KaynakKare[], secilen?: string): KaynakKare | null {
  return (
    kareler.find((k) => k.siluet) ??
    kareler.find((k) => k.url === secilen) ??
    kareler[0] ??
    null
  );
}
