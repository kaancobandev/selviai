import { GoogleGenAI } from "@google/genai";
import { buildPrompt } from "./prompt";
import type { ComposeRequest } from "./types";

/* ------------------------------------------------------------------
   Sağlayıcı katmanı — tek giriş noktası.
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

export function composeModel(): string {
  return process.env.COMPOSE_MODEL?.trim() || DEFAULT_MODEL;
}

export async function generateComposite(req: ComposeRequest): Promise<ComposeResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ComposeError(
      "Sunucuda GEMINI_API_KEY tanımlı değil. .env.local dosyasına anahtarı ekleyip sunucuyu yeniden başlatın.",
    );
  }

  const model = composeModel();
  const imageSize = process.env.COMPOSE_IMAGE_SIZE?.trim() || DEFAULT_SIZE;
  const ai = new GoogleGenAI({ apiKey });
  const started = Date.now();

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: buildPrompt(req) },
            { inlineData: { mimeType: req.person.mimeType, data: req.person.data } },
            { inlineData: { mimeType: req.product.mimeType, data: req.product.data } },
            { inlineData: { mimeType: req.scene.mimeType, data: req.scene.data } },
          ],
        },
      ],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: req.aspect, imageSize },
      },
    });
  } catch (cause) {
    console.error("Sağlayıcı çağrısı başarısız:", cause);
    throw new ComposeError(explainProviderError(cause), cause);
  }

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const image = parts.find((p) => p.inlineData?.data)?.inlineData;

  if (!image?.data) {
    // Teşhis için sunucu günlüğüne özet bırak (görsel verisi yazılmaz).
    console.error("Görsel gelmedi:", {
      model,
      finishReason: candidate?.finishReason,
      blockReason: response.promptFeedback?.blockReason,
      partKinds: parts.map((p) => (p.text ? "text" : p.inlineData ? "image" : "other")),
    });

    const blocked = response.promptFeedback?.blockReason;
    if (blocked) {
      throw new ComposeError(
        `Model isteği güvenlik nedeniyle reddetti (${blocked}). Başka bir fotoğrafla deneyin.`,
      );
    }

    const reason = String(candidate?.finishReason ?? "");
    if (reason === "IMAGE_SAFETY" || reason === "SAFETY" || reason === "PROHIBITED_CONTENT") {
      throw new ComposeError(
        "Model güvenlik filtresine takıldı. Bu genelde tanınmış bir kişiye benzeyen ya da " +
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

  return {
    mimeType: image.mimeType ?? "image/png",
    data: image.data,
    model,
    ms: Date.now() - started,
  };
}

/** Sağlayıcı hatalarını kullanıcının anlayacağı tek cümleye indirger. */
function explainProviderError(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause);
  const lower = raw.toLowerCase();

  if (lower.includes("api key") || lower.includes("api_key_invalid") || lower.includes("401")) {
    return "API anahtarı geçersiz. Google AI Studio'da anahtarı kontrol edin.";
  }
  if (lower.includes("quota") || lower.includes("resource_exhausted") || lower.includes("429")) {
    return "Kota doldu ya da istek hızı aşıldı. Bir dakika sonra tekrar deneyin.";
  }
  if (lower.includes("billing") || lower.includes("free tier") || lower.includes("permission")) {
    return "Bu model faturalandırma açık bir proje gerektiriyor. Google AI Studio'da faturalandırmayı etkinleştirin.";
  }
  if (lower.includes("not found") || lower.includes("404")) {
    return `Model bulunamadı (${composeModel()}). COMPOSE_MODEL değerini kontrol edin.`;
  }
  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("fetch failed")) {
    return "Sağlayıcıya ulaşılamadı. Bağlantıyı kontrol edip tekrar deneyin.";
  }
  return `Üretim başarısız: ${raw.slice(0, 200)}`;
}
