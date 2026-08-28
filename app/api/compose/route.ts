import { NextResponse } from "next/server";
import { putJob } from "@/lib/ai/jobs";
import { runJob } from "@/lib/ai/run";
import { probeReachability } from "@/lib/ai/gemini";
import {
  ASPECTS,
  CROPS,
  LIGHTINGS,
  PLACEMENTS,
  type ComposeRequest,
  type ImageInput,
  type Job,
} from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Toplam gövde sınırı — istemci görselleri 1280 px'e küçültüp gönderir. */
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Teşhis: bu çalışma ortamından dışarıya erişimi ölçer. Üretim yapmaz,
 * ücret doğurmaz. Arka plan fonksiyonundaki yoklamayla karşılaştırınca
 * sorunun hangi katmanda olduğu ayrılır.
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY tanımlı değil." }, { status: 500 });
  }
  const started = Date.now();
  const yoklama = await probeReachability(apiKey);
  return NextResponse.json(
    { ortam: "next-route-handler", netlify: Boolean(process.env.NETLIFY), yoklama, ms: Date.now() - started },
    { headers: { "cache-control": "no-store" } },
  );
}

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

  const job: Job = {
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: new Date().toISOString(),
    request: composeRequest,
  };
  await putJob(job);

  // Netlify'da senkron fonksiyonlar 10 sn'de kesilir; üretim arka plan
  // fonksiyonuna devredilir. Yerelde süreç uzun yaşadığı için doğrudan
  // çalıştırmak yeterli.
  if (process.env.NETLIFY) {
    const triggered = await triggerBackground(job.id);
    if (!triggered) {
      return NextResponse.json(
        { error: "Üretim işi başlatılamadı. Birazdan tekrar deneyin." },
        { status: 502 },
      );
    }
  } else {
    void runJob(job.id);
  }

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

async function triggerBackground(jobId: string): Promise<boolean> {
  const base = process.env.URL ?? process.env.DEPLOY_PRIME_URL;
  if (!base) {
    console.error("triggerBackground: URL ortam değişkeni yok.");
    return false;
  }
  try {
    const res = await fetch(`${base}/.netlify/functions/compose-background`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    return res.status === 202 || res.ok;
  } catch (error) {
    console.error("triggerBackground başarısız:", error);
    return false;
  }
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function approxBytes(image: ImageInput): number {
  return Math.floor((image.data.length * 3) / 4);
}

type Parsed = { value: ComposeRequest } | { error: string };

function parseRequest(body: unknown): Parsed {
  if (typeof body !== "object" || body === null) return { error: "Geçersiz istek." };
  const b = body as Record<string, unknown>;

  const slots: [keyof ComposeRequest, string][] = [
    ["person", "Kişi fotoğrafı"],
    ["product", "Ürün görseli"],
    ["scene", "Arka plan görseli"],
  ];
  const images: Partial<Record<"person" | "product" | "scene", ImageInput>> = {};

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

function parseImage(value: unknown): ImageInput | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.mimeType !== "string" || typeof v.data !== "string") return null;
  if (!ALLOWED_MIME.has(v.mimeType)) return null;
  if (v.data.length < 100) return null;
  return { mimeType: v.mimeType, data: v.data };
}

function pick<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : null;
}
