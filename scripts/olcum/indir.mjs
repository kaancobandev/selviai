/* Altın setin girdi görsellerini indirir ve önbelleğe alır.
   Üretimdeki istemci görselleri 1280 px / JPEG'e küçülttüğü için
   girdiler de aynı boyutta çekilir — ölçüm gerçek akışı yansıtsın. */
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { VAKALAR } from "./altin-set.mjs";

const DIZIN = new URL("./girdi/", import.meta.url);

export function yol(url) {
  const ad = url.match(/photo-([0-9a-f]+-[0-9a-f]+)/)[1] + ".jpg";
  return new URL(ad, DIZIN);
}

export async function girdileriHazirla() {
  mkdirSync(DIZIN, { recursive: true });
  const urller = [...new Set(VAKALAR.flatMap((v) => [v.person, v.product, v.scene]))];
  let indirilen = 0;
  for (const url of urller) {
    const hedef = yol(url);
    if (existsSync(hedef) && statSync(hedef).size > 10_000) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`indirilemedi (${res.status}): ${url}`);
    writeFileSync(hedef, Buffer.from(await res.arrayBuffer()));
    indirilen += 1;
    process.stdout.write(".");
  }
  return { toplam: urller.length, indirilen };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { toplam, indirilen } = await girdileriHazirla();
  console.log(`\n${toplam} girdi · ${indirilen} indirildi · ${toplam - indirilen} önbellekten`);
}
