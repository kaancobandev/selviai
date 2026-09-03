/* ------------------------------------------------------------------
   PALET ÇIKARIMI — görselden baskın renkler.

   Moodboard'ı ilham panosundan ayıran asıl yetenek bu. Bugün palet
   dört sabit listeden seçiliyor; oysa "bu tasarımın paleti" ancak
   kullanıcının kendi karelerinden örneklenerek çıkar.

   YÖNTEM ve neden bu yöntem:

   1. Görsel KÜÇÜK bir tuvale çiziliyor (96px kenar). Küçültme hem hızlı
      hem de doğal bir ortalama alıyor: tek piksellik parazit kendi
      başına bir renk olarak sayılmıyor.

   2. Renkler kaba bir ızgaraya yuvarlanıyor (kanal başına 16 kademe).
      Ham RGB'de sayım işe yaramaz — neredeyse her piksel benzersizdir.

   3. Sıklığa göre sıralanıp aralarında ASGARİ MESAFE aranıyor. Bu
      olmadan sonuç "aynı grinin beş tonu" çıkıyor: bir fotoğrafta en
      sık geçen beş kova hemen her zaman komşudur.

   4. Mesafe düz Öklit değil, kırmızı-ortalama (redmean) ağırlıklı. Göz
      yeşildeki farkı maviden çok daha iyi ayırıyor; düz mesafe koyu
      lacivert ile koyu bordoyu "uzak", iki yakın yeşili "yakın" sayıp
      yanlış eliyor.

   DOYGUNLUĞA BONUS VERİLMİYOR. Bu bilinçli: moda paletleri sıklıkla
   nötr (ekru, kum, antrasit) ve doygunu öne almak o paletleri bozardı.
   Bedeli şu: fotoğrafın büyük bir bölümü tek renkse palet o renge
   yaslanır — ki zaten doğru olan da bu.

   Tuval KİRLENMEZ: kareler kendi ucumuzdan (`/api/kare/...`) geliyor,
   yani aynı köken. Dış kaynaklı bir görsel verilirse getImageData
   güvenlik hatası atar; çağıran taraf yakalayıp boş dizi alır.
   ------------------------------------------------------------------ */

const ORNEK_KENAR = 96;
/** Kanal başına kademe. 16 → 4096 kova; daha azı renkleri birleştiriyor. */
const KADEME = 16;
/**
 * İki palet rengi arasındaki asgari algısal mesafe.
 *
 * DEĞER ÖLÇÜLDÜ, seçilmedi. İlk yazımda 42'ydi ve gerçek karelerde tam
 * da engellemesi gereken şeyi üretti: "aynı grinin beş tonu"
 * (#bbb5a8 · #9b9588 · #aaa498 · #8b8476 · #7b7568).
 *
 * Sebebi hesaplanabilir: nötr bir renkte üç kanal da aynı Δ kadar
 * değişir, redmean mesafesi ≈ 3Δ olur. Yani 42 eşiği yalnızca ~14
 * kademelik bir açıklık farkı demekti — moda paletleri ağırlıkla nötr
 * olduğu için bu tam olarak en kötü durum.
 *
 * Üretilen karelerle 42/70/90/110/140 tarandı. 110'da palet açık, orta,
 * koyu ve bir vurgu taşıyor (#bbb5a8 · #968b79 · #050a04 · #383528 ·
 * #6b6556); 140'ta renk sayısı dörde düşüyor.
 *
 * Yan etkisi kabul edildi: gerçekten tek renkli bir görsel artık 5
 * değil 2-3 renk döndürüyor. Doğru olan da bu — palet, görselde olmayan
 * çeşitliliği uydurmamalı.
 */
const ASGARI_MESAFE = 110;

/** Kırmızı-ortalama ağırlıklı renk mesafesi. */
function mesafe(a: number[], b: number[]): number {
  const rOrt = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(
    (2 + rOrt / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rOrt) / 256) * db * db,
  );
}

const hex = (c: number[]) =>
  "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** Tek bir görselden en baskın renkleri çıkarır. Hata durumunda boş dizi. */
export async function paletCikar(src: string, adet = 5): Promise<string[]> {
  const img = await gorseliYukle(src);
  if (!img) return [];

  const tuval = document.createElement("canvas");
  const oran = Math.min(ORNEK_KENAR / img.width, ORNEK_KENAR / img.height, 1);
  tuval.width = Math.max(1, Math.round(img.width * oran));
  tuval.height = Math.max(1, Math.round(img.height * oran));
  const ctx = tuval.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, tuval.width, tuval.height);

  let veri: Uint8ClampedArray;
  try {
    veri = ctx.getImageData(0, 0, tuval.width, tuval.height).data;
  } catch {
    /* Tuval kirlendi — dış kaynaklı görsel. Sessizce boş dönüyoruz;
       çağıran taraf paleti gizliyor. */
    return [];
  }

  const kovalar = new Map<number, { toplam: number[]; sayi: number }>();
  const adim = Math.ceil(256 / KADEME);
  for (let i = 0; i < veri.length; i += 4) {
    if (veri[i + 3] < 200) continue; // saydam pikseller renk taşımıyor
    const r = veri[i], g = veri[i + 1], b = veri[i + 2];
    const anahtar =
      Math.floor(r / adim) * KADEME * KADEME + Math.floor(g / adim) * KADEME + Math.floor(b / adim);
    const kova = kovalar.get(anahtar);
    if (kova) {
      kova.toplam[0] += r; kova.toplam[1] += g; kova.toplam[2] += b;
      kova.sayi++;
    } else {
      kovalar.set(anahtar, { toplam: [r, g, b], sayi: 1 });
    }
  }

  /* Kovanın ORTALAMASI alınıyor, merkezi değil: yuvarlama rengi kovanın
     köşesine iterdi ve palet gerçekte olmayan tonlar gösterirdi. */
  const adaylar = [...kovalar.values()]
    .map((k) => ({ renk: k.toplam.map((t) => t / k.sayi), sayi: k.sayi }))
    .sort((a, b) => b.sayi - a.sayi);

  const secilen: number[][] = [];
  for (const aday of adaylar) {
    if (secilen.length >= adet) break;
    if (secilen.every((s) => mesafe(s, aday.renk) >= ASGARI_MESAFE)) secilen.push(aday.renk);
  }
  return secilen.map(hex);
}

/**
 * Birden çok görselden ORTAK palet. Her görselden ayrı ayrı çıkarıp
 * birleştirmek, tek bir dev örneklemden çıkarmaktan daha iyi sonuç
 * veriyor: aksi hâlde en büyük görsel paleti tek başına belirliyor.
 */
export async function paletBirlestir(kaynaklar: string[], adet = 6): Promise<string[]> {
  const hepsi: string[] = [];
  for (const src of kaynaklar) {
    hepsi.push(...(await paletCikar(src, 4)));
  }
  const secilen: number[][] = [];
  for (const h of hepsi) {
    if (secilen.length >= adet) break;
    const c = [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
    if (secilen.every((s) => mesafe(s, c) >= ASGARI_MESAFE)) secilen.push(c);
  }
  return secilen.map(hex);
}

function gorseliYukle(src: string): Promise<HTMLImageElement | null> {
  return new Promise((coz) => {
    const im = new Image();
    im.onload = () => coz(im);
    im.onerror = () => coz(null);
    im.src = src;
  });
}
