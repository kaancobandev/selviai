import { NextResponse } from "next/server";
import { getJob, putJob, sonIsiYaz } from "@/lib/ai/jobs";
import { acikIsiBul, arkaPlandaBaslat } from "@/lib/ai/kuyruk";
import { runJob } from "@/lib/ai/run";
import { oturumAlVeyaOlustur } from "@/lib/ai/session";
import { ASPECTS, KESIM_EKSENLERI, type Aspect, type Job } from "@/lib/ai/types";

/* ------------------------------------------------------------------
   KOLAJ KESİMİ UCU.

   Kolaj tuvaline yapıştırılacak parçaları üretir: seçilen kareler
   zeminlerinden ayrılıp düz macenta üzerine oturtulur, saydamlığı
   tarayıcı açar (bkz. lib/kolaj.ts, lib/ai/prompt.ts).

   TEK İŞ, ÇOK PARÇA — türetme ucundaki gerekçenin aynısı: oturumda tek
   iş kilidi var, dört parçayı dört iş yapmak üçünü 429'a düşürürdü.

   KAYNAK YOLU İSTEMCİDEN ALINMIYOR. İstemci "hangi işin kaçıncı karesi"
   diyor; kovadaki yolu sunucu çözüyor ve işin bu oturuma ait olduğunu
   doğruluyor. Yol istemciden gelseydi başkasının karesi kesilebilirdi.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VARSAYILAN_ASPECT: Aspect = "3:4";

type Secim = { isId: string; sira: number };

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

  const secimler = secimleriOku(b.kareler);
  if (!secimler.length) return bad("Kesilecek kare seçilmedi.");
  if (secimler.length > KESIM_EKSENLERI.length) {
    return bad(`Bir seferde en çok ${KESIM_EKSENLERI.length} parça kesilebilir.`);
  }

  const sessionId = await oturumAlVeyaOlustur();

  const acikIs = await acikIsiBul(sessionId);
  if (acikIs) {
    return NextResponse.json(
      { error: "Bir üretiminiz sürüyor. Bitmesini bekleyin.", jobId: acikIs },
      { status: 429 },
    );
  }

  /* İşler tek tek okunuyor ama AYNI iş birden çok kez seçilmiş olabilir
     (aynı kareden iki farklı parça istenmez, ama farklı kareler aynı
     işten gelir). Küçük bir önbellek, dört kare için dört okuma yerine
     bir okuma yapıyor. */
  const isler = new Map<string, Job | null>();
  const yollar: string[] = [];
  for (const s of secimler) {
    if (!isler.has(s.isId)) isler.set(s.isId, await getJob(s.isId));
    const is = isler.get(s.isId);
    if (!is || is.sessionId !== sessionId) return bad("Seçilen kare bulunamadı.");
    const kare = is.kareler?.[s.sira];
    if (!kare?.imagePath) {
      return bad("Seçilen kare kalıcı olarak saklanmamış; yeniden üretip deneyin.");
    }
    yollar.push(kare.imagePath);
  }

  const job: Job = {
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: new Date().toISOString(),
    sessionId,
    katman: "ucretsiz",
    mod: "kesim",
    kesim: { yollar, metin, aspect },
  };

  await putJob(job);
  await sonIsiYaz(sessionId, job.id);

  // Sunucusuz ortamda yanıt döndükten sonra çalışan iş donuyor.
  if (process.env.NODE_ENV === "development") {
    void runJob(job.id);
  } else if (!(await arkaPlandaBaslat(job.id, request))) {
    await putJob({
      ...job,
      status: "failed",
      completedAt: new Date().toISOString(),
      step: "baslatilamadi",
      error: "Kesim işi başlatılamadı.",
    });
    return NextResponse.json(
      { error: "Kesim başlatılamadı. Birazdan tekrar deneyin." },
      { status: 502 },
    );
  }

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

/** `[{isId, sira}]` — bozuk girdiler sessizce düşüyor, boş kalırsa uç reddediyor. */
function secimleriOku(ham: unknown): Secim[] {
  if (!Array.isArray(ham)) return [];
  const cikti: Secim[] = [];
  for (const item of ham) {
    const o = item as Record<string, unknown> | null;
    const isId = typeof o?.isId === "string" ? o.isId : "";
    const sira = Number(o?.sira);
    if (!isId || !Number.isInteger(sira) || sira < 0) continue;
    if (cikti.some((c) => c.isId === isId && c.sira === sira)) continue;
    cikti.push({ isId, sira });
  }
  return cikti;
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
