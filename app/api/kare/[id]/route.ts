import { getJob } from "@/lib/ai/jobs";
import { oturumOku } from "@/lib/ai/session";
import { indir, kompozisyonYolu, sil } from "@/lib/ai/storage";

/* ------------------------------------------------------------------
   Üretilen kareyi servis eder.

   Kova özeldir ve imzalı URL kullanmıyoruz: bağlantının süresi dolmaz,
   yetki kontrolü tek yerde kalır (Faz 4'te oturum kontrolü tam olarak
   buraya girecek) ve yüz fotoğrafı içeren çıktılar hiçbir zaman
   herkese açık bir adreste durmaz.

   Yol önce iş kaydından, o yoksa veritabanından bulunur — iş kayıtları
   geçicidir, kompozisyonlar kalıcı.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const job = await getJob(id);

  /* ÇOK KARELİ İŞLER — `?k=<sıra>`.
     İlham işi tek kare değil dört üretiyor; kompozisyonun `imagePath`
     alanı buna yetmiyor. Kareler iş kaydında dizi olarak duruyor ve
     sırasıyla adresleniyor. Kovadaki yol istemciye HİÇ gitmiyor: kova
     özel ve yetki kontrolü bu tek noktada kalmalı. */
  const sira = new URL(request.url).searchParams.get("k");
  if (sira !== null) {
    const i = Number(sira);
    const kare = Number.isInteger(i) && i >= 0 ? job?.kareler?.[i] : undefined;
    if (!kare?.imagePath) return new Response("Bulunamadı", { status: 404 });
    const dosya = await indir(kare.imagePath);
    if (!dosya) return new Response("Görsel okunamadı", { status: 502 });
    return new Response(new Uint8Array(dosya.bayt), {
      headers: {
        "content-type": dosya.mime,
        "content-length": String(dosya.bayt.length),
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  }

  let yol = job?.imagePath;
  let mime: string | undefined;

  if (!yol) {
    const kayit = await kompozisyonYolu(id);
    if (kayit) {
      yol = kayit.yol;
      mime = kayit.mime;
    }
  }
  if (!yol) return new Response("Bulunamadı", { status: 404 });

  const dosya = await indir(yol);
  if (!dosya) return new Response("Görsel okunamadı", { status: 502 });

  return new Response(new Uint8Array(dosya.bayt), {
    headers: {
      "content-type": mime ?? dosya.mime,
      "content-length": String(dosya.bayt.length),
      // İçerik değişmez: aynı kimlik hep aynı kareyi verir.
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}

/**
 * Kareyi kalıcı olarak siler — dosya ve kayıt birlikte.
 *
 * Yalnızca kareyi üreten oturum silebilir; eşleşme depoda sorgulanır,
 * istekteki hiçbir alana güvenilmez. Yüz fotoğrafı yükleyen bir üründe
 * "tek tıkla silme" hukuki bir gereklilik, süs değil.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const oturum = await oturumOku();
  if (!oturum) return new Response("Oturum yok", { status: 401 });

  const oldu = await sil(id, oturum);
  return oldu
    ? new Response(null, { status: 204 })
    : new Response("Silinemedi", { status: 404 });
}
