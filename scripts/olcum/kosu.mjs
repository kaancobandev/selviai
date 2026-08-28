/* ------------------------------------------------------------------
   Ölçüm koşusu — altın setteki her vakayı her modelde üretir.

   Üretimdeki prompt birebir kullanılır (lib/ai/prompt.ts); kopya bir
   metinle ölçmek sonucu geçersiz kılar. Maliyet tahmin değil, yanıttaki
   usageMetadata üzerinden hesaplanır.

   Kullanım:
     node scripts/olcum/kosu.mjs                 # tam matris
     node scripts/olcum/kosu.mjs --model=3.1     # ada göre süz
     node scripts/olcum/kosu.mjs --vaka=kolye    # vakaya göre süz
     node scripts/olcum/kosu.mjs --kuru          # üretmeden maliyet tahmini
   ------------------------------------------------------------------ */
import { mkdirSync, writeFileSync, readFileSync, appendFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { VAKALAR, MODELLER } from "./altin-set.mjs";
import { girdileriHazirla, yol } from "./indir.mjs";
import { buildPrompt } from "../../lib/ai/prompt.ts";
import { createHash } from "node:crypto";

/** Prompt'un kısa parmak izi — sürüm değişince kayıtlardan görülsün. */
const PROMPT_OZET = createHash("sha256")
  .update(buildPrompt({
    person: { mimeType: "image/jpeg", data: "" }, product: { mimeType: "image/jpeg", data: "" },
    scene: { mimeType: "image/jpeg", data: "" },
    crop: "detay", placement: "el", lighting: "studyo", aspect: "1:1",
  }))
  .digest("hex").slice(0, 8);

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const CIKTI = new URL("./cikti/", import.meta.url);
const ES_ZAMANLI = 2;
const ZAMAN_ASIMI_MS = 180_000;

function anahtar() {
  const dosya = new URL("../../.env.local", import.meta.url);
  if (!existsSync(dosya)) throw new Error(".env.local bulunamadı");
  const k = readFileSync(dosya, "utf8").match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim();
  if (!k) throw new Error(".env.local içinde GEMINI_API_KEY yok");
  return k;
}

function b64(url) {
  return readFileSync(yol(url)).toString("base64");
}

/** usageMetadata'dan gerçek maliyet. Modalite kırılımı varsa kullanılır. */
export function maliyet(model, kullanim) {
  const girdi = kullanim?.promptTokenCount ?? 0;
  const cikti = kullanim?.candidatesTokenCount ?? 0;
  const dusunme = kullanim?.thoughtsTokenCount ?? 0;
  const kirilim = kullanim?.candidatesTokensDetails ?? [];
  const gorselTok = kirilim.find((d) => d.modality === "IMAGE")?.tokenCount;
  const gorsel = gorselTok ?? cikti;
  const metin = (gorselTok == null ? 0 : cikti - gorselTok) + dusunme;
  return (
    (girdi * model.girdiUsd + gorsel * model.gorselUsd + metin * model.metinUsd) / 1_000_000
  );
}

async function uret(model, vaka, apiKey) {
  const istek = {
    person: { mimeType: "image/jpeg", data: b64(vaka.person) },
    product: { mimeType: "image/jpeg", data: b64(vaka.product) },
    scene: { mimeType: "image/jpeg", data: b64(vaka.scene) },
    crop: vaka.crop, placement: vaka.placement, lighting: vaka.lighting, aspect: vaka.aspect,
    note: vaka.note,
  };
  const govde = {
    contents: [{
      role: "user",
      parts: [
        { text: buildPrompt(istek) },
        { inline_data: { mime_type: "image/jpeg", data: istek.person.data } },
        { inline_data: { mime_type: "image/jpeg", data: istek.product.data } },
        { inline_data: { mime_type: "image/jpeg", data: istek.scene.data } },
      ],
    }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: vaka.aspect, imageSize: "1K" },
    },
  };

  const basladi = Date.now();
  const res = await fetch(`${ENDPOINT}/${model.ad}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(govde),
    signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
  });
  const ms = Date.now() - basladi;
  const json = await res.json();

  if (!res.ok || json.error) {
    return { durum: "hata", ms, hata: json.error?.message ?? `HTTP ${res.status}` };
  }
  const aday = json.candidates?.[0];
  const parcalar = aday?.content?.parts ?? [];
  const gorsel = parcalar.find((p) => p.inlineData?.data)?.inlineData;
  const kullanim = json.usageMetadata;

  if (!gorsel?.data) {
    return {
      durum: "gorsel-yok",
      ms,
      bitis: aday?.finishReason,
      engel: json.promptFeedback?.blockReason,
      metin: parcalar.find((p) => p.text)?.text?.slice(0, 300),
      kullanim,
    };
  }

  // Modeller farklı biçim döndürüyor: 3.x JPEG, 2.5 PNG. Uzantı gerçek
  // türü yansıtmalı, yoksa araçlar dosyayı yanlış okuyor.
  const mime = gorsel.mimeType ?? "image/png";
  const ad = `${vaka.id}__${model.ad}.${uzanti(mime)}`;
  writeFileSync(new URL(ad, CIKTI), Buffer.from(gorsel.data, "base64"));
  return {
    durum: "tamam",
    ms,
    dosya: ad,
    mime,
    boyutKB: Math.round(gorsel.data.length * 0.75 / 1024),
    kullanim,
    usd: maliyet(model, kullanim),
  };
}

const uzanti = (mime) => ({ "image/jpeg": "jpg", "image/webp": "webp" })[mime] ?? "png";

async function havuz(isler, sinir) {
  const sonuc = [];
  let sira = 0;
  await Promise.all(
    Array.from({ length: Math.min(sinir, isler.length) }, async () => {
      while (sira < isler.length) {
        const i = sira++;
        sonuc[i] = await isler[i]();
      }
    }),
  );
  return sonuc;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (ad) => process.argv.find((a) => a.startsWith(`--${ad}=`))?.split("=")[1];
  const kuru = process.argv.includes("--kuru");
  const modeller = MODELLER.filter((m) => !arg("model") || m.ad.includes(arg("model")));
  const vakalar = VAKALAR.filter((v) => !arg("vaka") || v.id.includes(arg("vaka")));
  const toplam = modeller.length * vakalar.length;

  console.log(`${vakalar.length} vaka × ${modeller.length} model = ${toplam} üretim`);
  if (kuru) {
    // 1K kare ≈ 1120 token, girdi ≈ 3 görsel × 1290 + prompt ≈ 4400 token
    const tahmin = modeller.reduce(
      (t, m) => t + vakalar.length * (1120 * m.gorselUsd + 4400 * m.girdiUsd) / 1e6, 0);
    for (const m of modeller) {
      const bir = (1120 * m.gorselUsd + 4400 * m.girdiUsd) / 1e6;
      console.log(`  ${m.etiket.padEnd(16)} ${vakalar.length} × $${bir.toFixed(4)} = $${(bir * vakalar.length).toFixed(2)}`);
    }
    console.log(`Tahmini toplam: $${tahmin.toFixed(2)}`);
    process.exit(0);
  }

  mkdirSync(CIKTI, { recursive: true });
  await girdileriHazirla();
  const apiKey = anahtar();
  const kayitYolu = new URL("./sonuclar.jsonl", CIKTI);
  const damga = new Date().toISOString();

  const isler = [];
  for (const model of modeller) {
    for (const vaka of vakalar) {
      isler.push(async () => {
        let r;
        try {
          r = await uret(model, vaka, apiKey);
        } catch (e) {
          r = { durum: "hata", hata: e instanceof Error ? e.message : String(e) };
        }
        const kayit = { damga, promptOzet: PROMPT_OZET, model: model.ad, etiket: model.etiket, vaka: vaka.id, tur: vaka.tur, ...r };
        appendFileSync(kayitYolu, JSON.stringify(kayit) + "\n");
        const isaret = r.durum === "tamam" ? "✓" : "✕";
        console.log(`${isaret} ${model.etiket.padEnd(16)} ${vaka.id.padEnd(18)} ${String(r.ms ?? "-").padStart(6)} ms  ${r.usd ? "$" + r.usd.toFixed(4) : (r.hata ?? r.durum ?? "").slice(0, 60)}`);
        return kayit;
      });
    }
  }

  const sonuclar = await havuz(isler, ES_ZAMANLI);
  const basarili = sonuclar.filter((s) => s.durum === "tamam");
  const gider = basarili.reduce((t, s) => t + (s.usd ?? 0), 0);
  console.log(`\n${basarili.length}/${toplam} üretildi · gerçek gider $${gider.toFixed(2)}`);
  console.log(`Kayıtlar: scripts/olcum/cikti/sonuclar.jsonl`);
}
