import type { Job } from "./types";

/* ------------------------------------------------------------------
   İş kaydı — iki arka uç:
   · Netlify'da  → Netlify Blobs (route handler ile arka plan fonksiyonu
     ayrı süreçlerde çalıştığı için paylaşılan bir depo şart).
   · Yerelde     → süreç içi Map (next dev tek süreçtir).

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
}

function memory(): Map<string, Job> {
  globalThis.__composeJobs ??= new Map<string, Job>();
  return globalThis.__composeJobs;
}

let storePromise: Promise<Store | null> | undefined;

/** Netlify ortamında Blobs deposunu döndürür; yerelde null. */
function blobStore(): Promise<Store | null> {
  storePromise ??= (async () => {
    if (!process.env.NETLIFY) return null;
    try {
      const { getStore } = await import("@netlify/blobs");
      return getStore({ name: STORE_NAME, consistency: "strong" }) as unknown as Store;
    } catch (error) {
      console.error("Netlify Blobs açılamadı, süreç içi belleğe düşülüyor:", error);
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

export async function dropJob(id: string): Promise<void> {
  const store = await blobStore();
  if (store) {
    await store.delete(id);
    return;
  }
  memory().delete(id);
}
