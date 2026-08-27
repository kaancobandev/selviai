/* ------------------------------------------------------------------
   Kompozisyon motoru — paylaşılan tipler.
   Bu klasörde `@/` takma adı KULLANILMAZ: Netlify arka plan fonksiyonu
   bu dosyaları doğrudan paketler ve takma adı çözemez.
   ------------------------------------------------------------------ */

export const CROPS = ["portre", "yarim", "tam", "detay"] as const;
export const PLACEMENTS = ["boyun", "kulak", "bilek", "el", "govde"] as const;
export const LIGHTINGS = ["sahne", "studyo", "altin", "gece"] as const;
export const ASPECTS = ["3:4", "4:5", "1:1", "16:9"] as const;

export type Crop = (typeof CROPS)[number];
export type Placement = (typeof PLACEMENTS)[number];
export type Lighting = (typeof LIGHTINGS)[number];
export type Aspect = (typeof ASPECTS)[number];

/** Tek bir görsel girdisi — base64 gövde, MIME tipiyle birlikte. */
export type ImageInput = {
  mimeType: string;
  /** base64, veri öneki olmadan */
  data: string;
};

export type ComposeRequest = {
  person: ImageInput;
  product: ImageInput;
  scene: ImageInput;
  crop: Crop;
  placement: Placement;
  lighting: Lighting;
  aspect: Aspect;
  /** Kullanıcının serbest notu — isteğe bağlı, prompt'un sonuna eklenir */
  note?: string;
};

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type Job = {
  id: string;
  status: JobStatus;
  createdAt: string;
  completedAt?: string;
  /** Kullanıcıya gösterilecek hata metni (Türkçe) */
  error?: string;
  request?: ComposeRequest;
  /** Sonuç: data URL. Faz 3'te kalıcı depoya taşınacak. */
  resultDataUrl?: string;
  meta?: { model: string; ms: number };
};

/** İstemciye dönen hafif kayıt — girdi görselleri gönderilmez. */
export type JobView = Omit<Job, "request">;

export function toJobView(job: Job): JobView {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    error: job.error,
    resultDataUrl: job.resultDataUrl,
    meta: job.meta,
  };
}
