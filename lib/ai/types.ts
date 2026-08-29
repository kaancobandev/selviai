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
/** Baytları elde olan görsel — model katmanı bunu ister. */
export type ImageInput = {
  mimeType: string;
  /** base64, veri öneki olmadan */
  data: string;
};

/**
 * Depoya doğrudan yüklenmiş görsel. İstemci baytları API gövdesinden
 * geçirmek yerine imzalı adrese yükler; istek yalnızca yolu taşır.
 */
export type ImageRef = {
  mimeType: string;
  /** `inputs` kovasındaki yol */
  path: string;
};

export type ImageSource = ImageInput | ImageRef;

export function isRef(k: ImageSource): k is ImageRef {
  return typeof (k as ImageRef).path === "string";
}

/** Parametreler — iki istek biçiminde de ortak. */
export type ComposeParams = {
  crop: Crop;
  placement: Placement;
  lighting: Lighting;
  aspect: Aspect;
  /** Kullanıcının serbest notu — isteğe bağlı, prompt'un sonuna eklenir */
  note?: string;
};

/** Model katmanına giden istek: baytlar hazır. */
export type ComposeRequest = ComposeParams & {
  person: ImageInput;
  product: ImageInput;
  scene: ImageInput;
};

/**
 * API'ye gelen ve iş kaydında duran istek. Görseller ya doğrudan
 * gövdede (eski yol) ya da depodaki yollarıyla (imzalı yükleme) gelir.
 * İkincisinde iş kaydı yarım megabayt yerine birkaç yüz bayt tutar.
 */
export type ComposeInput = ComposeParams & {
  person: ImageSource;
  product: ImageSource;
  scene: ImageSource;
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
  request?: ComposeInput;
  /**
   * Sonuç: data URL. Yalnızca kalıcı depo kapalıyken doldurulur —
   * yarım megabaytlık veriyi iş kaydında taşımak pahalı ve geçici.
   */
  resultDataUrl?: string;
  /** Kalıcı depodaki dosya yolu (Supabase Storage). */
  imagePath?: string;
  /** Anonim tarayıcı oturumu; galeriyi kapsamlamak için taşınır. */
  sessionId?: string;
  /**
   * Hangi Google projesinde üretilecek. Bugün her üretim anonim ve
   * ücretsiz; kredi geldiğinde ödeyen işler "odeyen" olarak işaretlenecek.
   */
  katman?: "ucretsiz" | "odeyen";
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
export type JobView = Omit<Job, "request" | "imagePath" | "meta"> & {
  resultUrl?: string;
  /**
   * Arayüzün ihtiyaç duyduğu kadarı. `denemeler` KASTEN dışarıda:
   * her deneme hakemin kişi ve kıyafet hakkındaki değerlendirmesini
   * (`gerekce`) taşıyor ve bu uç yetkisiz. Tam kayıt sunucuda kalır.
   */
  meta?: Pick<JobMeta, "model" | "ms" | "kabul" | "deneme">;
};

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
    meta: job.meta && {
      model: job.meta.model,
      ms: job.meta.ms,
      kabul: job.meta.kabul,
      deneme: job.meta.deneme,
    },
  };
}
