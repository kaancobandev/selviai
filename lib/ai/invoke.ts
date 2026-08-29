import { createHmac, timingSafeEqual } from "node:crypto";

/* ------------------------------------------------------------------
   Arka plan fonksiyonunun kapısı.

   /.netlify/functions/compose-background herkese açık HTTPS üzerinden
   erişilebilir: Netlify arka plan fonksiyonlarını dışarı açar ve tek
   doğrulama bizim kodumuzdadır. Kapı olmadan kimse kimlik göstermeden
   üretim tetikleyebilir; her tetikleme bize ~0,07-0,21 $.

   Çözüm: /api/compose isteği imzalar, fonksiyon imzayı doğrular.
   İmza anahtarı YENİ BİR AYAR GEREKTİRMEZ — zaten iki çalışma
   zamanında da bulunan, tarayıcıya asla gitmeyen bir sırdan türetilir.
   Özel bir anahtar tanımlanırsa o kullanılır.

   SINIR: bu, yeniden oynatmayı (replay) engellemez. Aynı jobId için
   imzayı ele geçiren biri onu tekrar gönderebilir. Asıl savunma,
   durum geçişinin atomik olması — Netlify Blobs karşılaştır-ve-değiştir
   sunmadığı için o, iş kaydı Postgres'e taşınınca gelecek.
   ------------------------------------------------------------------ */

export const INVOKE_HEADER = "x-selvi-invoke";

function sir(): string | null {
  return (
    process.env.COMPOSE_INVOKE_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    null
  );
}

export function imzala(jobId: string): string | null {
  const anahtar = sir();
  if (!anahtar) return null;
  return createHmac("sha256", anahtar).update(`compose:${jobId}`).digest("hex");
}

/** Sabit zamanlı karşılaştırma — imza uzunluğu üzerinden sızıntı olmasın. */
export function imzaGecerli(jobId: string, gelen: string | null | undefined): boolean {
  const beklenen = imzala(jobId);
  if (!beklenen || !gelen) return false;
  const a = Buffer.from(beklenen, "utf8");
  const b = Buffer.from(gelen, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
