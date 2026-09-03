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
 * üretim mutlaka buradan geçmeli.
 *
 * ÇAĞRI, İSTEĞİN GELDİĞİ DAĞITIMA GİTMELİ. Aksi hâlde `main` dalının
 * işini production'ın (release'in) eski kodu çalıştırır ve iş, o kodun
 * tanımadığı bir modda olduğu için anlamsız bir hatayla düşer.
 * Adresin nasıl seçildiği ve neden ortam değişkenine güvenilmediği
 * `tabanAdres` başında.
 */
export async function arkaPlandaBaslat(jobId: string, request: Request): Promise<boolean> {
  const base = tabanAdres(request);
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

/* ------------------------------------------------------------------
   TABAN ADRES — İSTEĞİN GELDİĞİ YER, ORTAM DEĞİŞKENİ DEĞİL.

   İki tur bu yüzden kaybedildi, ikisi de aynı kökten:

   1. `process.env.URL` ilk sıradaydı. Netlify'da `URL` her zaman sitenin
      ANA adresi — dal dağıtımında bile production'ı gösteriyor. Yani
      main'in ucu işi yaratıyor, çalıştırmayı production'a (release'in
      eski koduna) gönderiyordu.
   2. `DEPLOY_PRIME_URL` öne alındı ama sorun sürdü. Sebep bu dosyanın
      kendi geçmişinde yazılı: NETLIFY DERLEME DEĞİŞKENLERİ NEXT.JS
      ÇALIŞMA ZAMANINDA TANIMLI OLMAYABİLİYOR — `process.env.NETLIFY` ile
      birebir aynı tuzağa daha önce düşülmüştü. Tanımsızsa kod yine
      `URL`'e, yani production'a düşüyor.

   Bu yüzden artık İSTEĞİN KENDİSİ esas alınıyor: tarayıcı hangi adrese
   geldiyse arka plan fonksiyonu da orada. Hiçbir ortam değişkenine
   bağlı değil, dolayısıyla hangisinin tanımlı olduğunu bilmeye gerek yok.

   HOST BAŞLIĞI DOĞRULANIYOR. Başlık istemci tarafından yazılabilir ve
   buraya imzalı bir iş tetikleyicisi gönderiyoruz; doğrulanmazsa
   saldırgan kendi sunucusuna iş kimliği + imza sızdırabilirdi. Bu
   yüzden yalnız TANIDIĞIMIZ konaklar kabul ediliyor: ortam
   değişkenlerindeki adresler, `*.netlify.app` ve yerel geliştirme.
   Tanınmayan konakta ortam değişkenine geri dönülüyor.
   ------------------------------------------------------------------ */
function tabanAdres(request: Request): string {
  const yedek =
    process.env.DEPLOY_PRIME_URL ??
    process.env.URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    new URL(request.url).origin;

  const konak =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    request.headers.get("host")?.trim();
  if (!konak) return yedek;

  if (!tanidikKonak(konak)) {
    console.warn("tabanAdres: tanınmayan konak, ortam değişkenine dönülüyor:", konak);
    return yedek;
  }

  const sema =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (konak.startsWith("localhost") || konak.startsWith("127.0.0.1") ? "http" : "https");
  return `${sema}://${konak}`;
}

function tanidikKonak(konak: string): boolean {
  const ad = konak.toLowerCase().split(":")[0];
  if (ad === "localhost" || ad === "127.0.0.1") return true;
  // Dal dağıtımları ve dağıtım önizlemeleri hep bu alan adı altında.
  if (ad === "netlify.app" || ad.endsWith(".netlify.app")) return true;

  for (const aday of [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]) {
    if (!aday) continue;
    try {
      const bilinen = new URL(aday).hostname.toLowerCase();
      // Özel alan adı ve www'lu hâli aynı siteyi gösteriyor.
      if (ad === bilinen || ad === `www.${bilinen}` || `www.${ad}` === bilinen) return true;
    } catch {
      // Bozuk değer — yok say.
    }
  }
  return false;
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
