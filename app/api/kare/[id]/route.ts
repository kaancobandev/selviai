import { getJob } from "@/lib/ai/jobs";
import { indir, kompozisyonYolu } from "@/lib/ai/storage";

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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const job = await getJob(id);
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
