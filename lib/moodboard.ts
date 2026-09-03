import type { StudyoTohum } from "@/lib/ai/tohum";

/* ------------------------------------------------------------------
   MOODBOARD — veri modeli.

   İLHAM PANOSUNDAN FARKI NE. Pano bir TOPLAMA alanı: dağınık, serbest
   konumlu, çok referanslı, kişisel. Moodboard ise bir İLETİŞİM
   ARTEFAKTI: ekibe ya da müşteriye gösterilen, kürasyonu yapılmış,
   sabit tuvalli, paleti adlandırılmış tek sayfa.

   Bu yüzden model serbest konum taşımıyor. Konum yok, IZGARA var:
   moodboard'ın işi düzen kurmak, düzen bozmak değil. Serbest
   yerleştirme isteyen zaten panoda çalışıyor.

   Tuval oranı lookbook ile aynı (A4 yatay) ve dışa aktarma da aynı
   yazdırma altyapısını kullanıyor — ikinci bir çıktı yolu açmıyoruz.
   ------------------------------------------------------------------ */

export const MOODBOARD_ORANI = 297 / 210;

/** Izgara kalıpları — her biri kaç görsel taşıdığını kendisi söylüyor. */
export const KALIPLAR = ["dortlu", "uclu", "ikili-genis"] as const;
export type Kalip = (typeof KALIPLAR)[number];

export const KALIP_ADI: Record<Kalip, string> = {
  dortlu: "Dörtlü ızgara",
  uclu: "Bir büyük, iki küçük",
  "ikili-genis": "İkili geniş",
};

export const KALIP_GORSEL: Record<Kalip, number> = {
  dortlu: 4,
  uclu: 3,
  "ikili-genis": 2,
};

export type Moodboard = {
  baslik: string;
  /** Yön cümlesi — moodboard'ı "resim yığını"ndan ayıran şey bu. */
  yon: string;
  kalip: Kalip;
  gorseller: string[];
  /** Görsellerden çıkarılan palet; kullanıcı düzenleyebiliyor. */
  palet: string[];
  kunye: string;
};

export const ornekMoodboard: Moodboard = {
  baslik: "Yön",
  yon: "Koleksiyonun tavrını tek cümlede anlatın.",
  kalip: "dortlu",
  gorseller: [],
  palet: [],
  kunye: "Selvi AI",
};

/**
 * Akıştan moodboard kurar.
 *
 * Görsel sırası: SEÇİLEN kare önce — moodboard o yönü anlatıyor, onun
 * dışındakiler destek. Ardından kalan ilham kareleri, sonra üretilmiş
 * moodboard karesi (varsa) bir referans olarak.
 *
 * Palet BURADA doldurulmuyor: çıkarım tarayıcıda, canvas ile yapılıyor
 * ve bu dosya sunucuda da import ediliyor. Bileşen yüklenince asenkron
 * dolduruyor.
 */
export function tohumdanMoodboard(tohum: StudyoTohum): Moodboard {
  const sirali = [
    tohum.secilen,
    ...tohum.ilham.filter((s) => s !== tohum.secilen),
    ...(tohum.turetilmis.moodboard ? [tohum.turetilmis.moodboard] : []),
  ];
  return {
    baslik: "Yön",
    yon: tohum.brief,
    kalip: "dortlu",
    gorseller: sirali.slice(0, KALIP_GORSEL.dortlu),
    palet: [],
    kunye: "Selvi AI",
  };
}
