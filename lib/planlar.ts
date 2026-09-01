/**
 * Abonelik planları — tek kaynak.
 *
 * Neden ayrı dosya: `lib/data.ts` içinde zaten `plans` var ama o AKADEMİ
 * kurs paketleri (Tek Ders / Tam Program / Program + Mentorluk). İki farklı
 * "plan" kavramı aynı isimle aynı dosyada dursaydı yanlış olanı içeri
 * aktarmak an meselesiydi.
 *
 * Neden tek kaynak: bu sayılar hem ana sayfanın fiyat bölümünde hem
 * /fiyatlandirma sayfasında görünüyor. Daha önce iki ayrı dizi olarak
 * yazılmışlardı; birini güncelleyip diğerini unutmak sitenin kendi
 * fiyatıyla çelişmesi demekti.
 */

export type AbonelikPlani = {
  ad: string;
  /** Yalnız /fiyatlandirma kartlarında görünüyor; ana sayfa kullanmıyor. */
  ozet: string;
  aylik: string;
  kredi: number;
  krediBasi: string;
  kare: string;
  oneCikan?: boolean;
  /**
   * Sayfa `lang="tr"` ve plan adı `eyebrow` ile uppercase basılıyor. Türkçe
   * kuralda "i" → "İ" olduğu için "Enterprise" tarayıcıda "ENTERPRİSE"
   * çıkıyor. Alan KOŞULLU: yalnız bu tuzağa düşen ad işaretleniyor —
   * "Normal" ve "Pro"ya da vermek Türkçe ekran okuyucusunu boşuna üç kez
   * dil değiştirmeye zorlardı.
   */
  dil?: "en";
};

export const abonelikPlanlari: AbonelikPlani[] = [
  {
    ad: "Normal",
    ozet: "Tek kişilik operasyon ve ilk koleksiyon denemeleri için.",
    aylik: "₺699",
    kredi: 70,
    krediBasi: "₺9,99",
    kare: "₺19,98",
  },
  {
    ad: "Pro",
    ozet: "Düzenli çeken, haftalık ürün yayınlayan markalar için.",
    aylik: "₺2.199",
    kredi: 260,
    krediBasi: "₺8,46",
    kare: "₺16,92",
    oneCikan: true,
  },
  {
    ad: "Enterprise",
    ozet: "Ajans, pazaryeri operasyonu ve çok markalı katalog için.",
    aylik: "₺5.999",
    kredi: 850,
    krediBasi: "₺7,06",
    kare: "₺14,12",
    dil: "en",
  },
];
