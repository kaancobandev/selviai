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

/* ------------------------------------------------------------------
   İLHAM AKIŞI

   Bu sabitler prompt.ts'te değil BURADA duruyor: prompt.ts zaten
   types.ts'ten tip alıyor, tersi de olsaydı döngüsel bağımlılık
   çıkardı. types dosyası yaprak kalmalı.
   ------------------------------------------------------------------ */

/** Dört ilham karesinin her biri farklı bir eksenden yaklaşıyor. */
export const ILHAM_EKSENLERI = ["siluet", "malzeme", "renk", "baglam"] as const;
export type IlhamEkseni = (typeof ILHAM_EKSENLERI)[number];

/** Bugün yalnız "moda"; otomotiv ve yat sonra eklenecek. */
export const ILHAM_KATEGORILERI = ["moda"] as const;
export type IlhamKategori = (typeof ILHAM_KATEGORILERI)[number];

/** Seçilen kareden türetilenler. */
export const TURETILMIS_TURLER = ["moodboard", "kumas", "branding"] as const;
export type TuretilmisTur = (typeof TURETILMIS_TURLER)[number];

/**
 * İş modu. Eskiden tek mod vardı ve kayıtta hiç yazmıyordu; alan
 * İSTEĞE BAĞLI çünkü yayındaki eski iş kayıtlarında yok — okunurken
 * boşsa "kompozisyon" sayılıyor.
 */
export type IsModu = "kompozisyon" | "ilham" | "turetilmis";

/** Metinden dört kare üretimi — girdi görseli yok. */
export type IlhamInput = {
  metin: string;
  kategori: IlhamKategori;
  aspect: Aspect;
};

/**
 * Seçilen kareden türetilenler — TEK İŞ, ÇOK ÇIKTI.
 *
 * Üçünü ayrı iş yapmak doğal görünüyordu ama oturum kilidine çarpıyor:
 * `/api/compose` aynı oturumda süren iş varken 429 dönüyor, yani ikinci
 * ve üçüncü türetme reddedilirdi. Tek işte üç kare üretmek hem kilidi
 * hem üç ayrı yoklama döngüsünü ortadan kaldırıyor.
 */
export type TuretilmisInput = {
  turler: TuretilmisTur[];
  metin: string;
  /** Referans karenin kovadaki yolu — model buna bakarak türetiyor. */
  kaynakYol: string;
  aspect: Aspect;
};

/**
 * Çok çıktılı işlerin tek bir karesi. Kompozisyon işleri tek kare
 * ürettiği için `imagePath` alanını kullanmaya devam ediyor; ilham
 * işlerinde onun yerine bu dizi doluyor.
 */
export type JobKare = {
  /** Hangi eksenden/türden geldiği — arayüz bunu etiket olarak gösteriyor. */
  eksen: IlhamEkseni | TuretilmisTur;
  /** Kovadaki yol. Depo kapalıysa boş kalır ve dataUrl dolar. */
  imagePath?: string;
  dataUrl?: string;
  model: string;
  ms: number;
};

/**
 * ÇALIŞMA — ana sayfadaki akışın stüdyoya taşınan hâli.
 *
 * Ana sayfa İKİ iş üretiyor (dört ilham karesi, sonra seçilenden üç
 * türetilmiş çıktı) ve stüdyonun ikisine de ihtiyacı var. Tek tek iş
 * kimliği taşımak yerine oturum başına tek bir kayıt tutuluyor: en son
 * üzerinde çalışılan set.
 *
 * URL parametresi TERCİH EDİLMEDİ. `?fikir=` zaten öyle denenmiş ve ölü
 * kalmıştı; ayrıca stüdyoda altı ayrı rota var, her birine parametre
 * iliştirmek altı yerde tutarlılık demek. Oturum kaydı tek kaynak.
 */
export type Calisma = {
  brief: string;
  ilhamIs: string;
  /** Dört kareden hangisinin seçildiği. */
  secilenSira: number;
  /** Türetilmiş çıktıların işi; henüz bitmediyse boş. */
  turetIs?: string;
  guncellendi: string;
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
  /** Boşsa "kompozisyon" — yayındaki eski kayıtlarda bu alan yok. */
  mod?: IsModu;
  ilham?: IlhamInput;
  turetilmis?: TuretilmisInput;
  /** Çok çıktılı işlerde kareler; kompozisyonda boş kalır. */
  kareler?: JobKare[];
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
/** İstemciye dönen tek kare — kovadaki yol DEĞİL, kendi ucumuz. */
export type JobKareView = {
  eksen: IlhamEkseni | TuretilmisTur;
  /** `/api/kare/<isId>/<sira>` — kova özel, yol dışarı verilmiyor. */
  url?: string;
  dataUrl?: string;
};

export type JobView = Omit<
  Job,
  "request" | "imagePath" | "meta" | "kareler" | "ilham" | "turetilmis"
> & {
  resultUrl?: string;
  kareler?: JobKareView[];
  /** Arayüz istekleri geri gösterebilsin diye yalnız METİN taşınıyor. */
  istek?: string;
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
    mod: job.mod,
    /* Kareler sıraya göre adreslenıyor: kovadaki yol istemciye HİÇ
       gitmiyor, çünkü kova özel ve yetki kontrolü tek yerde kalmalı. */
    kareler: job.kareler?.map((k, i) => ({
      eksen: k.eksen,
      url: k.imagePath ? `/api/kare/${job.id}/${i}` : undefined,
      dataUrl: k.dataUrl,
    })),
    istek: job.ilham?.metin ?? job.turetilmis?.metin,
    meta: job.meta && {
      model: job.meta.model,
      ms: job.meta.ms,
      kabul: job.meta.kabul,
      deneme: job.meta.deneme,
    },
  };
}
