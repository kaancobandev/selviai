import type { StudyoTohum } from "@/lib/ai/tohum";

/* ------------------------------------------------------------------
   KOLAJ — veri modeli ve kesim anahtarı.

   ÜÇ AKRABA ARAÇ, ÜÇ AYRI İŞ. Karıştırılmamaları için:

   · İlham panosu → TOPLAMA. Serbest, dağınık, kişisel; henüz karar yok.
   · Moodboard    → İLETİŞİM. Sabit ızgara, kürasyon, adlandırılmış palet.
   · Kolaj        → DENEME. Parçalar kesilip üst üste bindirilerek yeni
                    bir siluet aranıyor. Bütün kareler değil, PARÇALAR.

   Kolajı ötekilerden ayıran teknik şey kesim: görsel dikdörtgen olmaktan
   çıkıp kendi siluetine iniyor, böylece iki parça gerçekten üst üste
   binebiliyor. Dikdörtgen görsellerle yapılan şey kolaj değil, serbest
   konumlu moodboard olurdu — ki o zaten panoda var.

   TUVAL ORANI ötekilerle aynı (A4 yatay) ve baskı da aynı `.lookbook-*`
   altyapısını kullanıyor. Dikey tuval kolaja daha yakışırdı ama ikinci
   bir `@page` kuralı ve ikinci bir baskı ağacı demekti; üç aracın tek
   çıktı yolu olması bu farktan değerli.
   ------------------------------------------------------------------ */

export const KOLAJ_ORANI = 297 / 210;

/**
 * Tuvale yapıştırılmış tek parça.
 *
 * Konum ve ölçü TUVALE ORANLI (0-1) tutuluyor, piksel değil: ekranda
 * tuval genişliği görünüme göre değişiyor ve baskıda 297mm oluyor.
 * Piksel saklansaydı önizleme ile kâğıt birbirini tutmazdı.
 */
export type Parca = {
  id: string;
  /** Gösterilecek adres — kesilmişse blob, değilse `/api/kare/...`. */
  src: string;
  /** Merkez konumu, tuvale oranlı. */
  x: number;
  y: number;
  /** Genişlik, tuval genişliğine oranlı. */
  en: number;
  /** Derece. */
  aci: number;
  /** Kesilmiş parça mı, bütün kare mi. */
  kesik: boolean;
  /** Hangi kareden geldiği — yeniden kesim için. */
  kaynak?: { isId: string; sira: number };
};

export type Kolaj = {
  baslik: string;
  not: string;
  /** Tuval zemini; parçalar bunun üstünde duruyor. */
  zemin: string;
  parcalar: Parca[];
};

export const ZEMINLER = ["#f4f2ee", "#ffffff", "#1c1b19", "#c9c2b6", "#2f3a3f"] as const;

export const ornekKolaj: Kolaj = {
  baslik: "Kolaj",
  not: "Parçaları üst üste bindirerek siluet arayın.",
  zemin: ZEMINLER[0],
  parcalar: [],
};

/**
 * Akıştan kolaj kurar.
 *
 * Parçalar KESİLMEMİŞ başlıyor: kesim bir model çağrısı ve para demek,
 * kullanıcı hangi kareyi kullanacağına karar vermeden harcanmamalı.
 * Tuvale seçilen kare ortada, diğerleri çevresinde hafif dağınık
 * yerleştiriliyor — açılışta boş tuval "ne yapacağım?" sorusu doğuruyor,
 * dolu tuval ise doğrudan oynanacak bir şey veriyor.
 */
export function tohumdanKolaj(tohum: StudyoTohum): Kolaj {
  const secilenSira = tohum.kareler.findIndex((k) => k.url === tohum.secilen);
  const sirali = [
    ...tohum.kareler.filter((k) => k.url === tohum.secilen),
    ...tohum.kareler.filter((k) => k.url !== tohum.secilen),
  ].slice(0, 4);

  /* Sabit bir yelpaze: ilk parça ortada ve büyük, sonrakiler çevresinde
     küçülerek. Rastgele değil — her açılışta aynı düzen çıksın ki
     kullanıcı "bir şey bozuldu mu?" diye düşünmesin. */
  const yerler = [
    { x: 0.42, y: 0.52, en: 0.34, aci: -3 },
    { x: 0.68, y: 0.38, en: 0.24, aci: 5 },
    { x: 0.74, y: 0.68, en: 0.22, aci: -6 },
    { x: 0.2, y: 0.34, en: 0.2, aci: 4 },
  ];

  return {
    baslik: "Kolaj",
    not: tohum.brief,
    zemin: ZEMINLER[0],
    parcalar: sirali.map((k, i) => ({
      id: `p${secilenSira}-${i}-${k.sira}`,
      src: k.url,
      ...yerler[i],
      kesik: false,
      kaynak: { isId: k.isId, sira: k.sira },
    })),
  };
}

/* ------------------------------------------------------------------
   MACENTA ANAHTARI.

   Model şeffaf çıktı VEREMİYOR (ölçüldü: alfa kanalsız JPEG döndürüyor,
   "transparan PNG" istense bile). Klasik perde yöntemi kullanılıyor:
   model konuyu düz macentaya oturtuyor, saydamlığı burası açıyor.

   EŞİKLER ÖLÇÜMDEN GELİYOR, tahminden değil. Örnek kesimde karenin
   %48,1'i tam (255,0,255) — yani zeminin neredeyse tamamı — ve %0,7'si
   yakın-macenta saçak. Saçak, kenardaki yarı saydam piksel demek;
   sertçe kesilirse siluet testere dişi görünür, o yüzden rampayla
   yumuşatılıyor.

   TAM_SAYDAM neden 60: bu uzaklıkta yalnız macenta ve ona çok yakın
   saçak kalıyor. Parlak pembe bir kumaş (250,100,240) macentaya 101
   uzaklıkta; rampanın bittiği 100'ün dışında kalıyor, yani silinmiyor.
   Eşiği yükseltmek pembe kumaşları yemeye başlar.
   ------------------------------------------------------------------ */

const TAM_SAYDAM = 60;
const RAMPA = 40;

/** Macentaya öklit uzaklığı. Renk algısı değil, perde kararı — ağırlık gereksiz. */
function macentaUzakligi(r: number, g: number, b: number): number {
  const dr = r - 255;
  const db = b - 255;
  return Math.sqrt(dr * dr + g * g + db * db);
}

/**
 * Macenta zemini saydamlaştırır ve kenardaki pembe taşmayı bastırır.
 *
 * Tarayıcıda çalışıyor: canvas gerekiyor. Kareler kendi kaynağımızdan
 * geldiği için tuval kirlenmiyor, `toBlob` okunabiliyor.
 *
 * BLOB DÖNÜYOR, data URL DEĞİL. Kesilmiş bir kare birkaç megabaytlık
 * PNG; dört tanesini data URL olarak state'te taşımak sekmeyi şişirir.
 * Blob adresi sabit boyutta ve `URL.revokeObjectURL` ile bırakılabiliyor.
 */
export async function macentayiAc(src: string): Promise<string | null> {
  const gorsel = await gorseliYukle(src);
  if (!gorsel) return null;

  const tuval = document.createElement("canvas");
  tuval.width = gorsel.naturalWidth || gorsel.width;
  tuval.height = gorsel.naturalHeight || gorsel.height;
  const ctx = tuval.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(gorsel, 0, 0);
  let veri: ImageData;
  try {
    veri = ctx.getImageData(0, 0, tuval.width, tuval.height);
  } catch {
    /* Tuval kirlendiyse okunamaz. Kendi kaynağımızda olmaması gerekir
       ama sessizce çökmektense parçayı kesilmemiş bırakmak yeğ. */
    return null;
  }

  const p = veri.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i];
    const g = p[i + 1];
    const b = p[i + 2];
    const d = macentaUzakligi(r, g, b);

    if (d <= TAM_SAYDAM) {
      p[i + 3] = 0;
      continue;
    }
    if (d >= TAM_SAYDAM + RAMPA) continue; // tam donuk: konunun kendisi, dokunulmuyor

    p[i + 3] = Math.round(((d - TAM_SAYDAM) / RAMPA) * 255);

    /* TAŞMA BASTIRMA — YALNIZ RAMPA BANDINDA.
       Perde rengi kenar piksellere sızıyor ve konu pembe bir hâle
       kazanıyor; macenta kırmızı ile maviyi birlikte yükselttiği için
       fazlalık yeşile doğru çekiliyor.

       İLK YAZIMDA HER PİKSELE UYGULANIYORDU VE YANLIŞTI. Ölçüm
       gösterdi: fuşya bir elbise (214,37,132) → (146,37,64), kırmızı
       ruj (190,30,45) → (146,30,45), mor kadife (110,50,130) →
       (75,50,95). Yani perdeyle hiç ilgisi olmayan gerçek renkler
       çamura dönüyordu. Taşma zaten yalnız kenarda oluyor; tam donuk
       piksel konunun kendisidir ve rengine karışılmaz. */
    const ort = (r + b) / 2;
    if (ort > g + 12) {
      const fazla = (ort - g) * 0.5;
      p[i] = Math.max(g, r - fazla);
      p[i + 2] = Math.max(g, b - fazla);
    }
  }
  ctx.putImageData(veri, 0, 0);

  return new Promise((cozumle) => {
    tuval.toBlob((blob) => cozumle(blob ? URL.createObjectURL(blob) : null), "image/png");
  });
}

function gorseliYukle(src: string): Promise<HTMLImageElement | null> {
  return new Promise((cozumle) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => cozumle(img);
    img.onerror = () => cozumle(null);
    img.src = src;
  });
}
