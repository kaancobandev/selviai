/* ------------------------------------------------------------------
   Kabul kapısını doğrular: hakem, Faz 2'de gözle verilen 32 puanla ne
   kadar örtüşüyor? Kapıya güvenmeden önce bunun ölçülmesi şart.

   En önemli sayı "yanlış kabul": hakemin geçirdiği ama insanın
   reddettiği kare. Bu, kullanıcıya ulaşan kötü kare demek.

   Kullanım: node scripts/olcum/hakem.mjs [--model=gemini-3.5-flash]
   ------------------------------------------------------------------ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { VAKALAR, MODELLER, OLCUTLER } from "./altin-set.mjs";
import { yol } from "./indir.mjs";
import { judgeComposite } from "../../lib/ai/judge.ts";

const CIKTI = new URL("./cikti/", import.meta.url);

process.env.GEMINI_API_KEY ??= readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
  .match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim();

const secilen = process.argv.find((a) => a.startsWith("--model="))?.split("=")[1];
if (secilen) process.env.COMPOSE_JUDGE_MODEL = secilen;

const b64 = (u) => readFileSync(u).toString("base64");
const mimeOf = (ad) => (ad.endsWith(".jpg") ? "image/jpeg" : ad.endsWith(".webp") ? "image/webp" : "image/png");

/** İnsan puanından kabul kararı — rapor.mjs ile aynı kural. */
const insanKabul = (s) =>
  OLCUTLER.filter((o) => o.zorunlu).every((o) => s?.[o.id] != null && s[o.id] >= o.esik);

const sonKayit = new Map();
for (const satir of readFileSync(new URL("sonuclar.jsonl", CIKTI), "utf8").trim().split(String.fromCharCode(10))) {
  const k = JSON.parse(satir);
  sonKayit.set(`${k.model}|${k.vaka}`, k);
}
const { skorlar } = JSON.parse(readFileSync(new URL("./skorlar.json", import.meta.url), "utf8"));

const isler = [];
for (const v of VAKALAR) {
  for (const m of MODELLER) {
    const kayit = sonKayit.get(`${m.ad}|${v.id}`);
    const insan = skorlar[v.id]?.[m.ad];
    if (!kayit || kayit.durum !== "tamam" || !kayit.dosya || !insan) continue;
    const dosya = new URL(kayit.dosya, CIKTI);
    if (!existsSync(dosya)) continue;
    isler.push({ vaka: v, model: m, kayit, insan, dosya });
  }
}

console.log(`${isler.length} kare hakeme veriliyor · model ${process.env.COMPOSE_JUDGE_MODEL ?? "varsayılan"}`);

const sonuclar = [];
let sira = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (sira < isler.length) {
    const i = sira++;
    const { vaka, model, insan, dosya } = isler[i];
    const istek = {
      person: { mimeType: "image/jpeg", data: b64(yol(vaka.person)) },
      product: { mimeType: "image/jpeg", data: b64(yol(vaka.product)) },
      scene: { mimeType: "image/jpeg", data: b64(yol(vaka.scene)) },
      crop: vaka.crop, placement: vaka.placement, lighting: vaka.lighting, aspect: vaka.aspect,
    };
    const karar = await judgeComposite(istek, {
      mimeType: mimeOf(dosya.pathname),
      data: b64(dosya),
    });
    const beklenen = insanKabul(insan);
    sonuclar[i] = { vaka: vaka.id, model: model.etiket, insan, karar, beklenen };
    const im = karar ? (karar.kabul === beklenen ? "·" : "!") : "?";
    console.log(`${im} ${model.etiket.padEnd(16)} ${vaka.id.padEnd(18)} insan=${beklenen ? "kabul" : "ret  "} hakem=${karar ? (karar.kabul ? "kabul" : "ret  ") : "yok  "} ${karar ? `(u${karar.urun} a${karar.anatomi}) ${karar.gerekce.slice(0, 58)}` : ""}`);
  }
}));

const gecerli = sonuclar.filter((s) => s.karar);
const uyum = gecerli.filter((s) => s.karar.kabul === s.beklenen).length;
const yanlisKabul = gecerli.filter((s) => s.karar.kabul && !s.beklenen);
const yanlisRet = gecerli.filter((s) => !s.karar.kabul && s.beklenen);

console.log(`\nUyum: ${uyum}/${gecerli.length} (%${Math.round((uyum / gecerli.length) * 100)})`);
console.log(`Yanlış kabul (kötü kare geçti): ${yanlisKabul.length} → ${yanlisKabul.map((s) => `${s.model}/${s.vaka}`).join(", ") || "yok"}`);
console.log(`Yanlış ret (iyi kare düştü):    ${yanlisRet.length} → ${yanlisRet.map((s) => `${s.model}/${s.vaka}`).join(", ") || "yok"}`);

for (const o of OLCUTLER) {
  const ciftler = gecerli.filter((s) => s.insan[o.id] != null && s.karar[o.id] != null);
  const sapma = ciftler.reduce((t, s) => t + Math.abs(s.karar[o.id] - s.insan[o.id]), 0) / (ciftler.length || 1);
  const egilim = ciftler.reduce((t, s) => t + (s.karar[o.id] - s.insan[o.id]), 0) / (ciftler.length || 1);
  console.log(`  ${o.ad.padEnd(20)} ort. sapma ${sapma.toFixed(2)} · eğilim ${egilim > 0 ? "+" : ""}${egilim.toFixed(2)} (${ciftler.length} kare)`);
}

writeFileSync(new URL("hakem.json", CIKTI), JSON.stringify({ model: process.env.COMPOSE_JUDGE_MODEL, sonuclar }, null, 1));
console.log("\nhakem.json yazıldı");
