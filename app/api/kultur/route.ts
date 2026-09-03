import { NextResponse } from "next/server";
import { putJob, sonIsiYaz } from "@/lib/ai/jobs";
import { acikIsiBul, arkaPlandaBaslat } from "@/lib/ai/kuyruk";
import { runJob } from "@/lib/ai/run";
import { oturumAlVeyaOlustur } from "@/lib/ai/session";
import type { Job } from "@/lib/ai/types";

/* ------------------------------------------------------------------
   KÜLTÜR ANALİZİ UCU.

   BU UÇ ÖNCE SENKRON YAZILDI VE YANLIŞTI. Gerekçe şuydu: "metin ~10
   saniyede dönüyor, kuyruk gereksiz karmaşıklık." Ölçüm ilk denemeden
   geliyordu; doğrulanabilir çıpa isteyen prompt'a geçilince süre 28,4
   saniyeye çıktı ve o not güncellenmedi. Netlify senkron fonksiyonları
   10 saniyede kesiyor (netlify.toml'da yazılı), yani uç yerelde
   çalışırken production'da hiç çalışmayacaktı.

   Ders kayda geçsin: bir bileşenin süresi PROMPT DEĞİŞİNCE değişir.
   Süreye dayanan mimari kararlar, prompt değiştiğinde yeniden ölçülmeli.

   Şimdi görsel üretimiyle aynı yolu izliyor: iş kaydı açılıyor, arka
   plan fonksiyonu tetikleniyor (15 dk sınırı), istemci /api/jobs/:id
   ucundan yokluyor. Yoklama döngüsü zaten vardı — yeni altyapı yok.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BRIEF = 700;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Gövde okunamadı." }, { status: 400 });
  }

  const brief =
    typeof (body as { brief?: unknown })?.brief === "string"
      ? (body as { brief: string }).brief.trim()
      : "";
  if (brief.length < 8) {
    return NextResponse.json(
      { error: "Analiz için tasarım yönünü birkaç cümleyle yazın." },
      { status: 400 },
    );
  }
  if (brief.length > MAX_BRIEF) {
    return NextResponse.json({ error: "Analiz metni çok uzun." }, { status: 400 });
  }

  const sessionId = await oturumAlVeyaOlustur();

  /* Oturum kilidi görsel uçlarıyla ORTAK. Analiz ucuz bir iş ama kilidi
     esnetmek "her uç kendi kuralını uydursun"a açılan kapı; tek kural
     daha kolay savunuluyor. */
  const acikIs = await acikIsiBul(sessionId);
  if (acikIs) {
    return NextResponse.json(
      { error: "Bir üretiminiz sürüyor. Bitmesini bekleyin.", jobId: acikIs },
      { status: 429 },
    );
  }

  const job: Job = {
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: new Date().toISOString(),
    sessionId,
    katman: "ucretsiz",
    mod: "kultur",
    kultur: { brief },
  };

  await putJob(job);
  await sonIsiYaz(sessionId, job.id);

  // Sunucusuz ortamda yanıt döndükten sonra çalışan iş donuyor.
  if (process.env.NODE_ENV === "development") {
    void runJob(job.id);
  } else {
    const baslatma = await arkaPlandaBaslat(job.id, request);
    if (!baslatma.ok) {
      await putJob({
        ...job,
        status: "failed",
        completedAt: new Date().toISOString(),
        step: "baslatilamadi",
        error: baslatma.sebep,
      });
      return NextResponse.json({ error: baslatma.sebep }, { status: 502 });
    }
  }

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
