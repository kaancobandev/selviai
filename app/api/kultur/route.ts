import { NextResponse } from "next/server";
import { metinUret, MetinError } from "@/lib/ai/metin";
import { oturumAlVeyaOlustur } from "@/lib/ai/session";
import { buildKulturPrompt } from "@/lib/kultur";

/* ------------------------------------------------------------------
   KÜLTÜR ANALİZİ UCU.

   Görsel üretiminden farklı olarak KUYRUĞA ALINMIYOR: metin ~10 saniyede
   dönüyor (ölçüldü: gemini-3.8-flash, iki arama sorgusu, 10,2 sn) ve
   arka plan fonksiyonu + yoklama döngüsü kurmak bu süre için gereksiz
   karmaşıklık olurdu. Görsel üretimi 12-40 sn sürdüğü ve Netlify'ın
   senkron fonksiyonları 10 sn'de kestiği için orada kuyruk ŞART; burada
   değil.

   Oturum yine de açılıyor: ileride kredi/hız sınırı buraya da gelecek
   ve o zaman kimin istediğini bilmek gerekecek.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Gövde okunamadı." }, { status: 400 });
  }

  const brief = typeof (body as { brief?: unknown })?.brief === "string"
    ? ((body as { brief: string }).brief).trim()
    : "";
  if (brief.length < 8) {
    return NextResponse.json(
      { error: "Analiz için tasarım yönünü birkaç cümleyle yazın." },
      { status: 400 },
    );
  }

  await oturumAlVeyaOlustur();

  try {
    let sonuc = await metinUret(buildKulturPrompt(brief));

    /* TEK SEFERLİK YENİDEN DENEME — yalnız hiç kaynak dönmediğinde.
       Arama modelin KULLANABİLECEĞİ bir araç, garanti değil: ölçümde
       aynı istek bir koşumda hiç aramadan, başka koşumda 5 kaynakla
       döndü. Kullanıcı iddialı çıktı istedi ve kaynaksız iddia bu aracın
       en zararlı hâli; bir tekrar, o hâlin sıklığını ciddi biçimde
       düşürüyor. Maliyeti yalnız başarısız koşumda ödeniyor. */
    if (!sonuc.kaynaklar.length) {
      console.warn("Kültür analizi kaynaksız döndü, bir kez yeniden deneniyor.");
      sonuc = await metinUret(
        buildKulturPrompt(brief) +
          "\n\nÖNEMLİ: Önceki denemende arama yapmadın ve yanıt kaynaksız kaldı. " +
          "Bu sefer MUTLAKA arama yap ve yalnız doğrulayabildiğin çıpaları yaz.",
      );
    }

    return NextResponse.json({
      metin: sonuc.metin,
      kaynaklar: sonuc.kaynaklar,
      aramaSorgulari: sonuc.aramaSorgulari,
      model: sonuc.model,
      ms: sonuc.ms,
    });
  } catch (error) {
    const mesaj =
      error instanceof MetinError
        ? error.userMessage
        : "Analiz tamamlanamadı. Tekrar deneyin.";
    console.error("Kültür analizi başarısız:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: mesaj }, { status: 502 });
  }
}
