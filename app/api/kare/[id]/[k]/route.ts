import { getJob } from "@/lib/ai/jobs";
import { indir } from "@/lib/ai/storage";

/* ------------------------------------------------------------------
   ÇOK KARELİ İŞİN TEK KARESİ.

   İlham işi dört kare üretiyor, türetme üç; kompozisyonun tek karelik
   `imagePath` alanı buna yetmiyor. Kareler iş kaydında dizi olarak
   duruyor ve sırasıyla adresleniyor.

   NEDEN SORGU DİZESİ DEĞİL YOL. Önce `/api/kare/<id>?k=2` yazılmıştı ve
   Next 16 bunu reddetti: yerel görsellerde sorgu dizesi artık
   `images.localPatterns.search` gerektiriyor ve o alan TAM EŞLEŞME
   istiyor, desen değil — dört sıra için dört ayrı kayıt demekti.
   Yol parçası hem yapılandırma gerektirmiyor hem daha doğru adres.

   Kovadaki yol istemciye HİÇ gitmiyor: kova özel ve yetki kontrolü bu
   tek noktada kalmalı.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; k: string }> },
) {
  const { id, k } = await params;
  const sira = Number(k);
  if (!Number.isInteger(sira) || sira < 0) return new Response("Bulunamadı", { status: 404 });

  const job = await getJob(id);
  const kare = job?.kareler?.[sira];
  if (!kare?.imagePath) return new Response("Bulunamadı", { status: 404 });

  const dosya = await indir(kare.imagePath);
  if (!dosya) return new Response("Görsel okunamadı", { status: 502 });

  return new Response(new Uint8Array(dosya.bayt), {
    headers: {
      "content-type": dosya.mime,
      "content-length": String(dosya.bayt.length),
      // İçerik değişmez: aynı kimlik + sıra hep aynı kareyi verir.
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
