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
  /** Son tamamlanan adım — takılan işlerde teşhis için */
  step?: string;
  /** Her yazmada tazelenir; bekçi bunun eskimesine bakar */
  updatedAt?: string;
  request?: ComposeRequest;
  /**
   * Sonuç: data URL. Yalnızca kalıcı depo kapalıyken doldurulur —
   * yarım megabaytlık veriyi iş kaydında taşımak pahalı ve geçici.
   */
  resultDataUrl?: string;
  /** Kalıcı depodaki dosya yolu (Supabase Storage). */
  imagePath?: string;
  /** Anonim tarayıcı oturumu; galeriyi kapsamlamak için taşınır. */
  sessionId?: string;
  meta?: JobMeta;
};

/** Tek bir üretim denemesinin özeti. */
export type Attempt = {
  model: string;
  ms: number;
  /** Kabul kapısından geçti mi; kapı kapalıysa ya da hakem çökerse null */
  kabul: boolean | null;
  /** Ağırlıklı hakem puanı — denemeler arasında en iyisini seçmek için */
  puan?: number;
  /** Hakemin tek cümlelik gerekçesi */
  gerekce?: string;
  /** Üretim hiç görsel döndürmediyse sebebi */
  hata?: string;
};

export type JobMeta = {
  model: string;
  ms: number;
  /** Kapıdan geçen bir kare bulunabildi mi */
  kabul?: boolean | null;
  /** Kaçıncı denemede sonuca varıldı (1 tabanlı) */
  deneme?: number;
  denemeler?: Attempt[];
};

/**
 * İstemciye dönen hafif kayıt — girdi görselleri ve depo yolu gönderilmez.
 * Görsel, kalıcı depodaysa kendi ucumuzdan servis edilir: kova özeldir,
 * imzalı URL'in süresi dolmaz, yetki kontrolü tek yerde kalır.
 */
export type JobView = Omit<Job, "request" | "imagePath"> & { resultUrl?: string };

export function toJobView(job: Job): JobView {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    error: job.error,
    step: job.step,
    updatedAt: job.updatedAt,
    resultDataUrl: job.resultDataUrl,
    resultUrl: job.imagePath ? `/api/kare/${job.id}` : undefined,
    meta: job.meta,
  };
}
