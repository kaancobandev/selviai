import { NextResponse } from "next/server";
import { oturumAlVeyaOlustur } from "@/lib/ai/session";
import { depoAcikMi, imzaliYukleme } from "@/lib/ai/storage";

/* ------------------------------------------------------------------
   İmzalı yükleme adresleri.

   İstemci görselleri API gövdesinden geçirmek yerine doğrudan depoya
   yükler: 4 MB'lık gövde sınırı kalkar ve yükleme gecikmesi üretim
   boru hattından çıkar.

   Yollar oturumla öneklenir. /api/compose gelen yolun bu önekle
   başladığını doğrular — yoksa bir istemci başkasının girdisini
   kendi üretiminde kullanabilirdi.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";

const SLOTLAR = ["person", "product", "scene"] as const;
const UZANTI: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  if (!depoAcikMi()) {
    // Depolama kapalı: istemci eski yola (gövdede base64) düşsün.
    return NextResponse.json({ destekleniyor: false }, { status: 200 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "İstek gövdesi okunamadı." }, { status: 400 });
  }
  const tipler = (body as { mimeTypes?: unknown })?.mimeTypes;
  if (!Array.isArray(tipler) || tipler.length !== SLOTLAR.length) {
    return NextResponse.json({ error: "Üç görselin tipi bildirilmeli." }, { status: 400 });
  }

  const oturum = await oturumAlVeyaOlustur();
  const hedefler = [];

  for (let i = 0; i < SLOTLAR.length; i += 1) {
    const uzanti = UZANTI[String(tipler[i])];
    if (!uzanti) {
      return NextResponse.json({ error: "Desteklenmeyen görsel biçimi." }, { status: 400 });
    }
    const yol = `${oturum}/${crypto.randomUUID()}-${SLOTLAR[i]}.${uzanti}`;
    const hedef = await imzaliYukleme(yol);
    if (!hedef) {
      return NextResponse.json({ error: "Yükleme adresi alınamadı." }, { status: 502 });
    }
    hedefler.push({ slot: SLOTLAR[i], yol: hedef.yol, adres: hedef.adres });
  }

  return NextResponse.json(
    { destekleniyor: true, hedefler },
    { headers: { "cache-control": "no-store" } },
  );
}
