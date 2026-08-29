import { ComposeError, generateComposite, composeModel } from "./gemini";
import { agirlikliPuan, judgeComposite, qualityGateEnabled } from "./judge";
import { getJob, patchJob } from "./jobs";
import { cozGirdiler, girdiYollari } from "./resolve";
import { depoAcikMi, depola, girdileriSil } from "./storage";
import type { Attempt, ComposeRequest } from "./types";

/* ------------------------------------------------------------------
   Bir işi baştan sona çalıştırır. İki yerden çağrılır:
   · yerelde  → /api/compose içinden, yanıt döndükten sonra
   · sunucuda → netlify/functions/compose-background.mts içinden

   Akış (Faz 3):
     üret → kabul kapısı → geçtiyse bitir
                         → geçmediyse daha güçlü modelle bir kez daha dene
                         → yine geçmezse iki karenin iyisini göster

   Kapı BAŞARISIZLIK değil YÜKSELTME tetikler. Hakem kasten katı
   (bkz. scripts/olcum/hakem.mjs); reddi başarısızlık saymak ürünü
   kullanılamaz hale getirirdi. Kullanıcı her hâlükârda en iyi kareyi
   görür, kabul edilmediyse de bunu meta'dan biliriz.

   Girdi görselleri işin başında kayıttan silinir: sonraki her yazma
   yarım megabaytlık veriyi tekrar tekrar taşımasın. Model çağrısı
   sürerken 10 saniyede bir kalp atışı yazılır.
   ------------------------------------------------------------------ */

const HEARTBEAT_MS = 10_000;
const DEFAULT_ESCALATE = "gemini-3-pro-image";

/** Sırayla denenecek modeller. İkincisi yalnız birincisi tökezlerse çalışır. */
function modelZinciri(): string[] {
  const birincil = composeModel();
  const yedek = process.env.COMPOSE_ESCALATE_MODEL?.trim() ?? DEFAULT_ESCALATE;
  const izin = process.env.COMPOSE_MAX_ATTEMPTS ? Number(process.env.COMPOSE_MAX_ATTEMPTS) : 2;
  const zincir = yedek && yedek !== birincil ? [birincil, yedek] : [birincil];
  return zincir.slice(0, Math.max(1, izin));
}

type Aday = {
  mimeType: string;
  data: string;
  model: string;
  ms: number;
  attempt: Attempt;
};

export async function runJob(id: string): Promise<void> {
  const job = await getJob(id);
  if (!job) {
    console.error(`runJob: iş bulunamadı (${id})`);
    return;
  }
  if (!job.request) {
    await patchJob(id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      step: "girdi-yok",
      error: "İş kaydında girdi görselleri yok.",
    });
    return;
  }
  if (job.status === "completed" || job.status === "processing") return;

  // Girdiyi belleğe al, kayıttan çıkar: bundan sonraki yazmalar küçük.
  const istek = job.request;
  const temizlenecek = girdiYollari(istek);
  await patchJob(id, { status: "processing", step: "model-cagriliyor", request: undefined });

  // Görseller depodaysa baytlarını indir; model katmanı hazır bayt ister.
  let request;
  try {
    request = await cozGirdiler(istek);
  } catch (error) {
    console.error(`runJob: girdiler çözülemedi (${id}):`, error);
    await girdileriSil(temizlenecek);
    await patchJob(id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      step: "girdi-okunamadi",
      error: "Yüklenen görseller okunamadı. Görselleri tekrar yükleyip deneyin.",
    });
    return;
  }

  const zincir = modelZinciri();
  const kapiAcik = qualityGateEnabled();
  const adaylar: Aday[] = [];
  const denemeler: Attempt[] = [];
  let sonHata: unknown = null;

  for (let i = 0; i < zincir.length; i += 1) {
    const model = zincir[i];
    const sonDeneme = i === zincir.length - 1;

    const aday = await birDeneme(id, request, model, i);
    if ("hata" in aday) {
      denemeler.push(aday.hata);
      sonHata = aday.cause;
      if (sonDeneme) break;
      continue;
    }

    denemeler.push(aday.aday.attempt);
    adaylar.push(aday.aday);
    if (aday.aday.attempt.kabul !== false) break; // geçti ya da kapı yok
    if (!sonDeneme) {
      await patchJob(id, { step: `kabul-edilmedi · daha guclu modelle yeniden` });
    }
  }

  // Girdiler işini bitirdi: yüz fotoğrafları gereğinden uzun durmasın.
  await girdileriSil(temizlenecek);

  const kazanan = enIyisi(adaylar);
  if (!kazanan) {
    const mesaj =
      sonHata instanceof ComposeError
        ? sonHata.userMessage
        : `Beklenmeyen hata: ${sonHata instanceof Error ? sonHata.message : String(sonHata)}`;
    console.error(`runJob başarısız (${id}):`, sonHata);
    await patchJob(id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      step: "hata",
      error: mesaj,
      meta: { model: zincir[0], ms: 0, denemeler },
    });
    return;
  }

  // Kalıcı depo açıksa kareyi oraya yaz ve iş kaydında yalnızca yolu
  // tut. Yükleme başarısız olursa data URL'e düşülür: kullanıcı görselini
  // her hâlükârda alır, yalnızca kalıcı olmaz.
  let imagePath: string | undefined;
  if (depoAcikMi()) {
    await patchJob(id, { step: "kaydediliyor" });
    imagePath =
      (await depola({
        id,
        model: kazanan.model,
        ms: kazanan.ms,
        attempt: adaylar.indexOf(kazanan) + 1,
        attempts: denemeler,
        accepted: kazanan.attempt.kabul,
        score: kazanan.attempt.puan,
        reason: kazanan.attempt.gerekce,
        request,
        sessionId: job.sessionId,
        mimeType: kazanan.mimeType,
        data: kazanan.data,
      })) ?? undefined;
  }

  await patchJob(id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    step: "bitti",
    imagePath,
    resultDataUrl: imagePath ? undefined : `data:${kazanan.mimeType};base64,${kazanan.data}`,
    meta: {
      model: kazanan.model,
      ms: kazanan.ms,
      kabul: kapiAcik ? kazanan.attempt.kabul : null,
      deneme: adaylar.indexOf(kazanan) + 1,
      denemeler,
    },
  });
}

/** Tek bir modelle üretir ve kapıdan geçirir. */
async function birDeneme(
  id: string,
  request: ComposeRequest,
  model: string,
  sira: number,
): Promise<{ aday: Aday } | { hata: Attempt; cause: unknown }> {
  const basladi = Date.now();
  const kalp = setInterval(() => {
    const sn = Math.round((Date.now() - basladi) / 1000);
    void patchJob(id, { step: `model-cagriliyor · ${sn} sn` }).catch(() => {});
  }, HEARTBEAT_MS);

  try {
    const sonuc = await generateComposite(request, model);
    clearInterval(kalp);

    let kabul: boolean | null = null;
    let puan: number | undefined;
    let gerekce: string | undefined;

    if (qualityGateEnabled()) {
      await patchJob(id, { step: "kare-denetleniyor" });
      const karar = await judgeComposite(request, sonuc);
      if (karar) {
        kabul = karar.kabul;
        puan = agirlikliPuan(karar);
        gerekce = karar.gerekce;
      }
    }

    const attempt: Attempt = { model, ms: sonuc.ms, kabul, puan, gerekce };
    return { aday: { mimeType: sonuc.mimeType, data: sonuc.data, model, ms: sonuc.ms, attempt } };
  } catch (error) {
    clearInterval(kalp);
    const mesaj = error instanceof ComposeError ? error.userMessage : String(error);
    console.error(`Deneme ${sira + 1} başarısız (${model}):`, mesaj);
    return {
      hata: { model, ms: Date.now() - basladi, kabul: null, hata: mesaj.slice(0, 200) },
      cause: error,
    };
  }
}

/** Kapıdan geçen ilk kare, yoksa en yüksek puanlı kare. */
function enIyisi(adaylar: Aday[]): Aday | null {
  if (!adaylar.length) return null;
  const gecen = adaylar.find((a) => a.attempt.kabul === true);
  if (gecen) return gecen;
  return adaylar.reduce((en, a) => ((a.attempt.puan ?? 0) > (en.attempt.puan ?? 0) ? a : en));
}
