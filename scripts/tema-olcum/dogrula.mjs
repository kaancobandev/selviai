/**
 * Regresyon doğrulaması — Faz 1'in KABUL ÖLÇÜTÜ.
 *
 * Depoda YAZILI olan bugünkü koyu sayıları yeniden üretir. Üretemezse
 * koşum hatalıdır ve ona dayanacak 14 açık tema ölçümünün hepsi çöp olur.
 *
 *   node scripts/tema-olcum/dogrula.mjs
 *
 * TASARIM NOTU — neden üç ayrı bölüm.
 * İlk yazımda bileşke zincirinden çıkan rengin kontrastı doğrudan yazılı
 * oranla karşılaştırılıyordu. Yanlıştı: o tek testte İKİ bağımsız yuvarlama
 * kaynağı üst üste biniyor. Ölçüldü — belgelenmiş hex'lerin KENDİSİ yazılı
 * oranlardan ±0,05'e kadar sapıyor (#3448bd -> 7,479 ama tabloda 7,53),
 * çünkü tablo yuvarlanmış hex'ten değil float bileşkeden hesaplanmış.
 * Bu yüzden bölümler ayrıldı: A saf WCAG matematiğini, B bileşke zincirini
 * sınar. Biri bozulduğunda hangisinin bozulduğu belli olur.
 */

import { ayristir, hex, kontrast, uzerine, doygunluk, gradyanda } from "./renk.mjs";

let gecen = 0, kalan = 0;
const satir = [];
const yaz = (ok, ad, detay) => {
  ok ? gecen++ : kalan++;
  satir.push(`  ${ok ? "GECTI" : "KALDI"}  ${ad.padEnd(44)} ${detay}`);
};
const sinaSayi = (ad, bulunan, beklenen, tol, birim = ":1") =>
  yaz(
    Math.abs(bulunan - beklenen) <= tol,
    ad,
    `${bulunan.toFixed(3).padStart(8)}${birim}  beklenen ${String(beklenen).padStart(6)}${birim}  (±${tol})`,
  );
const sinaRenk = (ad, bulunan, beklenen, tolKanal = 1) => {
  const b = ayristir(hex(bulunan)), e = ayristir(beklenen);
  const f = Math.max(...[0, 1, 2].map((i) => Math.abs(b[i] - e[i])));
  yaz(f <= tolKanal, ad, `${hex(bulunan)}  beklenen ${beklenen}  (kanal farkı ${f}, izin ${tolKanal})`);
};

const BEYAZ = [255, 255, 255];
const SAYFA = ayristir("#0b0b0b");

/* ══════════════════════════════════════════════════════════════
   A) SAF WCAG MATEMATİĞİ
   Belgelenmiş bileşke hex'lerinden yazılı oranlar çıkıyor mu.
   Tolerans ±0,06: tablonun kendi yuvarlama gürültüsü ölçüldü, ±0,051.
   ══════════════════════════════════════════════════════════════ */
satir.push("A) SAF WCAG MATEMATIGI — belgelenmis hex -> yazili oran");
for (const [ad, h, bek] of [
  ["kart üst kenarı", "#3249c2", 7.35],
  ["plan adı + rozet", "#3448bd", 7.53],
  ["özet metni", "#3644b2", 7.99],
  ["fiyat rakamı", "#3942aa", 8.28],
  ["döküm satırları", "#4a43a5", 7.95],
  ["CTA bölgesi", "#654eab", 6.47],
  ["kart alt kenarı (EN KÖTÜ)", "#7557b0", 5.62],
]) sinaSayi(ad + " — beyaz metin", kontrast(ayristir(h), BEYAZ), bek, 0.06);

sinaSayi("alt kenar — ikincil %86 beyaz", kontrast(ayristir("#7557b0"), uzerine([255, 255, 255, 0.86], ayristir("#7557b0"))), 4.64, 0.06);
sinaSayi("üst kenar — vurgu #e2d8fb", kontrast(ayristir("#3249c2"), ayristir("#e2d8fb")), 5.40, 0.06);
sinaSayi("odak #bfa6ee en açık noktada (KALIR)", kontrast(ayristir("#7557b0"), ayristir("#bfa6ee")), 2.64, 0.05);
sinaSayi("odak #ded0ff en açık noktada", kontrast(ayristir("#7557b0"), ayristir("#ded0ff")), 3.89, 0.05);
sinaSayi("odak #ded0ff sayfa zemininde", kontrast(SAYFA, ayristir("#ded0ff")), 13.66, 0.05);
sinaSayi("ash #8a8792 koyuda", kontrast(SAYFA, ayristir("#8a8792")), 5.59, 0.05);
sinaSayi("ash #8a8792 BEYAZDA (AA kaybı)", kontrast(BEYAZ, ayristir("#8a8792")), 3.52, 0.05);
sinaSayi("fog #a5a2ad koyuda", kontrast(SAYFA, ayristir("#a5a2ad")), 7.85, 0.05);
sinaSayi("lila-soft #bfa6ee koyuda", kontrast(SAYFA, ayristir("#bfa6ee")), 9.28, 0.05);
sinaSayi("footer2 en parlak nokta, peçesiz", kontrast(ayristir("rgb(125,102,255)"), BEYAZ), 4.03, 0.05);

/* ══════════════════════════════════════════════════════════════
   B) BİLEŞKE ZİNCİRİ
   Yığın: sayfa -> .fiyat-zemin tepe -> backdrop saturate(150%)
          -> .fiyat-cam dolgusu (%78) -> kutup ışığı -> grain
   Hedef belgelenmiş HEX; oran değil (bkz. tasarım notu).
   ══════════════════════════════════════════════════════════════ */
satir.push("");
satir.push("B) BILESKE ZINCIRI — yigindan belgelenmis hex cikiyor mu");

sinaRenk("saturate(1.5): #4d4380 -> zemin tavanı", doygunluk(ayristir("#4d4380"), 1.5), "#4f409b", 0);

const ZEMIN = doygunluk(ayristir("#4d4380"), 1.5);
const GRAIN = [255, 255, 255, 0.05]; // kötümser düz beyaz; gerçek yerel ort. ~%3,5
const CAM = [
  { konum: 0.0, renk: [24, 56, 190, 0.78] },
  { konum: 0.4, renk: [38, 54, 168, 0.78] },
  { konum: 0.72, renk: [70, 56, 160, 0.78] },
  { konum: 1.0, renk: [110, 76, 168, 0.78] },
];
const kart = (t, kutup) => {
  let c = uzerine([...ZEMIN, 1], SAYFA);
  c = uzerine(gradyanda(CAM, t), c);
  if (kutup) c = uzerine(kutup, c);
  return uzerine(GRAIN, c);
};
sinaRenk("kart ÜST kenarı bileşkesi", kart(0, [56, 96, 240, 0.16]), "#3249c2");
sinaRenk("kart ALT kenarı bileşkesi", kart(1, [150, 104, 214, 0.16]), "#7557b0");

/* ══════════════════════════════════════════════════════════════
   C) FİLTRENİN YÖNÜ
   saturate atlanırsa kayma HER ZAMAN iyimser olmalı — yani gerçekte
   geçmeyen bir yüzeyi "geçti" göstermeli. Yön tersse model hatalıdır.
   ══════════════════════════════════════════════════════════════ */
satir.push("");
satir.push("C) FILTRE YONU — saturate atlanirsa iyimser mi");
{
  const ile = kontrast(kart(1, [150, 104, 214, 0.16]), BEYAZ);
  let c = uzerine([...ayristir("#4d4380"), 1], SAYFA);
  c = uzerine(gradyanda(CAM, 1), c);
  c = uzerine([150, 104, 214, 0.16], c);
  const siz = kontrast(uzerine(GRAIN, c), BEYAZ);
  yaz(siz > ile, "saturate atlanınca oran yükseliyor", `ile ${ile.toFixed(3)} · siz ${siz.toFixed(3)} · fark +${(siz - ile).toFixed(3)}`);
}

console.log("REGRESYON DOGRULAMASI — depoda yazili koyu sayilar\n");
satir.forEach((s) => console.log(s));
console.log(`\n  gecen ${gecen} · kalan ${kalan}`);
if (kalan > 0) {
  console.log("\n  KOSUM HATALI. Bu fikstur gecmeden Faz 1 bitmis sayilmaz.");
  process.exit(1);
}
console.log("\n  Model dogrulandi — kosum bu zemin uzerine kurulabilir.");
