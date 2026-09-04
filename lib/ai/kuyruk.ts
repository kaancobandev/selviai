import { getJob, patchJob, sayacOku, sayacYaz, sonIsiOku } from "./jobs";
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
export type BaslatmaSonucu = { ok: true } | { ok: false; sebep: string };

export async function arkaPlandaBaslat(
  jobId: string,
  request: Request,
): Promise<BaslatmaSonucu> {
  const base = tabanAdres(request);

  /* Hedef, TETİKLEMEDEN ÖNCE yazılıyor. Sonrasında yazmak, arka plan
     fonksiyonunun "processing" yazmasıyla yarışırdı: Blobs'ta
     karşılaştır-ve-değiştir yok, oku-yaz arasına giren yazma kaybolur.
     Burada henüz eşzamanlı yazan yok. */
  await patchJob(jobId, { hedef: new URL(base).host }).catch(() => {});

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
      return { ok: false, sebep: sebebiCevir(res.status, base) };
    }
    return { ok: true };
  } catch (error) {
    console.error("arkaPlandaBaslat başarısız:", base, error);
    return { ok: false, sebep: `Arka plan fonksiyonuna (${new URL(base).host}) ulaşılamadı.` };
  }
}

/**
 * Başarısızlığın SEBEBİNİ söyler, "başlatılamadı" demekle yetinmez.
 *
 * 401/403 özellikle ayrılıyor çünkü bir tur bu yüzden kaybedildi: dal
 * dağıtımı Netlify parola korumasının arkasındaydı ve sunucudan sunucuya
 * yapılan bu çağrının kimliği yok. Belirti yalnız "Üretim işi
 * başlatılamadı" idi ve korumadan hiç söz etmiyordu; tarayıcı
 * geçebildiği için sorunun orada olduğu akla gelmiyor.
 */
function sebebiCevir(durum: number, base: string): string {
  const konak = new URL(base).host;
  if (durum === 401 || durum === 403) {
    return (
      `Arka plan fonksiyonu ${konak} adresinde erişime kapalı (${durum}). ` +
      "Dağıtım parola korumasının arkasındaysa sunucu kendi fonksiyonunu çağıramaz; " +
      "o dağıtımın ziyaretçi erişimini açın."
    );
  }
  if (durum === 404) {
    return `Arka plan fonksiyonu ${konak} adresinde bulunamadı (404). Dağıtım eksik olabilir.`;
  }
  return `Arka plan fonksiyonu ${konak} adresinde ${durum} döndü.`;
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

/* ------------------------------------------------------------------
   GÜNLÜK IP KOTASI.

   NEDEN GEREKLİ. Depodaki tek fren `acikIsiBul` idi ve o, oturum
   çerezine bağlı. `oturumAlVeyaOlustur` çerez yoksa REDDETMİYOR, yeni
   bir kimlik basıp devam ediyor — yani çerezi hiç saklamayan bir
   istemci için kilit hiç devreye girmiyor. Kimliği isteyenin kendisi
   seçebiliyorsa o kimlik kota olamaz.

   NEDEN NETLIFY'IN KENDİ HIZ SINIRI KULLANILMADI. `rateLimit` ayarı
   Netlify FONKSİYONUNUN kendi config'inde yaşıyor (@netlify/functions,
   BaseConfig.rateLimit). Üretim uçlarımız Next.js route handler'ları ve
   OpenNext hepsini tek bir sunucu fonksiyonuna paketliyor; tek tek
   config veremiyoruz. Arka plan fonksiyonuna konsaydı da `aggregateBy:
   "ip"` bizim KENDİ sunucumuzun adresini görürdü — çağrıyı o yapıyor —
   ve bütün meşru trafiği boğardı.

   IP MÜKEMMEL DEĞİL, ama çerezin aksine isteyenin seçemediği tek şey.
   Kurumsal NAT ya da mobil operatör arkasındaki kullanıcılar tek IP
   paylaşabilir; tavan bu yüzden cömert tutuldu. Gerçek çözüm hesap +
   kredi (Faz 4); bu, o gelene kadar "sınırsız"ı "sınırlı" yapan en
   küçük değişiklik.

   SAYAÇ YAKLAŞIKTIR: Blobs'ta karşılaştır-ve-değiştir yok (bkz.
   lib/ai/jobs.ts). Eşzamanlı bir patlama tavanı biraz aşabilir.
   ------------------------------------------------------------------ */

/** Bir IP'nin bir günde tetikleyebileceği üretim sayısı (kare bazında). */
export const GUNLUK_KARE_TAVANI = Number(process.env.GUNLUK_KARE_TAVANI) || 40;

/**
 * İstemci adresi. Netlify kendi başlığını veriyor; arkasına düşülen
 * `x-forwarded-for` ilk kayıt istemcidir.
 *
 * Adres bulunamazsa kota UYGULANMIYOR (bkz. kotaAyir). Gerekçe: adres
 * yalnız bizim ortamımızda kaybolur (yerel geliştirme), saldırganın
 * kaybettirme yolu yok — başlığı silmek elinde değil, ekleyeceği sahte
 * bir değer de aşağıda ilk sıradaki gerçek başlığı geçemiyor.
 */
function istemciIp(request: Request): string | null {
  const h = request.headers;
  const aday =
    h.get("x-nf-client-connection-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "";
  return aday || null;
}

/** Anahtar UTC gününe göre; gün dönünce sayaç kendiliğinden sıfırlanır. */
function kotaAnahtari(ip: string): string {
  return `gunluk:${ip}:${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Kotadan `kare` adet ayırır. Yer varsa sayacı artırıp true döner.
 *
 * ÖNCEDEN ayrılıyor, üretimden sonra değil: iş kuyruğa girdikten sonra
 * saymak, tam da durdurmak istediğimiz patlamada geç kalmak olurdu.
 */
export async function kotaAyir(
  request: Request,
  kare: number,
): Promise<{ ok: true } | { ok: false; sebep: string }> {
  const ip = istemciIp(request);
  if (!ip) return { ok: true };

  const anahtar = kotaAnahtari(ip);
  const mevcut = await sayacOku(anahtar);
  if (mevcut + kare > GUNLUK_KARE_TAVANI) {
    console.warn(`kotaAyir: günlük tavan aşıldı (${anahtar}: ${mevcut}+${kare})`);
    return {
      ok: false,
      sebep: "Bugünkü üretim hakkınız doldu. Yarın tekrar deneyebilirsiniz.",
    };
  }
  await sayacYaz(anahtar, mevcut + kare);
  return { ok: true };
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
