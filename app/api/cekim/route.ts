import { NextResponse } from "next/server";
import { calismayaIsEkle, getJob, putJob, sonIsiYaz } from "@/lib/ai/jobs";
import { acikIsiBul, arkaPlandaBaslat, kotaAyir } from "@/lib/ai/kuyruk";
import { runJob } from "@/lib/ai/run";
import { oturumAlVeyaOlustur } from "@/lib/ai/session";
import {
  ASPECTS,
  CEKIM_EKSENLERI,
  CROPS,
  LIGHTINGS,
  type Aspect,
  type CekimKare,
  type Crop,
  type Job,
  type Lighting,
} from "@/lib/ai/types";

/* ------------------------------------------------------------------
   ÇEKİM LİSTESİ UCU.

   Her satır, kullanıcının tasarladığı giysiden üretilecek tek bir kare:
   bir kadraj + bir ışık senaryosu (bkz. lib/ai/prompt.ts).

   `/api/compose` KULLANILMIYOR. O uç üç YÜKLENMİŞ görsel bekliyor
   (kişi, ürün, sahne) ve biri eksikse 400 dönüyor; tohumda kişi
   fotoğrafı yok ve kare başına yükleme istemek, ürünün ortadan
   kaldırmak için var olduğu eforun ta kendisi. Burada türetme ve
   kesimde oturmuş TEK REFERANS kalıbı var: kovadaki kare + istem.

   TEK İŞ, ÇOK KARE — türetme ve kesim ucundaki gerekçenin aynısı:
   oturumda tek iş kilidi var, altı satırı altı iş yapmak beşini 429'a
   düşürürdü.

   KAYNAK YOLU İSTEMCİDEN ALINMIYOR. İstemci "hangi işin kaçıncı karesi"
   diyor; kovadaki yolu sunucu çözüyor ve işin bu oturuma ait olduğunu
   doğruluyor. Yol istemciden gelseydi başkasının giysisi çekilebilirdi.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  if (!kaynak) return bad("Çekilecek giysi karesi belirtilmedi.");

  /* Satırlar SESSİZCE DÜŞMÜYOR, uç reddediyor — kesimdeki davranıştan
     kasten ayrı. Orada bozuk bir seçim yalnız bir parçayı eksiltirdi;
     burada her satır kullanıcının tek tek kurduğu bir kare ve tanımadığımız
     bir kadrajı yutmak, listede gördüğünden az kare üretmek demek. */
  const kareler = kareleriOku(b.kareler);
  if (!kareler) return bad("Kadraj ya da ışık değeri tanınmadı.");
  if (!kareler.length) return bad("Çekim listesi boş.");
  if (kareler.length > CEKIM_EKSENLERI.length) {
    return bad(`Bir seferde en çok ${CEKIM_EKSENLERI.length} kare çekilebilir.`);
  }

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
    mod: "cekim",
    cekim: { kaynakYol: kaynakKare.imagePath, metin, aspect, kareler },
  };

  // Listedeki her satır bir üretim demek; kota satır başına düşülüyor.
  const kota = await kotaAyir(request, kareler.length);
  if (!kota.ok) return NextResponse.json({ error: kota.sebep }, { status: 429 });

  await putJob(job);
  await sonIsiYaz(sessionId, job.id);
  /* Çalışma kaydına iliştiriliyor ki sayfa tazelenince sonuçlar geri
     gelsin. Kareler zaten sunucuda duruyordu; eksik olan tek şey
     onları bulacak adresti. */
  await calismayaIsEkle(sessionId, { cekimIs: job.id });

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

/** `[{crop, lighting}]` — tek bir bozuk satır bile listeyi reddettiriyor (null). */
function kareleriOku(ham: unknown): CekimKare[] | null {
  if (!Array.isArray(ham)) return null;
  const cikti: CekimKare[] = [];
  for (const item of ham) {
    const o = item as Record<string, unknown> | null;
    const crop = typeof o?.crop === "string" ? o.crop : "";
    const lighting = typeof o?.lighting === "string" ? o.lighting : "";
    if (!(CROPS as readonly string[]).includes(crop)) return null;
    if (!(LIGHTINGS as readonly string[]).includes(lighting)) return null;
    cikti.push({ crop: crop as Crop, lighting: lighting as Lighting });
  }
  return cikti;
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
