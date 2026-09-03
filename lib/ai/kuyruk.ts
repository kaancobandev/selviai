import { getJob, sonIsiOku } from "./jobs";
import { imzala, INVOKE_HEADER } from "./invoke";

/* ------------------------------------------------------------------
   KUYRUK YARDIMCILARI — iki uç tarafından paylaşılıyor.

   Bu iki fonksiyon `/api/compose` içinde yazılmıştı. `/api/ilham` de
   aynı işi yapmak zorunda ve kopyalamak kötü bir fikirdi: buradaki
   taban adres seçimi pahalı öğrenilmiş bir bilgi. `process.env.NETLIFY`
   Next.js çalışma zamanında TANIMLI DEĞİL ve ona güvenen ilk sürüm
   üretimi yanlış dala düşürmüştü. Tek kopya, tek düzeltme.
   ------------------------------------------------------------------ */

/** Bu süreyi aşan "süren" iş takılmış sayılır ve yeni iş engellenmez. */
export const ACIK_IS_TAVANI_MS = 2 * 60 * 1000;

/**
 * Üretimi arka plan fonksiyonuna devreder.
 *
 * Sunucusuz ortamda yanıt döndükten sonra çalışan iş donduruluyor, yani
 * üretim mutlaka buradan geçmeli. Taban adres ortam değişkenine değil
 * İSTEĞİN KENDİSİNE dayanıyor: sağlayıcı ne verirse versin çalışır.
 */
export async function arkaPlandaBaslat(jobId: string, request: Request): Promise<boolean> {
  const base =
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    new URL(request.url).origin;
  try {
    // Arka plan fonksiyonu herkese açık bir adres; imzasız çağrıyı
    // kabul etmiyor. Bkz. lib/ai/invoke.ts.
    const imza = imzala(jobId);
    const res = await fetch(`${base}/.netlify/functions/compose-background`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(imza ? { [INVOKE_HEADER]: imza } : {}),
      },
      body: JSON.stringify({ jobId }),
    });
    if (res.status !== 202 && !res.ok) {
      console.error("arkaPlandaBaslat: beklenmedik yanıt", res.status, base);
      return false;
    }
    return true;
  } catch (error) {
    console.error("arkaPlandaBaslat başarısız:", base, error);
    return false;
  }
}

/**
 * Oturumun süren işi var mı. İş kayıtları kimlikle saklandığı için
 * oturum başına son iş ayrı bir anahtarda tutulur.
 */
export async function acikIsiBul(sessionId: string): Promise<string | null> {
  const sonId = await sonIsiOku(sessionId);
  if (!sonId) return null;
  const is = await getJob(sonId);
  if (!is) return null;
  if (is.status !== "queued" && is.status !== "processing") return null;
  // Bekçi eşiğini aşmış bir iş sürüyor sayılmaz; yoksa takılan tek bir
  // iş kullanıcıyı süresiz kilitler.
  const son = Date.parse(is.updatedAt ?? is.createdAt);
  if (Number.isFinite(son) && Date.now() - son > ACIK_IS_TAVANI_MS) return null;
  return sonId;
}
