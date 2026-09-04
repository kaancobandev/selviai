import type { StudyoTohum } from "@/lib/ai/tohum";

/* ------------------------------------------------------------------
   LOOKBOOK — veri modeli.

   Diğer stüdyo araçlarından farkı: bu bir çalışma alanı değil, TESLİM
   EDİLEN ŞEY. Tasarımcının alıcıya ya da basına gönderdiği dosya. Bu
   yüzden model "tuval + öğeler" değil, SAYFA DİZİSİ.

   Sayfa oranı A4 yatay (297×210mm ≈ 1,414). Dışa aktarma yazdırma
   üzerinden yapıldığı için ekrandaki oranın kâğıtla birebir aynı olması
   şart: kullanıcı ekranda ne diziyorsa PDF'te onu görmeli.
   ------------------------------------------------------------------ */

export const SAYFA_ORANI = 297 / 210;

/**
 * Dört düzen yetiyor ve fazlası zarar: lookbook'un işi kombin göstermek,
 * sayfa tasarımı yarışması değil. Her düzenin net bir görevi var.
 */
export const DUZENLER = ["kapak", "tam", "ikili", "metin"] as const;
export type SayfaDuzen = (typeof DUZENLER)[number];

export const DUZEN_ADI: Record<SayfaDuzen, string> = {
  kapak: "Kapak",
  tam: "Tam sayfa",
  ikili: "İkili",
  metin: "Metin",
};

/** Düzenin kaç görsel taşıdığı — ekleme ve kırpma bunu okuyor. */
export const DUZEN_GORSEL: Record<SayfaDuzen, number> = {
  kapak: 1,
  tam: 1,
  ikili: 2,
  metin: 0,
};

export type Sayfa = {
  id: string;
  duzen: SayfaDuzen;
  /** Görsel adresleri; uzunluğu DUZEN_GORSEL ile sınırlı. */
  gorseller: string[];
  baslik?: string;
  altyazi?: string;
};

export type Lookbook = {
  baslik: string;
  altBaslik: string;
  kunye: string;
  sayfalar: Sayfa[];
};

/** Tohum yokken açılan örnek — araç tek başına da anlaşılır olmalı. */
export const ornekLookbook: Lookbook = {
  baslik: "Koleksiyon",
  altBaslik: "SS26",
  kunye: "Selvi AI",
  sayfalar: [
    { id: "s1", duzen: "kapak", gorseller: [], baslik: "Koleksiyon", altyazi: "SS26" },
    { id: "s2", duzen: "metin", gorseller: [], baslik: "Sunuş", altyazi: "Koleksiyonun çıkış noktası." },
  ],
};

/**
 * Akıştan lookbook kurar.
 *
 * SIRA TASARIM KARARI, rastgele değil. Kapakta SEÇİLEN kare var — kullanıcı
 * dört yorumdan onu seçti, kitabın yüzü o olmalı. Ardından bir sunuş
 * sayfasında kendi yazdığı brief duruyor; alıcı önce niyeti okuyor.
 * Sonra kalan üç ilham karesi (seçilen tekrar edilmiyor), en sonda
 * türetilmiş çıktılar: moodboard, kumaş, marka, giysi silueti. Yani kitap
 * "fikir → varyasyon → malzeme ve kimlik → giysi" diye ilerliyor.
 */
export function tohumdanLookbook(tohum: StudyoTohum): Lookbook {
  const baslik = ilkCumle(tohum.brief) || "Koleksiyon";
  const sayfalar: Sayfa[] = [
    {
      id: "kapak",
      duzen: "kapak",
      gorseller: [tohum.secilen],
      baslik,
      altyazi: "",
    },
    {
      id: "sunus",
      duzen: "metin",
      gorseller: [],
      baslik: "Sunuş",
      altyazi: tohum.brief,
    },
  ];

  /* Seçilen kare kapakta zaten var; burada tekrar etmiyor. */
  const digerleri = tohum.ilham.filter((src) => src !== tohum.secilen);
  for (let i = 0; i < digerleri.length; i += 2) {
    const ikili = digerleri.slice(i, i + 2);
    sayfalar.push({
      id: `ilham-${i}`,
      duzen: ikili.length === 2 ? "ikili" : "tam",
      gorseller: ikili,
      altyazi: "",
    });
  }

  /* Sıra TURETILMIS_TURLER ile aynı; siluet sonda çünkü kitabın kapanış
     sayfası giysinin kendisi olsun — ondan öncekiler ona giden yol. */
  const turetilmisSira: [keyof StudyoTohum["turetilmis"], string][] = [
    ["moodboard", "Moodboard"],
    ["kumas", "Kumaş"],
    ["branding", "Marka"],
    ["siluet", "Giysi siluet"],
  ];
  for (const [anahtar, etiket] of turetilmisSira) {
    const src = tohum.turetilmis[anahtar];
    if (!src) continue;
    sayfalar.push({
      id: `turet-${anahtar}`,
      duzen: "tam",
      gorseller: [src],
      altyazi: etiket,
    });
  }

  return { baslik, altBaslik: "", kunye: "Selvi AI", sayfalar };
}

/**
 * Brief'in ilk cümlesi başlık olarak kullanılıyor. Tamamı çok uzun ve
 * kapakta okunmuyor; ilk cümle genelde asıl fikri taşıyor.
 */
function ilkCumle(metin: string): string {
  const t = metin.trim();
  if (!t) return "";
  const kesme = t.search(/[.—·,;]/);
  const parca = kesme > 8 ? t.slice(0, kesme) : t;
  return parca.length > 64 ? parca.slice(0, 64).trimEnd() + "…" : parca;
}
