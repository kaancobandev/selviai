import { NextResponse } from "next/server";
import { putJob } from "@/lib/ai/jobs";
import { runJob } from "@/lib/ai/run";
import { imzala, INVOKE_HEADER } from "@/lib/ai/invoke";
import { girdiYollari } from "@/lib/ai/resolve";
import { girdileriSil } from "@/lib/ai/storage";
import { oturumAlVeyaOlustur } from "@/lib/ai/session";
import {
  ASPECTS,
  CROPS,
  LIGHTINGS,
  PLACEMENTS,
  isRef,
  type ComposeInput,
  type ImageSource,
  type Job,
} from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Toplam gövde sınırı — istemci görselleri 1280 px'e küçültüp gönderir. */
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("İstek gövdesi okunamadı.");
  }

  const parsed = parseRequest(body);
  if ("error" in parsed) return bad(parsed.error);
  const composeRequest = parsed.value;

  const bytes =
    approxBytes(composeRequest.person) +
    approxBytes(composeRequest.product) +
    approxBytes(composeRequest.scene);
  if (bytes > MAX_TOTAL_BYTES) {
    return bad("Görseller çok büyük. Daha küçük dosyalarla deneyin.");
  }

  // Anonim oturum: galeri bununla kapsamlanır, kimse başkasının
  // ürettiği kareyi listeleyemez.
  const sessionId = await oturumAlVeyaOlustur();

  // Depo yolları istemciden geliyor; kendi oturumunun dışını
  // gösteremesinler — yoksa başkasının girdisiyle üretim yapılabilirdi.
  for (const kaynak of [composeRequest.person, composeRequest.product, composeRequest.scene]) {
    if (isRef(kaynak) && !kaynak.path.startsWith(sessionId + "/")) {
      return bad("Görsel yolu bu oturuma ait değil.");
    }
  }

  const job: Job = {
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: new Date().toISOString(),
    sessionId,
    request: composeRequest,
  };
  await putJob(job);

  // Sunucusuz ortamda yanıt döndükten sonra çalışan iş donduruluyor;
  // üretim mutlaka arka plan fonksiyonuna devredilmeli. Yalnızca yerel
  // geliştirmede (süreç uzun yaşar) doğrudan çalıştırılır.
  //
  // NOT: process.env.NETLIFY, Next.js çalışma zamanında tanımlı DEĞİL —
  // ona bakmak üretimde yanlış dala düşürüyordu.
  if (process.env.NODE_ENV === "development") {
    void runJob(job.id);
  } else {
    const triggered = await triggerBackground(job.id, request);
    if (!triggered) {
      // İş hiç başlamayacak: yüklenen girdileri burada temizle, yoksa
      // yüz fotoğrafları depoda öksüz kalır ve kotayı yer.
      await girdileriSil(girdiYollari(composeRequest));
      await putJob({
        ...job,
        status: "failed",
        completedAt: new Date().toISOString(),
        step: "baslatilamadi",
        error: "Üretim işi başlatılamadı.",
        request: undefined,
      });
      return NextResponse.json(
        { error: "Üretim işi başlatılamadı. Birazdan tekrar deneyin." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

async function triggerBackground(jobId: string, request: Request): Promise<boolean> {
  // Ortam değişkenlerine güvenmiyoruz: taban adres isteğin kendisinden
  // türetilir, sağlayıcı ne verirse versin çalışır.
  const base =
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    new URL(request.url).origin;
  try {
    // Arka plan fonksiyonu herkese açık bir adres; imzasız çağrıyı
    // kabul etmiyor. Bkz. lib/ai/invoke.ts.
    const imza = imzala(jobId);
    const res = await fetch(`${base}/.netlify/functions/compose-background`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(imza ? { [INVOKE_HEADER]: imza } : {}),
      },
      body: JSON.stringify({ jobId }),
    });
    if (res.status !== 202 && !res.ok) {
      console.error("triggerBackground: beklenmedik yanıt", res.status, base);
      return false;
    }
    return true;
  } catch (error) {
    console.error("triggerBackground başarısız:", base, error);
    return false;
  }
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function approxBytes(image: ImageSource): number {
  return isRef(image) ? 0 : Math.floor((image.data.length * 3) / 4);
}

type Parsed = { value: ComposeInput } | { error: string };

function parseRequest(body: unknown): Parsed {
  if (typeof body !== "object" || body === null) return { error: "Geçersiz istek." };
  const b = body as Record<string, unknown>;

  const slots: [keyof ComposeInput, string][] = [
    ["person", "Kişi fotoğrafı"],
    ["product", "Ürün görseli"],
    ["scene", "Arka plan görseli"],
  ];
  const images: Partial<Record<"person" | "product" | "scene", ImageSource>> = {};

  for (const [key, label] of slots) {
    const image = parseImage(b[key as string]);
    if (!image) return { error: `${label} eksik ya da desteklenmeyen biçimde.` };
    images[key as "person" | "product" | "scene"] = image;
  }

  const crop = pick(b.crop, CROPS);
  const placement = pick(b.placement, PLACEMENTS);
  const lighting = pick(b.lighting, LIGHTINGS);
  const aspect = pick(b.aspect, ASPECTS);
  if (!crop || !placement || !lighting || !aspect) {
    return { error: "Üretim parametreleri geçersiz." };
  }

  const note = typeof b.note === "string" ? b.note.slice(0, 300) : undefined;

  return {
    value: {
      person: images.person!,
      product: images.product!,
      scene: images.scene!,
      crop,
      placement,
      lighting,
      aspect,
      note,
    },
  };
}

/** Görsel ya gövdede (base64) ya da depodaki yoluyla gelir. */
function parseImage(value: unknown): ImageSource | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.mimeType !== "string" || !ALLOWED_MIME.has(v.mimeType)) return null;

  if (typeof v.path === "string") {
    // Beklenen biçim: <oturum>/<dosya>. Tek bölme, boş parça yok,
    // dizin dışına çıkma yok.
    const parca = v.path.split("/");
    if (parca.length !== 2 || parca.some((x) => !x || x.includes(".."))) return null;
    return { mimeType: v.mimeType, path: v.path };
  }
  if (typeof v.data === "string" && v.data.length >= 100) {
    return { mimeType: v.mimeType, data: v.data };
  }
  return null;
}

function pick<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : null;
}
