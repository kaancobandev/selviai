import type { Calisma, Job } from "./types";

/* ------------------------------------------------------------------
   İş kaydı — iki arka uç:
   · Sunucuda → Netlify Blobs. Route handler ile arka plan fonksiyonu
     AYRI süreçlerde çalışır; paylaşılan bir depo şart.
   · Yerelde  → süreç içi Map (next dev tek süreçtir).

   Seçim NODE_ENV'e göre yapılır. Ortam bayrağına (NETLIFY) bakmak
   yanlıştı: o bayrak Next.js çalışma zamanında tanımlı değil, bu yüzden
   route handler belleğe, arka plan fonksiyonu Blobs'a yazıyordu — iki
   taraf birbirinin kaydını hiç görmedi.

   Faz 3'te Postgres'e taşınacak; kredi hareketi ilişkisel olmalı.
   ------------------------------------------------------------------ */

const STORE_NAME = "compose-jobs";

type Store = {
  get(key: string, opts: { type: "json" }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<unknown>;
  delete(key: string): Promise<unknown>;
};

declare global {
  var __composeJobs: Map<string, Job> | undefined;
  var __composeSonIs: Map<string, string> | undefined;
  var __composeCalisma: Map<string, Calisma> | undefined;
}

function memory(): Map<string, Job> {
  globalThis.__composeJobs ??= new Map<string, Job>();
  return globalThis.__composeJobs;
}

function sonIsler(): Map<string, string> {
  globalThis.__composeSonIs ??= new Map<string, string>();
  return globalThis.__composeSonIs;
}

function calismalar(): Map<string, Calisma> {
  globalThis.__composeCalisma ??= new Map<string, Calisma>();
  return globalThis.__composeCalisma;
}

let storePromise: Promise<Store | null> | undefined;

/** Sunucuda paylaşılan Blobs deposunu döndürür; yerel geliştirmede null. */
function blobStore(): Promise<Store | null> {
  storePromise ??= (async () => {
    if (process.env.NODE_ENV === "development") return null;
    try {
      const { getStore } = await import("@netlify/blobs");
      return getStore({ name: STORE_NAME, consistency: "strong" }) as unknown as Store;
    } catch (error) {
      // Burada belleğe düşmek sessiz bir tuzak: iki süreç birbirini
      // göremez. Gürültülü olsun ki teşhis kolay olsun.
      console.error("Netlify Blobs açılamadı — iş kayıtları paylaşılmayacak:", error);
      return null;
    }
  })();
  return storePromise;
}

export async function putJob(job: Job): Promise<void> {
  const store = await blobStore();
  if (store) {
    await store.setJSON(job.id, job);
    return;
  }
  memory().set(job.id, job);
}

export async function getJob(id: string): Promise<Job | null> {
  const store = await blobStore();
  if (store) {
    const value = (await store.get(id, { type: "json" })) as Job | null;
    return value ?? null;
  }
  return memory().get(id) ?? null;
}

/**
 * Kaydı kısmi olarak günceller. Kayıt bulunamazsa yeniden oluşturur:
 * Netlify Blobs kaydı zaman zaman kaybediyor ve sessizce yazmamak,
 * tamamlanmış bir üretimin sonucunu çöpe atmak demek oluyordu.
 */
export async function patchJob(id: string, patch: Partial<Job>): Promise<Job | null> {
  const current = await getJob(id);
  if (!current) {
    console.warn(`patchJob: kayıt bulunamadı, yeniden oluşturuluyor (${id})`);
  }
  const base: Job = current ?? {
    id,
    status: "processing",
    createdAt: new Date().toISOString(),
  };
  const next: Job = { ...base, ...patch, updatedAt: new Date().toISOString() };
  await putJob(next);
  return next;
}

/* Oturum başına son iş — eşzamanlılık kilidi bunu okuyor.
   Ayrı anahtarda tutuluyor çünkü iş kayıtları kimlikle saklanıyor ve
   Blobs'ta sorgu yok. Faz 4'te Postgres'e taşınınca kalkacak. */
const SON_IS = (sessionId: string) => `oturum:${sessionId}`;

export async function sonIsiYaz(sessionId: string, jobId: string): Promise<void> {
  const store = await blobStore();
  if (store) {
    await store.setJSON(SON_IS(sessionId), { jobId });
    return;
  }
  sonIsler().set(sessionId, jobId);
}

export async function sonIsiOku(sessionId: string): Promise<string | null> {
  const store = await blobStore();
  if (store) {
    const v = (await store.get(SON_IS(sessionId), { type: "json" })) as { jobId?: string } | null;
    return v?.jobId ?? null;
  }
  return sonIsler().get(sessionId) ?? null;
}

/* ------------------------------------------------------------------
   ÇALIŞMA KAYDI — oturum başına tek kayıt.

   `sonIsiYaz/Oku` ile aynı desen: oturum anahtarı altında küçük bir
   JSON. Ayrı bir depoya gerek yok, ayrı bir dosyaya da: burada duran
   bellek/Blobs ikiliğini ikinci kez yazmak, birinde düzeltilen bir
   hatanın ötekinde yaşaması demekti.
   ------------------------------------------------------------------ */

const CALISMA = (sessionId: string) => `calisma:${sessionId}`;

export async function calismaYaz(sessionId: string, calisma: Calisma): Promise<void> {
  const store = await blobStore();
  if (store) {
    await store.setJSON(CALISMA(sessionId), calisma);
    return;
  }
  calismalar().set(sessionId, calisma);
}

/**
 * Stüdyoda üretilen bir işi çalışma kaydına iliştirir.
 *
 * TAMAMINI YAZMIYOR, ÜSTÜNE EKLİYOR: kayıt ana sayfada kuruluyor
 * (brief, ilham işi, seçilen sıra) ve buradan gelen yalnız bir iş
 * kimliği. `calismaYaz` ile tam kayıt yazmak brief'i ve seçimi silerdi.
 *
 * KAYIT YOKSA SESSİZCE GEÇİYOR. Araçlar tohumsuz da açılabiliyor;
 * o hâlde iliştirilecek bir çalışma yok ve bu bir hata değil.
 */
export async function calismayaIsEkle(
  sessionId: string,
  yama: Partial<Pick<Calisma, "cekimIs" | "teknikIs">>,
): Promise<void> {
  const mevcut = await calismaOku(sessionId);
  if (!mevcut) return;
  await calismaYaz(sessionId, { ...mevcut, ...yama, guncellendi: new Date().toISOString() });
}

export async function calismaOku(sessionId: string): Promise<Calisma | null> {
  const store = await blobStore();
  if (store) {
    return ((await store.get(CALISMA(sessionId), { type: "json" })) as Calisma | null) ?? null;
  }
  return calismalar().get(sessionId) ?? null;
}

/* ------------------------------------------------------------------
   SAYAÇ — kota için küçük bir tamsayı deposu.

   Aynı bellek/Blobs ikiliğini üçüncü kez yazmamak için buraya kondu.
   YAKLAŞIKTIR ve öyle olduğu bilinerek kullanılıyor: Netlify Blobs
   karşılaştır-ve-değiştir sunmuyor, dolayısıyla oku-artır-yaz arasına
   giren eşzamanlı istekler sayılmadan geçebilir. Bir patlama tavanı
   biraz aşabilir; yaklaşık bir tavan, hiç tavan olmamasından
   kıyaslanamayacak kadar iyidir. Kesin sayım Postgres'e taşınınca gelir.
   ------------------------------------------------------------------ */
declare global {
  var __composeSayac: Map<string, number> | undefined;
}

function sayaclar(): Map<string, number> {
  globalThis.__composeSayac ??= new Map<string, number>();
  return globalThis.__composeSayac;
}

export async function sayacOku(anahtar: string): Promise<number> {
  const store = await blobStore();
  if (store) {
    const v = (await store.get(anahtar, { type: "json" })) as { n?: unknown } | null;
    return typeof v?.n === "number" && Number.isFinite(v.n) ? v.n : 0;
  }
  return sayaclar().get(anahtar) ?? 0;
}

export async function sayacYaz(anahtar: string, deger: number): Promise<void> {
  const store = await blobStore();
  if (store) {
    await store.setJSON(anahtar, { n: deger });
    return;
  }
  sayaclar().set(anahtar, deger);
}

export async function dropJob(id: string): Promise<void> {
  const store = await blobStore();
  if (store) {
    await store.delete(id);
    return;
  }
  memory().delete(id);
}
