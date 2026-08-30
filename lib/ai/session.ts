import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

/* ------------------------------------------------------------------
   Anonim oturum — kimlik doğrulama gelene kadarki köprü.

   Galeri bu kimlikle kapsamlanır. Kimliksiz bir galeri, yüz fotoğrafı
   yükleyen kullanıcıların üretimlerini birbirine göstermek demek olurdu.

   Faz 4'te oturum açan kullanıcının bu çerezdeki kayıtları hesabına
   devredilecek (session_id -> user_id).
   ------------------------------------------------------------------ */

const AD = "selvi_oturum";
const BIR_YIL = 60 * 60 * 24 * 365;

/** Çerez değeri bizim yazdığımız biçimde mi — dışarıdan gelen her şey şüpheli. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function gecerliMi(deger: string | undefined): deger is string {
  return typeof deger === "string" && UUID.test(deger);
}

/** Varsa mevcut oturumu döndürür; yoksa null (okuma yolu). */
export async function oturumOku(): Promise<string | null> {
  const kavanoz = await cookies();
  const deger = kavanoz.get(AD)?.value;
  // Biçimi tutmayan çerezi YOK SAY. Bu değer depo yollarına ve SQL
  // filtrelerine giriyor; doğrulanmamış hâlde kabul etmek, tarayıcının
  // yazdığı bir dizeye sunucu yetkisi vermek demek.
  return gecerliMi(deger) ? deger : null;
}

/**
 * Depo yollarında kullanılan önek — ham oturum kimliği DEĞİL, ondan
 * türetilmiş sabit uzunlukta bir özet.
 *
 * İki şeyi birden çözer:
 *  · Yol dizesi 32 onaltılık karakterdir; "..", "/" ya da başka bir
 *    kaçış içeremez, yani depo isteğinin URL'ini kaydıramaz.
 *  · httpOnly çerezin değeri istemciye geri dönmez. Yükleme yanıtı
 *    yolu içeriyor; ham kimlik konsaydı httpOnly bir şey korumazdı.
 */
export function depoOneki(oturum: string): string {
  const sir =
    process.env.COMPOSE_INVOKE_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    "selvi";
  return createHmac("sha256", sir).update("depo:" + oturum).digest("hex").slice(0, 32);
}

/**
 * Oturumu döndürür, yoksa oluşturup çereze yazar.
 * Yalnızca yazma izni olan bağlamlarda (route handler / server action)
 * çağrılabilir — sayfa bileşenleri çerez yazamaz.
 */
export async function oturumAlVeyaOlustur(): Promise<string> {
  const kavanoz = await cookies();
  const mevcut = kavanoz.get(AD)?.value;
  if (gecerliMi(mevcut)) return mevcut;

  const yeni = crypto.randomUUID();
  kavanoz.set(AD, yeni, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: BIR_YIL,
    path: "/",
  });
  return yeni;
}
