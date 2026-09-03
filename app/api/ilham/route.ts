import { NextResponse } from "next/server";
import { getJob, putJob, sonIsiYaz } from "@/lib/ai/jobs";
import { acikIsiBul, arkaPlandaBaslat } from "@/lib/ai/kuyruk";
import { runJob } from "@/lib/ai/run";
import { oturumAlVeyaOlustur } from "@/lib/ai/session";
import {
  ASPECTS,
  ILHAM_KATEGORILERI,
  TURETILMIS_TURLER,
  type Aspect,
  type IlhamKategori,
  type Job,
  type TuretilmisTur,
} from "@/lib/ai/types";

/* ------------------------------------------------------------------
   METİNDEN ÜRETİM — iki mod, tek uç.

   `/api/compose` üç görseli ZORUNLU istiyor ve gövdesinin tamamı o
   sözleşmeye kurulu; metin modunu oraya sıkıştırmak iki akışı da
   okunmaz yapardı. Kuyruk, oturum, yoklama ve kare servisi ise
   paylaşılıyor — kopyalanan tek şey yok.

   · mod "ilham"      → metinden DÖRT kare (girdi görseli yok)
   · mod "turetilmis" → seçilen kareden moodboard + kumaş + branding

   İkisi de TEK İŞ üretiyor. Ayrı işler oturum kilidine çarpardı:
   aynı oturumda süren iş varken ikincisi 429 alır.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VARSAYILAN_ASPECT: Aspect = "4:5";
/** Serbest metnin üst sınırı — prompt'a giren kısım zaten kırpılıyor. */
const MAX_METIN = 600;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("İstek gövdesi okunamadı.");
  }
  if (typeof body !== "object" || body === null) return bad("Geçersiz istek.");
  const b = body as Record<string, unknown>;

  const metin = typeof b.metin === "string" ? b.metin.trim() : "";
  if (metin.length < 3) return bad("Ne tasarlamak istediğinizi birkaç kelimeyle yazın.");
  if (metin.length > MAX_METIN) return bad("İstek metni çok uzun.");

  const aspect = sec(b.aspect, ASPECTS) ?? VARSAYILAN_ASPECT;
  const sessionId = await oturumAlVeyaOlustur();

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
  };

  if (b.mod === "turetilmis") {
    /* KAYNAK YOLU İSTEMCİDEN ALINMIYOR. İstemci yalnız "hangi işin
       kaçıncı karesi" diyor; kovadaki yolu sunucu çözüyor ve işin bu
       oturuma ait olduğunu doğruluyor. Yol istemciden gelseydi başka
       birinin karesinden türetme yapılabilirdi. */
    const kaynakIs = typeof b.kaynakIs === "string" ? b.kaynakIs : "";
    const kaynakSira = Number(b.kaynakSira);
    if (!kaynakIs || !Number.isInteger(kaynakSira) || kaynakSira < 0) {
      return bad("Seçilen kare belirtilmedi.");
    }

    const kaynak = await getJob(kaynakIs);
    if (!kaynak || kaynak.sessionId !== sessionId) return bad("Seçilen kare bulunamadı.");
    const kare = kaynak.kareler?.[kaynakSira];
    if (!kare?.imagePath) {
      return bad("Seçilen kare kalıcı olarak saklanmamış; yeniden üretip deneyin.");
    }

    const turler = tureleriSec(b.turler);
    if (!turler.length) return bad("Türetilecek çıktı belirtilmedi.");

    job.mod = "turetilmis";
    job.turetilmis = { turler, metin, kaynakYol: kare.imagePath, aspect };
  } else {
    const kategori = sec(b.kategori, ILHAM_KATEGORILERI) as IlhamKategori | null;
    if (!kategori) return bad("Kategori geçersiz.");
    job.mod = "ilham";
    job.ilham = { metin, kategori, aspect };
  }

  await putJob(job);
  await sonIsiYaz(sessionId, job.id);

  // Aynı gerekçe /api/compose'daki gibi: sunucusuz ortamda yanıt
  // döndükten sonra çalışan iş donuyor.
  if (process.env.NODE_ENV === "development") {
    void runJob(job.id);
  } else if (!(await arkaPlandaBaslat(job.id, request))) {
    await putJob({
      ...job,
      status: "failed",
      completedAt: new Date().toISOString(),
      step: "baslatilamadi",
      error: "Üretim işi başlatılamadı.",
    });
    return NextResponse.json(
      { error: "Üretim işi başlatılamadı. Birazdan tekrar deneyin." },
      { status: 502 },
    );
  }

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function sec<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : null;
}

/** Boş/geçersiz gelirse üçünü de üret — akışın varsayılanı bu. */
function tureleriSec(value: unknown): TuretilmisTur[] {
  if (!Array.isArray(value)) return [...TURETILMIS_TURLER];
  const secilen = value.filter(
    (v): v is TuretilmisTur => typeof v === "string" && (TURETILMIS_TURLER as readonly string[]).includes(v),
  );
  return secilen.length ? [...new Set(secilen)] : [...TURETILMIS_TURLER];
}
