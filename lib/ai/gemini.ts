import { apiAnahtari, type Katman } from "./anahtar";
import { buildPrompt } from "./prompt";
import type { ComposeRequest } from "./types";

/* ------------------------------------------------------------------
   Sağlayıcı katmanı — Google Generative Language REST API'sine doğrudan
   çağrı. SDK yerine `fetch` kullanılıyor çünkü:
   · Netlify fonksiyonunda paketleme/dış modül sorunu kalmıyor
   · soğuk başlangıç ucuz (büyük bağımlılık yüklenmiyor)
   · zaman aşımı AbortController ile gerçekten isteği iptal ediyor

   Model, ortam değişkeninden okunur; ölçüm sonucunda değişecek olan
   tek şey budur (bkz. planın 07. bölümü).
   ------------------------------------------------------------------ */

export type ComposeResult = {
  mimeType: string;
  /** base64, veri öneki olmadan */
  data: string;
  model: string;
  ms: number;
};

export class ComposeError extends Error {
  /** Kullanıcıya gösterilecek Türkçe metin */
  readonly userMessage: string;
  constructor(userMessage: string, cause?: unknown) {
    super(userMessage, { cause });
    this.name = "ComposeError";
    this.userMessage = userMessage;
  }
}

const DEFAULT_MODEL = "gemini-3.1-flash-image";
const DEFAULT_SIZE = "1K";
const DEFAULT_TIMEOUT_MS = 120_000;
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function composeModel(): string {
  return process.env.COMPOSE_MODEL?.trim() || DEFAULT_MODEL;
}

/* Yanıtın ihtiyacımız olan kısmı */
type Part = { text?: string; inlineData?: { mimeType?: string; data?: string } };
type ApiResponse = {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; status?: string; message?: string };
};

/**
 * @param modelAdi Zincirdeki modeli çağıran taraf seçer (bkz. run.ts);
 *   verilmezse ortam değişkenindeki birincil model kullanılır.
 * @param katman Hangi Google projesinin anahtarı kullanılacak. Ücretsiz
 *   deneme ayrı projede çalışır; hız sınırı ve harcama tavanı proje
 *   bazlı olduğu için bu ayrım ödeyen müşteriyi korur (bkz. anahtar.ts).
 */
export async function generateComposite(
  req: ComposeRequest,
  modelAdi?: string,
  katman?: Katman,
): Promise<ComposeResult> {
  const apiKey = apiAnahtari(katman);
  if (!apiKey) {
    /* Ziyaretçiye ortam değişkeni adı gösterilmez; bu bir operatör sorunu ve
       müşterinin yapabileceği bir şey yok. Ayrıntı sunucu günlüğünde. */
    console.error("Sağlayıcı anahtarı tanımlı değil (GEMINI_API_KEY).");
    throw new ComposeError("Üretim şu anda kullanılamıyor. Kısa süre sonra tekrar deneyin.");
  }

  const model = modelAdi?.trim() || composeModel();
  const imageSize = process.env.COMPOSE_IMAGE_SIZE?.trim() || DEFAULT_SIZE;
  const timeoutMs = Number(process.env.COMPOSE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(req) },
          { inline_data: { mime_type: req.person.mimeType, data: req.person.data } },
          { inline_data: { mime_type: req.product.mimeType, data: req.product.data } },
          { inline_data: { mime_type: req.scene.mimeType, data: req.scene.data } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: req.aspect, imageSize },
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  let sentMs = 0;

  let json: ApiResponse;
  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    sentMs = Date.now() - started;

    const text = await res.text();
    try {
      json = JSON.parse(text) as ApiResponse;
    } catch {
      throw new ComposeError(
        `Üretim tamamlanamadı (HTTP ${res.status}). Tekrar deneyin.`,
      );
    }

    if (!res.ok || json.error) {
      const detail = json.error?.message ?? `HTTP ${res.status}`;
      console.error("Sağlayıcı hatası:", {
        status: res.status,
        code: json.error?.code,
        apiStatus: json.error?.status,
        message: detail.slice(0, 300),
      });
      throw new ComposeError(explainProviderError(res.status, detail, model), detail);
    }
  } catch (cause) {
    if (cause instanceof ComposeError) throw cause;
    const aborted = cause instanceof Error && cause.name === "AbortError";
    const reach = await probeReachability(apiKey);
    console.error("Sağlayıcı çağrısı başarısız:", {
      aborted,
      ms: Date.now() - started,
      yoklama: reach,
      message: cause instanceof Error ? cause.message : String(cause),
    });
    // Yoklama sonucu YALNIZCA günlüğe (yukarıda). Kullanıcıya iç ağ
    // teşhisi göstermenin ona faydası yok; kök neden bulunduğunda
    // ekrandan kaldırmayı unutmuşuz.
    throw new ComposeError(
      aborted
        ? `Üretim ${Math.round(timeoutMs / 1000)} saniye içinde tamamlanmadı. Tekrar deneyin.`
        : "Üretim şu anda yanıt vermiyor. Birazdan tekrar deneyin.",
      cause,
    );
  } finally {
    clearTimeout(timer);
  }

  const candidate = json.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const image = parts.find((p) => p.inlineData?.data)?.inlineData;

  if (!image?.data) {
    // Teşhis için sunucu günlüğüne özet bırak (görsel verisi yazılmaz).
    console.error("Görsel gelmedi:", {
      model,
      finishReason: candidate?.finishReason,
      blockReason: json.promptFeedback?.blockReason,
      partKinds: parts.map((p) => (p.text ? "text" : p.inlineData ? "image" : "other")),
      ms: Date.now() - started,
    });

    const blocked = json.promptFeedback?.blockReason;
    if (blocked) {
      throw new ComposeError(
        `İstek güvenlik denetimine takıldı (${blocked}). Başka bir fotoğrafla deneyin.`,
      );
    }

    const reason = candidate?.finishReason ?? "";
    if (reason === "IMAGE_SAFETY" || reason === "SAFETY" || reason === "PROHIBITED_CONTENT") {
      throw new ComposeError(
        "İstek güvenlik denetimine takıldı. Bu genelde tanınmış bir kişiye benzeyen ya da " +
          "az giysili bir fotoğrafta olur. Farklı bir kişi fotoğrafı deneyin.",
      );
    }
    if (reason === "RECITATION") {
      throw new ComposeError(
        "Model, telif korumalı bir içeriğe fazla benzediği için üretimi durdurdu. Başka bir görselle deneyin.",
      );
    }

    const text = parts.find((p) => p.text)?.text;
    throw new ComposeError(
      text
        ? `Model görsel yerine metin döndürdü: ${text.slice(0, 180)}`
        : `Model bu istekte görsel üretmedi${reason ? ` (${reason})` : ""}. Tekrar deneyin.`,
    );
  }

  const ms = Date.now() - started;
  console.log("Kompozisyon üretildi:", { model, ms, aktarimMs: sentMs, boyutKB: Math.round(image.data.length / 1024) });

  return {
    mimeType: image.mimeType ?? "image/png",
    data: image.data,
    model,
    ms,
  };
}

/**
 * Küçük bir istekle sağlayıcıya erişimi ölçer. Üretim çağrısı takıldığında
 * sorunun genel bağlantı mı yoksa üretim isteğine özgü mü olduğunu ayırt eder.
 * Sonuç hata metnine iliştirilir; gizli bilgi taşımaz.
 */
async function probeReachability(apiKey: string): Promise<string> {
  const [google, neutral] = await Promise.all([
    timedFetch("google", `${ENDPOINT}?pageSize=1`, { "x-goog-api-key": apiKey }),
    // Google dışı bir adres: sorun sağlayıcıya mı özgü, yoksa çıkış yolu
    // genel olarak mı bozuk — ayırmak için.
    timedFetch("notr", "https://api.github.com/zen"),
  ]);
  return `${google} · ${neutral}`;
}

async function timedFetch(label: string, url: string, headers?: Record<string, string>): Promise<string> {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    return `${label} HTTP ${res.status} · ${Date.now() - started} ms`;
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    return `${label} basarisiz (${name}) · ${Date.now() - started} ms`;
  }
}

/**
 * Sağlayıcı hatalarını kullanıcının anlayacağı tek cümleye indirger.
 *
 * BU METİN ZİYARETÇİYE GÖSTERİLİYOR (compose-studio.tsx, job.error). Bu
 * yüzden içinde altyapı sağlayıcısının adı, model kimliği ya da ortam
 * değişkeni adı GEÇMEZ. Teşhis için gereken her şey çağrı yerinde
 * console.error ile günlüğe yazılıyor ve ComposeError'ın cause'unda duruyor.
 *
 * Ayrım şu: müşterinin yapabileceği bir şey varsa (bekle, tekrar dene)
 * söylüyoruz; operatör sorunuysa tek bir nötr cümle veriyoruz — çünkü
 * müşteri anahtarı ya da faturalandırmayı düzeltemez.
 */
function explainProviderError(status: number, detail: string, _model: string): string {
  const lower = detail.toLowerCase();

  if (status === 429 || lower.includes("quota") || lower.includes("resource_exhausted")) {
    return "Şu anda yoğunluk var. Bir dakika sonra tekrar deneyin.";
  }
  if (status >= 500) {
    return "Üretim geçici olarak yanıt vermiyor. Birazdan tekrar deneyin.";
  }
  /* 401/403/anahtar, faturalandırma, 404 model ve geri kalan her şey:
     hepsi operatör tarafı. Ham sağlayıcı metnini yansıtmıyoruz. */
  return "Üretim şu anda kullanılamıyor. Kısa süre sonra tekrar deneyin.";
}
