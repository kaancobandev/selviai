/* ------------------------------------------------------------------
   Skor kartını doldurur: kabul oranı, p50/p95 gecikme ve kabul edilen
   kare başına gerçek maliyet. Karar bu üçüncü sayıya göre verilir.

   Girdi:  cikti/sonuclar.jsonl (ölçüm) + skorlar.json (gözle puanlama)
   Çıktı:  konsol tablosu + cikti/rapor.json
   ------------------------------------------------------------------ */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { MODELLER, VAKALAR, OLCUTLER } from "./altin-set.mjs";
import { maliyet } from "./kosu.mjs";

const CIKTI = new URL("./cikti/", import.meta.url);

function kayitlar() {
  const satirlar = readFileSync(new URL("sonuclar.jsonl", CIKTI), "utf8").trim().split("\n");
  // Aynı (model, vaka) için birden çok koşu olabilir; en sonuncusu geçerli.
  const son = new Map();
  for (const s of satirlar) {
    const k = JSON.parse(s);
    son.set(`${k.model}|${k.vaka}`, k);
  }
  return [...son.values()];
}

const yuzdelik = (dizi, p) => {
  if (!dizi.length) return null;
  const s = [...dizi].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const alt = Math.floor(i), ust = Math.ceil(i);
  return Math.round(alt === ust ? s[alt] : s[alt] + (s[ust] - s[alt]) * (i - alt));
};

/** Ağırlıklı skor; puanlanmamış ölçüt (null) ağırlığıyla birlikte düşer. */
export function agirlikli(skor) {
  let toplam = 0, agirlik = 0;
  for (const o of OLCUTLER) {
    const p = skor?.[o.id];
    if (p == null) continue;
    toplam += p * o.agirlik;
    agirlik += o.agirlik;
  }
  return agirlik ? toplam / agirlik : null;
}

/** Zorunlu eşikleri geçiyor mu? */
export function kabul(skor) {
  return OLCUTLER.filter((o) => o.zorunlu).every((o) => {
    const p = skor?.[o.id];
    return p != null && p >= o.esik;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { skorlar } = JSON.parse(readFileSync(new URL("./skorlar.json", import.meta.url), "utf8"));
  const olcumler = kayitlar();
  const satirlar = [];

  for (const m of MODELLER) {
    const kendi = olcumler.filter((o) => o.model === m.ad);
    const tamam = kendi.filter((o) => o.durum === "tamam");
    const gecikmeler = tamam.map((o) => o.ms);
    // Başarısız çağrılar da faturalanıyor: kabul başına maliyet, koşunun
    // TAMAMINA bölünmeli — yoksa güvenilmez model olduğundan ucuz görünür.
    const toplamGider = kendi.reduce(
      (t, o) => t + (o.usd ?? (o.kullanim ? maliyet(m, o.kullanim) : 0)), 0);

    const puanlar = VAKALAR.map((v) => ({ vaka: v.id, skor: skorlar[v.id]?.[m.ad] }));
    const kabuller = puanlar.filter((p) => kabul(p.skor));
    const kabulOrani = puanlar.length ? kabuller.length / puanlar.length : 0;
    const ortGider = kendi.length ? toplamGider / kendi.length : 0;
    const agirliklar = puanlar.map((p) => agirlikli(p.skor)).filter((x) => x != null);

    satirlar.push({
      model: m.ad,
      etiket: m.etiket,
      uretilen: `${tamam.length}/${kendi.length}`,
      kabulOrani,
      kabulSayisi: `${kabuller.length}/${puanlar.length}`,
      agirlikliOrt: agirliklar.length ? agirliklar.reduce((a, b) => a + b, 0) / agirliklar.length : null,
      p50: yuzdelik(gecikmeler, 0.5),
      p95: yuzdelik(gecikmeler, 0.95),
      kareBasiUsd: ortGider,
      toplamGider,
      kabulBasiUsd: kabuller.length ? toplamGider / kabuller.length : null,
      dusenler: puanlar.filter((p) => !kabul(p.skor)).map((p) => p.vaka),
    });
  }

  satirlar.sort((a, b) => (a.kabulBasiUsd ?? 1e9) - (b.kabulBasiUsd ?? 1e9));

  const g = (n, w) => String(n).padStart(w);
  console.log("\nModel              kabul   ağırlıklı   p50      p95     kare$    kabul$");
  console.log("─".repeat(76));
  for (const s of satirlar) {
    console.log(
      s.etiket.padEnd(17) +
      g(`${Math.round(s.kabulOrani * 100)}%`, 5) + g(s.kabulSayisi, 7) +
      g(s.agirlikliOrt?.toFixed(2) ?? "—", 8) +
      g(`${(s.p50 / 1000).toFixed(1)}s`, 8) + g(`${(s.p95 / 1000).toFixed(1)}s`, 8) +
      g(`$${s.kareBasiUsd.toFixed(4)}`, 10) + g(s.kabulBasiUsd ? `$${s.kabulBasiUsd.toFixed(4)}` : "—", 10),
    );
  }
  console.log("─".repeat(76));
  for (const s of satirlar) {
    if (s.dusenler.length) console.log(`${s.etiket}: eşiği geçemeyen → ${s.dusenler.join(", ")}`);
  }

  writeFileSync(new URL("rapor.json", CIKTI), JSON.stringify({ tarih: new Date().toISOString(), satirlar }, null, 2));
  console.log("\nrapor.json yazıldı");
}
