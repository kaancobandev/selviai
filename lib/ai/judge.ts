import type { ComposeRequest } from "./types";

/* ------------------------------------------------------------------
   Kabul kapısı — üretilen kareyi kullanıcıya göstermeden önce puanlar.

   Görsel ÜRETEN değil, görsel OKUYAN bir model kullanılır: kare başına
   maliyeti üretimin yüzde biri kadar, gecikmesi birkaç saniye. Ölçütler
   Faz 2'deki skor kartıyla birebir aynı (scripts/olcum/altin-set.mjs) —
   hakem farklı bir şeye bakarsa kapı ölçümle bağını kaybeder.

   Eşikler 30 etiketli kare üzerinde seçildi (scripts/olcum/hakem.mjs):

     eşik (ürün/anatomi)   insanla uyum   yanlış kabul   yanlış ret
       4 / 4                    %60             1            11
       4 / 3                    %73             1             7   ← seçilen
       4 / 2                    %83             3             2

   Hakem ürün sadakatinde iyi ayarlı (sapma 0,67 · eğilim 0,00) ama
   anatomide insandan 0,80 puan daha sert. Eşik bunu telafi ediyor.
   4/2'ye inmek uyumu artırıyor ama yanlış kabulü üçe katlıyor — kapının
   varlık sebebi tam da onu engellemek, o yüzden alınmadı.
   ------------------------------------------------------------------ */

export type Verdict = {
  urun: number;
  kimlik: number | null;
  anatomi: number;
  isik: number;
  sahne: number;
  /** Zorunlu eşiklerin ikisi de geçildi mi */
  kabul: boolean;
  /** Tek cümlelik gerekçe — kullanıcıya değil, günlüğe ve teşhise */
  gerekce: string;
  model: string;
  ms: number;
};

const DEFAULT_JUDGE = "gemini-3.1-flash-lite";
const ESIK_URUN = 4;
const ESIK_ANATOMI = 3;
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 45_000;

export function judgeModel(): string {
  return process.env.COMPOSE_JUDGE_MODEL?.trim() || DEFAULT_JUDGE;
}

export function qualityGateEnabled(): boolean {
  return process.env.COMPOSE_QUALITY_GATE !== "0";
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    urun: { type: "INTEGER", description: "0-5 product fidelity" },
    yuzGorunuyor: { type: "BOOLEAN", description: "is the face visible enough to judge identity" },
    kimlik: { type: "INTEGER", description: "0-5 identity preservation, 0 if face not visible" },
    anatomi: { type: "INTEGER", description: "0-5 anatomy and placement" },
    isik: { type: "INTEGER", description: "0-5 lighting match" },
    sahne: { type: "INTEGER", description: "0-5 scene integrity" },
    gerekce: { type: "STRING", description: "one short sentence, Turkish, naming the weakest point" },
  },
  required: ["urun", "yuzGorunuyor", "kimlik", "anatomi", "isik", "sahne", "gerekce"],
} as const;

const RUBRIC = `You are a strict quality controller for an e-commerce fashion image pipeline.
You see four images: [1] the PERSON reference, [2] the PRODUCT reference,
[3] the SCENE reference, and [4] the GENERATED composite that must be graded.

Grade image 4 against images 1-3 on five criteria, each 0-5:

  urun     PRODUCT FIDELITY. Compare against image 2 detail by detail: stone
           count and cut, metal colour, silhouette, proportions, prints, seams,
           logos, hardware. A product that has been "beautified", simplified or
           partly dropped scores 2. Only an exact reproduction scores 5.
  kimlik   IDENTITY. Is the person in image 4 recognisably the person in image 1
           (bone structure, skin tone, hairline)? If the face is cropped out or
           too small to judge, set yuzGorunuyor=false and kimlik=0.
  anatomi  ANATOMY AND PLACEMENT. Hands and fingers correct, product sitting at
           the right spot at a believable scale, requested framing respected.
           Fused fingers, extra limbs, a product welded to the body, or framing
           that ignores the brief all score 2 or below.
  isik     LIGHTING. Shadow direction, colour temperature and reflections
           consistent between subject, product and scene.
  sahne    SCENE INTEGRITY. Cut-out edges, perspective, background not replaced
           by something else.

Be harsh. This gate exists to stop bad frames reaching a paying customer;
a generous score costs more than a strict one. Do not explain your reasoning,
just fill the fields. Write "gerekce" in Turkish, one sentence, naming the
weakest point.`;

type Api = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
};

export async function judgeComposite(
  req: ComposeRequest,
  sonuc: { mimeType: string; data: string },
): Promise<Verdict | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = judgeModel();
  const started = Date.now();

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: `${RUBRIC}\n\nRequested framing: ${req.crop}. Requested placement: ${req.placement}. Requested lighting: ${req.lighting}.` },
          { inline_data: { mime_type: req.person.mimeType, data: req.person.data } },
          { inline_data: { mime_type: req.product.mimeType, data: req.product.data } },
          { inline_data: { mime_type: req.scene.mimeType, data: req.scene.data } },
          { inline_data: { mime_type: sonuc.mimeType, data: sonuc.data } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0,
    },
  };

  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json()) as Api;
    if (!res.ok || json.error) {
      console.error("Hakem hatası:", json.error?.message ?? `HTTP ${res.status}`);
      return null;
    }
    const metin = json.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
    if (!metin) return null;

    const ham = JSON.parse(metin) as Record<string, unknown>;
    const puan = (k: string) => {
      const v = Number(ham[k]);
      return Number.isFinite(v) ? Math.max(0, Math.min(5, Math.round(v))) : 0;
    };
    const yuzVar = ham.yuzGorunuyor === true;

    const verdict: Verdict = {
      urun: puan("urun"),
      kimlik: yuzVar ? puan("kimlik") : null,
      anatomi: puan("anatomi"),
      isik: puan("isik"),
      sahne: puan("sahne"),
      kabul: false,
      gerekce: typeof ham.gerekce === "string" ? ham.gerekce.slice(0, 200) : "",
      model,
      ms: Date.now() - started,
    };
    verdict.kabul = verdict.urun >= esik("URUN", ESIK_URUN) && verdict.anatomi >= esik("ANATOMI", ESIK_ANATOMI);
    return verdict;
  } catch (error) {
    // Hakem çökerse üretimi engellemeyiz: kapı isteğe bağlı bir iyileştirme,
    // zorunlu bir bağımlılık değil.
    console.error("Hakem çağrısı başarısız:", error instanceof Error ? error.message : error);
    return null;
  }
}

function esik(ad: string, varsayilan: number): number {
  const v = Number(process.env[`COMPOSE_ESIK_${ad}`]);
  return Number.isFinite(v) && v >= 0 && v <= 5 ? v : varsayilan;
}

/** Ağırlıklı puan — iki aday kare arasında seçim yapmak için. */
export function agirlikliPuan(v: Verdict): number {
  const kalemler: [number | null, number][] = [
    [v.urun, 3], [v.kimlik, 2], [v.anatomi, 2], [v.isik, 1], [v.sahne, 1],
  ];
  let toplam = 0, agirlik = 0;
  for (const [puan, w] of kalemler) {
    if (puan == null) continue;
    toplam += puan * w;
    agirlik += w;
  }
  return agirlik ? toplam / agirlik : 0;
}
