import { apiAnahtari, type Katman } from "./anahtar";

/* ------------------------------------------------------------------
   METİN ÜRETİMİ — arama temellendirmeli.

   NEDEN AYRI DOSYA. `gemini.ts` görsel üretimi için yazılmış ve metni
   HATA sayıyor: `responseModalities: ["IMAGE"]` gönderiyor, model metin
   döndürünce "Model görsel yerine metin döndürdü" diye reddediyor. Aynı
   dosyaya ikinci bir mod sıkıştırmak o mantığı delik deşik ederdi.

   NEDEN ARAMA TEMELLENDİRMESİ. Kültür analizi iddia üretiyor ("bu yön
   şu akımdan besleniyor"). Temellendirmesiz bir dil modeli bu iddiaları
   kendinden emin biçimde UYDURUR ve uydurma kaynakça yazar. Arama açık
   olduğunda model gerçek sayfalara bakıp yanıtla birlikte alıntı
   döndürüyor.

   PROMPT'A LİNK YAZMAK YETMEZ — bu tuzağa düşülmemeli. Model prompt'taki
   URL'i AÇMAZ, yalnız metnini görür ve içeriğini hafızasından uydurur;
   sonuç kaynaklı GÖRÜNEN ama kaynaksız bir metindir. Gerçekten açması
   için `url_context` aracı gerekiyor (istek başına en çok 20 URL, yalnız
   herkese açık sayfalar). Bu yüzden kürasyon listesi burada KAYNAK
   olarak değil YÖNLENDİRME olarak veriliyor.

   YANIT ŞEKLİ CANLIDAN ÖĞRENİLİYOR. Google'ın belgelerinde
   `generateContent` için temellendirme meta verisinin alan düzeyinde
   şeması net değil (Interactions API'yi anlatıyorlar). Şekli tahmin edip
   alıntıların sessizce boş çıkmasını göze almak yerine ayrıştırma
   HOŞGÖRÜLÜ yazıldı ve alıntı bulunamazsa ham meta veri günlüğe
   basılıyor — bir kez gerçek yanıt görülünce burası daraltılabilir.
   ------------------------------------------------------------------ */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.8-flash";
const DEFAULT_TIMEOUT_MS = 90_000;

export class MetinError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string, cause?: unknown) {
    super(userMessage, { cause });
    this.name = "MetinError";
    this.userMessage = userMessage;
  }
}

/** Yanıtta gösterilecek kaynak. */
export type Kaynak = { baslik: string; adres: string };

export type MetinSonuc = {
  metin: string;
  kaynaklar: Kaynak[];
  /** Modelin gerçekten arama yapıp yapmadığı — arayüz bunu dürüstçe söylüyor. */
  aramaSorgulari: string[];
  model: string;
  ms: number;
};

export function metinModeli(): string {
  return process.env.KULTUR_MODEL?.trim() || DEFAULT_MODEL;
}

type Parca = { text?: string };
type Aday = {
  content?: { parts?: Parca[] };
  finishReason?: string;
  groundingMetadata?: unknown;
};
type Yanit = {
  candidates?: Aday[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; status?: string; message?: string };
};

export async function metinUret(
  prompt: string,
  secenek?: { modelAdi?: string; katman?: Katman },
): Promise<MetinSonuc> {
  const apiKey = apiAnahtari(secenek?.katman);
  if (!apiKey) {
    console.error("Sağlayıcı anahtarı tanımlı değil (GEMINI_API_KEY).");
    throw new MetinError("Analiz şu anda kullanılamıyor. Kısa süre sonra tekrar deneyin.");
  }

  const model = secenek?.modelAdi?.trim() || metinModeli();
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    /* Arama aracı. `responseModalities` BİLEREK verilmiyor: metin
       istiyoruz ve görsel modunu miras almak istemiyoruz. */
    tools: [{ google_search: {} }],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const basladi = Date.now();

  let json: Yanit;
  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const ham = await res.text();
    try {
      json = JSON.parse(ham) as Yanit;
    } catch {
      throw new MetinError(`Analiz tamamlanamadı (HTTP ${res.status}). Tekrar deneyin.`);
    }
    if (!res.ok || json.error) {
      const detay = json.error?.message ?? `HTTP ${res.status}`;
      console.error("Metin sağlayıcı hatası:", {
        status: res.status,
        apiStatus: json.error?.status,
        message: detay.slice(0, 300),
      });
      /* Arama aracı desteklenmiyorsa bunu AÇIKÇA söylüyoruz: sessizce
         temellendirmesiz üretime düşmek, tam da kaçındığımız şey.

         Eşleşme DAR tutuldu. İlk yazımda `not supported` de aranıyordu
         ve "model bulunamadı" hatasını (mesajı "is not supported for
         generateContent" içeriyor) araç hatası sanıp yanlış teşhis
         koydurdu — gerçek sebep yanlış model adıydı. */
      if (/google_search|url_context/i.test(detay)) {
        throw new MetinError(
          "Arama temellendirmesi bu modelde açılamadı. Kaynaksız analiz üretmiyoruz.",
          detay,
        );
      }
      throw new MetinError("Analiz şu anda tamamlanamadı. Birazdan tekrar deneyin.", detay);
    }
  } catch (cause) {
    if (cause instanceof MetinError) throw cause;
    const kesildi = cause instanceof Error && cause.name === "AbortError";
    console.error("Metin çağrısı başarısız:", {
      kesildi,
      ms: Date.now() - basladi,
      message: cause instanceof Error ? cause.message : String(cause),
    });
    throw new MetinError(
      kesildi
        ? "Analiz zaman aşımına uğradı. Tekrar deneyin."
        : "Analiz servisi yanıt vermiyor. Birazdan tekrar deneyin.",
      cause,
    );
  } finally {
    clearTimeout(timer);
  }

  const aday = json.candidates?.[0];
  const metin = (aday?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!metin) {
    console.error("Metin gelmedi:", {
      model,
      finishReason: aday?.finishReason,
      blockReason: json.promptFeedback?.blockReason,
    });
    throw new MetinError("Model bu istekte analiz üretmedi. İsteği yeniden yazıp deneyin.");
  }

  const { kaynaklar, sorgular } = temellendirmeyiCoz(aday?.groundingMetadata, model);

  return { metin, kaynaklar, aramaSorgulari: sorgular, model, ms: Date.now() - basladi };
}

/**
 * Temellendirme meta verisini HOŞGÖRÜLÜ ayrıştırır.
 *
 * İki olası biçim de deneniyor (`groundingChunks[].web` ve düz
 * `uri`/`title`), çünkü şema belgede alan düzeyinde doğrulanamadı. Hiç
 * kaynak çıkmazsa ham meta veri günlüğe basılıyor: bu araç kaynaksız
 * çalışmamalı, sessizce boş dönmesi teşhis edilebilir olmalı.
 *
 * CANLIDA GÖRÜLEN ŞEKİL (gemini-3.8-flash): `groundingChunks[].web`
 * çalışıyor, ama `uri` GERÇEK KAYNAK ADRESİ DEĞİL — Google'ın
 * yönlendirme sarmalayıcısı (`vertexaisearch.cloud.google.com/
 * grounding-api-redirect/...`). Gerçek alan adı `title` alanında
 * geliyor (örn. "dergipark.org.tr"). Arayüz bu yüzden başlığı öne
 * çıkarmalı: ham adres kullanıcıya hiçbir şey anlatmıyor.
 */
function temellendirmeyiCoz(
  meta: unknown,
  model: string,
): { kaynaklar: Kaynak[]; sorgular: string[] } {
  const m = (meta ?? {}) as Record<string, unknown>;
  const parcalar = (m.groundingChunks ?? m.grounding_chunks ?? []) as unknown[];
  const sorgular = ((m.webSearchQueries ?? m.web_search_queries ?? []) as unknown[]).filter(
    (s): s is string => typeof s === "string",
  );

  const kaynaklar: Kaynak[] = [];
  const gorulen = new Set<string>();
  for (const p of parcalar) {
    const kayit = (p ?? {}) as Record<string, unknown>;
    const web = (kayit.web ?? kayit) as Record<string, unknown>;
    const adres = typeof web.uri === "string" ? web.uri : undefined;
    if (!adres || gorulen.has(adres)) continue;
    gorulen.add(adres);
    kaynaklar.push({
      adres,
      baslik: typeof web.title === "string" && web.title ? web.title : yeniAlanAdi(adres),
    });
  }

  if (!kaynaklar.length) {
    console.error("Temellendirme kaynağı çözülemedi:", {
      model,
      anahtarlar: Object.keys(m),
      ham: JSON.stringify(meta ?? null).slice(0, 1200),
    });
  }
  return { kaynaklar, sorgular };
}

function yeniAlanAdi(adres: string): string {
  try {
    return new URL(adres).hostname.replace(/^www\./, "");
  } catch {
    return adres;
  }
}
