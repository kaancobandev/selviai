/* Her vaka için karşılaştırma sayfası: üstte üç girdi, altta dört
   model çıktısı. Skorlama gözle ve yan yana yapılır — tek tek bakmak
   modeller arası farkı kaçırıyor.

   Görseller data URI olarak gömülür; sayfa tek dosya, tarayıcıda
   doğrudan açılır. Çıktı: scripts/olcum/cikti/kiyas/<vaka>.html */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VAKALAR, MODELLER } from "./altin-set.mjs";
import { yol } from "./indir.mjs";

const CIKTI = new URL("./cikti/", import.meta.url);
const SAYFA = new URL("./cikti/kiyas/", import.meta.url);

const gom = (u, tip) => `data:image/${tip};base64,` + readFileSync(u).toString("base64");

/* Hangi karenin gösterileceğine diskteki dosya değil, son ölçüm kaydı
   karar verir: başarısız bir koşudan sonra önceki denemenin dosyası
   diskte kalıyor ve sayfa onu gösterip yanıltıyordu. */
const sonKayitlar = (() => {
  const m = new Map();
  for (const satir of readFileSync(new URL("sonuclar.jsonl", CIKTI), "utf8").trim().split(String.fromCharCode(10))) {
    const k = JSON.parse(satir);
    m.set(`${k.model}|${k.vaka}`, k);
  }
  return m;
})();

function ciktiYolu(vakaId, modelAd) {
  const kayit = sonKayitlar.get(`${modelAd}|${vakaId}`);
  if (!kayit) return { hata: "ölçülmedi" };
  if (kayit.durum !== "tamam" || !kayit.dosya) {
    return { hata: kayit.bitis ?? kayit.durum ?? "hata" };
  }
  const f = new URL(kayit.dosya, CIKTI);
  if (!existsSync(f)) return { hata: "dosya yok" };
  const uz = kayit.dosya.split(".").pop();
  return { f, tip: uz === "jpg" ? "jpeg" : uz, ms: kayit.ms };
}

mkdirSync(SAYFA, { recursive: true });

for (const v of VAKALAR) {
  const ciktilar = MODELLER.map((m) => {
    const bulunan = ciktiYolu(v.id, m.ad);
    return {
      etiket: m.etiket,
      src: bulunan.f ? gom(bulunan.f, bulunan.tip) : null,
      hata: bulunan.hata,
      ms: bulunan.ms,
    };
  });
  const html = `<meta charset="utf-8"><title>${v.id}</title><style>
    body{margin:0;background:#fff;font:12px/1.4 ui-sans-serif,system-ui;padding:10px}
    h1{font:600 15px ui-sans-serif;margin:0 0 2px}
    .not{color:#666;margin:0 0 10px;font-size:11px}
    .sira{display:grid;gap:6px;margin-bottom:12px}
    .girdi{grid-template-columns:repeat(3,1fr);max-width:660px}
    .ciktilar{grid-template-columns:repeat(4,1fr)}
    figure{margin:0}
    .girdi img{width:100%;height:150px;object-fit:cover;border:1px solid #ddd}
    .ciktilar img{width:100%;height:460px;object-fit:contain;background:#f4f2ed;border:1px solid #ddd}
    figcaption{font-size:10px;color:#333;padding-top:2px;letter-spacing:.02em}
    .yok{height:460px;display:grid;place-items:center;background:#fee;color:#900}
  </style>
  <h1>${v.id} · ${v.tur} · ${v.crop}/${v.placement}/${v.lighting}/${v.aspect}</h1>
  <p class="not">Zorluk: ${v.zorluk}</p>
  <div class="sira girdi">
    <figure><img src="${gom(yol(v.person), "jpeg")}"><figcaption>1 KİŞİ</figcaption></figure>
    <figure><img src="${gom(yol(v.product), "jpeg")}"><figcaption>2 ÜRÜN</figcaption></figure>
    <figure><img src="${gom(yol(v.scene), "jpeg")}"><figcaption>3 SAHNE</figcaption></figure>
  </div>
  <div class="sira ciktilar">
    ${ciktilar.map((c, i) => `<figure>${c.src ? `<img src="${c.src}">` : `<div class="yok">${c.hata}</div>`}<figcaption>${String.fromCharCode(65 + i)} · ${c.etiket}${c.ms ? ` · ${(c.ms / 1000).toFixed(1)} sn` : ""}</figcaption></figure>`).join("")}
  </div>`;
  writeFileSync(new URL(`${v.id}.html`, SAYFA), html);
}
console.log(`${VAKALAR.length} kıyas sayfası: ${fileURLToPath(SAYFA)}`);
