/**
 * DEĞERLENDİRİCİ — çıkarıcının JSON'unu alır, bileşkeyi hesaplar, rapor eder.
 *
 *   node scripts/tema-olcum/kosu.mjs girdi/koyu-1280.json
 *
 * TASARIM İLKESİ: çözemediği katmanı ASLA sessizce geçmez. Bu işin en
 * tehlikeli hata biçimi "yanlış geçti" — çünkü kimse kontrol etmez.
 * Çözülemeyen her nokta ÇÖZÜLEMEDİ olarak raporlanır ve çıkış kodunu
 * bozar; elle bakılması gerektiği görünür kalır.
 */

import { readFileSync } from "node:fs";
import { kontrast, uzerine, doygunluk, ESIK, buyukMu, hex } from "./renk.mjs";

const dosya = process.argv[2];
if (!dosya) {
  console.error("kullanım: node scripts/tema-olcum/kosu.mjs <girdi.json>");
  process.exit(2);
}
const g = JSON.parse(readFileSync(dosya, "utf8"));

/** backdrop-filter dizesinden saturate katsayısını çeker. */
function doygunlukKatsayisi(backdrop) {
  if (!backdrop) return null;
  const m = backdrop.match(/saturate\(([\d.]+)(%?)\)/);
  if (!m) return null;
  return m[2] === "%" ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
}

const sonuclar = [];

for (const n of g.noktalar) {
  if (n.kadrajDisi) {
    sonuclar.push({ metin: n.metin, durum: "KADRAJ_DISI" });
    continue;
  }

  /* Yığın elementsFromPoint sırasında gelir: EN ÜSTTEKİ ÖNCE. Metnin
     kendisini bul, ondan AŞAĞISINI al, ters çevir ki bileşke en alttan
     başlasın. */
  const kendiIdx = n.yigin.findIndex((k) => k.etiket === n.etiket);
  const altYigin = (kendiIdx >= 0 ? n.yigin.slice(kendiIdx) : n.yigin).slice().reverse();

  let bileske = g.sayfaZemini ? g.sayfaZemini.slice(0, 3) : [11, 11, 11];
  const cozulemeyenler = [];
  let doygunlukUygulandi = null;
  let sinirVar = false;

  for (const k of altYigin) {
    /* backdrop-filter ALTTAKİ her şeye uygulanır, katmanın kendisine değil. */
    const s = doygunlukKatsayisi(k.backdrop);
    if (s !== null) { bileske = doygunluk(bileske, s); doygunlukUygulandi = s; }

    /* Önce background-color, sonra background-image katmanları.
       CSS katmanları ÜSTTEN ALTA sıralı, boyama ise alttan üste: ters çevir. */
    if (k.zemin && k.zemin[3] > 0) bileske = uzerine(k.zemin, bileske);
    if (k.katmanlar) {
      for (const kat of [...k.katmanlar].reverse()) {
        /* Kapsamayan katman: .u-line alt cizgisi gibi, orneklenen noktanin
           uzerinde degil. Atlanir — cozulemedi DEGIL, bilerek yok sayiliyor. */
        if (kat.tur === "kapsamiyor") continue;
        if (kat.tur === "cozulemedi") { cozulemeyenler.push(k.etiket + " :: " + kat.ifade); continue; }
        /* sinir: gradyan noktada çözülemedi, en kötü durak kullanıldı.
           Oran bir ÖLÇÜM değil ÜST SINIR — geçerse gerçekten geçiyor,
           kalırsa elle bakmak gerekebilir. */
        if (kat.sinir) sinirVar = true;
        if (kat.renk && kat.renk[3] > 0) bileske = uzerine(kat.renk, bileske);
      }
    }
  }

  const esik = buyukMu(n.px, n.kalinlik) ? ESIK.buyukMetin : ESIK.metin;
  const oran = n.renk ? kontrast(uzerine(n.renk, bileske), bileske) : null;

  sonuclar.push({
    metin: n.metin,
    px: n.px,
    esik,
    oran: oran === null ? null : +oran.toFixed(2),
    zemin: hex(bileske),
    doygunlukUygulandi,
    sinirVar,
    cozulemeyenler,
    durum: cozulemeyenler.length ? "COZULEMEDI" : oran === null ? "RENK_YOK" : oran >= esik ? "GECTI" : "KALDI",
  });
}

/* ---------- rapor ---------- */
const say = (d) => sonuclar.filter((s) => s.durum === d).length;
console.log(`TEMA OLCUMU — ${g.url}  ${g.viewport.g}x${g.viewport.y}  yon=${g.yon}  kok=${g.kok}`);
console.log(
  `  sayfa zemini ${hex(g.sayfaZemini || [11, 11, 11])} · raster ${g.rasterSayisi}` +
    ` · pointer-events acilan ${g.pointerEventsAcilan ?? "?"}\n`,
);

const olculen = sonuclar.filter((s) => s.oran !== null && s.oran !== undefined);
const sirali = [...olculen].sort((a, b) => a.oran - a.esik - (b.oran - b.esik));
for (const s of sirali) {
  const isaret = s.durum === "GECTI" ? "  " : s.durum === "KALDI" ? "!!" : "??";
  console.log(
    `${isaret} ${String(s.oran).padStart(6)}:1 (esik ${s.esik})  ${String(s.px).padStart(5)}px  ${s.zemin}  ` +
      s.metin.slice(0, 32) +
      (s.sinirVar ? "  [sinir]" : "") +
      (s.cozulemeyenler.length ? `   <- COZULEMEDI: ${s.cozulemeyenler[0].slice(0, 46)}` : ""),
  );
}
for (const s of sonuclar.filter((x) => x.durum === "KADRAJ_DISI")) {
  console.log(`?? ${"kadraj disi".padStart(12)}  ${s.metin.slice(0, 32)}`);
}

console.log(
  `\n  toplam ${sonuclar.length} · gecti ${say("GECTI")} · KALDI ${say("KALDI")}` +
    ` · COZULEMEDI ${say("COZULEMEDI") + say("RENK_YOK")} · kadraj disi ${say("KADRAJ_DISI")}`,
);
const sinirSayisi = sonuclar.filter((s) => s.sinirVar).length;
if (sinirSayisi) {
  console.log(
    `  [sinir] ${sinirSayisi} nokta: gradyan noktada çözülemedi, en kötü` +
      ` durak tam kapsamla bindirildi. Geçenler GERÇEKTEN geçiyor.`,
  );
}
const enDar = sirali.find((s) => s.durum === "GECTI" || s.durum === "KALDI");
if (enDar) console.log(`  en dar pay: ${enDar.oran}:1 (esik ${enDar.esik}) — "${enDar.metin.slice(0, 40)}"`);

if (say("KALDI") || say("COZULEMEDI") || say("RENK_YOK") || say("KADRAJ_DISI")) process.exit(1);
