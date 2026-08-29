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

/** Varsa mevcut oturumu döndürür; yoksa null (okuma yolu). */
export async function oturumOku(): Promise<string | null> {
  const kavanoz = await cookies();
  return kavanoz.get(AD)?.value ?? null;
}

/**
 * Oturumu döndürür, yoksa oluşturup çereze yazar.
 * Yalnızca yazma izni olan bağlamlarda (route handler / server action)
 * çağrılabilir — sayfa bileşenleri çerez yazamaz.
 */
export async function oturumAlVeyaOlustur(): Promise<string> {
  const kavanoz = await cookies();
  const mevcut = kavanoz.get(AD)?.value;
  if (mevcut) return mevcut;

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
