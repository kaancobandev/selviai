import { NextResponse } from "next/server";
import { calismayaIsEkle, getJob, putJob, sonIsiYaz } from "@/lib/ai/jobs";
import { acikIsiBul, arkaPlandaBaslat, kotaAyir } from "@/lib/ai/kuyruk";
import { runJob } from "@/lib/ai/run";
import { oturumAlVeyaOlustur } from "@/lib/ai/session";
import { ASPECTS, TEKNIK_EKSENLERI, type Aspect, type Job } from "@/lib/ai/types";

/* ------------------------------------------------------------------
   TEKNİK ÇİZİM UCU.

   Kullanıcının tasarladığı giysinin FLAT'ini üretir: ön ve arka, çizgi
   resmi olarak (bkz. buildTeknikPrompt, lib/ai/prompt.ts).

   ÇEKİM UCUNDAN TEK FARKI: orada satırları kullanıcı kuruyor ve gövdede
   `kareler` geliyor; burada çıktı hep aynı ikili, dolayısıyla gövdede
   sayılacak bir şey yok. Kota da bu yüzden sabit: TEKNIK_EKSENLERI kadar.

   KAYNAK YOLU İSTEMCİDEN ALINMIYOR. İstemci "hangi işin kaçıncı karesi"
   diyor; kovadaki yolu sunucu çözüyor ve işin bu oturuma ait olduğunu
   doğruluyor. Yol istemciden gelseydi başkasının giysisi çizilebilirdi.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Flat dikey bir çizim ve kroki alanı ~1:3,7; ASPECTS içindeki en dikey
   oran 3:4. Daha dikey bir oran eklemek ASPECTS'i ve onu okuyan her uç
   doğrulamasını değiştirmek olurdu. */
const VARSAYILAN_ASPECT: Aspect = "3:4";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Gövde okunamadı." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const metin = typeof b.metin === "string" ? b.metin.trim().slice(0, 700) : "";
  const aspect =
    typeof b.aspect === "string" && (ASPECTS as readonly string[]).includes(b.aspect)
      ? (b.aspect as Aspect)
      : VARSAYILAN_ASPECT;

  const kaynak = kaynagiOku(b.kaynak);
  if (!kaynak) return bad("Çizilecek giysi karesi belirtilmedi.");

  const sessionId = await oturumAlVeyaOlustur();

  const acikIs = await acikIsiBul(sessionId);
  if (acikIs) {
    return NextResponse.json(
      { error: "Bir üretiminiz sürüyor. Bitmesini bekleyin.", jobId: acikIs },
      { status: 429 },
    );
  }

  const kaynakIs = await getJob(kaynak.isId);
  if (!kaynakIs || kaynakIs.sessionId !== sessionId) return bad("Giysi karesi bulunamadı.");
  const kaynakKare = kaynakIs.kareler?.[kaynak.sira];
  if (!kaynakKare?.imagePath) {
    return bad("Giysi karesi kalıcı olarak saklanmamış; yeniden üretip deneyin.");
  }

  const job: Job = {
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: new Date().toISOString(),
    sessionId,
    katman: "ucretsiz",
    mod: "teknik",
    teknik: { kaynakYol: kaynakKare.imagePath, metin, aspect },
  };

  // Ön ve arka: iki üretim, sabit.
  const kota = await kotaAyir(request, TEKNIK_EKSENLERI.length);
  if (!kota.ok) return NextResponse.json({ error: kota.sebep }, { status: 429 });

  await putJob(job);
  await sonIsiYaz(sessionId, job.id);
  /* Çalışma kaydına iliştiriliyor ki sayfa tazelenince sonuçlar geri
     gelsin. Kareler zaten sunucuda duruyordu; eksik olan tek şey
     onları bulacak adresti. */
  await calismayaIsEkle(sessionId, { teknikIs: job.id });

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

/** `{isId, sira}` — giysi karesinin adresi; kovadaki yolu sunucu çözüyor. */
function kaynagiOku(ham: unknown): { isId: string; sira: number } | null {
  const o = ham as Record<string, unknown> | null;
  const isId = typeof o?.isId === "string" ? o.isId : "";
  const sira = Number(o?.sira);
  if (!isId || !Number.isInteger(sira) || sira < 0) return null;
  return { isId, sira };
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
