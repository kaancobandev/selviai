import { VARSAYILAN_KATMAN, type Katman } from "./anahtar";
import { ComposeError, generateComposite, generateFromText, composeModel } from "./gemini";
import { agirlikliPuan, judgeComposite, qualityGateEnabled } from "./judge";
import { getJob, patchJob } from "./jobs";
import { cozGirdiler, girdiYollari } from "./resolve";
import { depoAcikMi, depola, dosyaYukle, girdileriSil, indir } from "./storage";
import { ILHAM_EKSENLERI, type Attempt, type ComposeRequest, type Job, type JobKare } from "./types";
import { buildIlhamPrompt, buildTuretilmisPrompt } from "./prompt";

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
  /* Tekrar-oynatma kalkanı BURAYA taşındı: eskiden `!job.request`
     kontrolünden sonraydı, ama ilham işlerinde `request` hiç olmuyor ve
     kontrol onları "girdi yok" diye reddediyordu. Kalkanın iki dalda da
     geçerli olması gerekiyor, o yüzden ayrımdan önce. */
  if (job.status === "completed" || job.status === "processing") return;

  /* İLHAM / TÜRETİLMİŞ DAL — üç görselli kompozisyondan tamamen ayrı:
     girdi çözme yok (görsel yok), kalite kapısı yok (karşılaştırılacak
     referans yok, hakemin rubriği "kare 4'ü kare 1-3'e karşı" puanlıyor)
     ve kazanan seçimi yok — dördü de kullanıcıya gidiyor. */
  if (job.mod === "ilham" || job.mod === "turetilmis") {
    await ilhamKosusu(job);
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

  const katman: Katman = job.katman ?? VARSAYILAN_KATMAN;
  const zincir = modelZinciri();
  const kapiAcik = qualityGateEnabled();
  const adaylar: Aday[] = [];
  const denemeler: Attempt[] = [];
  let sonHata: unknown = null;

  for (let i = 0; i < zincir.length; i += 1) {
    const model = zincir[i];
    const sonDeneme = i === zincir.length - 1;

    const aday = await birDeneme(id, request, model, i, katman);
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
  katman: Katman,
): Promise<{ aday: Aday } | { hata: Attempt; cause: unknown }> {
  const basladi = Date.now();
  const kalp = setInterval(() => {
    const sn = Math.round((Date.now() - basladi) / 1000);
    void patchJob(id, { step: `model-cagriliyor · ${sn} sn` }).catch(() => {});
  }, HEARTBEAT_MS);

  try {
    const sonuc = await generateComposite(request, model, katman);
    clearInterval(kalp);

    let kabul: boolean | null = null;
    let puan: number | undefined;
    let gerekce: string | undefined;

    if (qualityGateEnabled()) {
      await patchJob(id, { step: "kare-denetleniyor" });
      const karar = await judgeComposite(request, sonuc, katman);
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
/**
 * Kapıdan geçen ilk kare, yoksa en yüksek puanlı kare.
 *
 * Puansız aday (hakem çökmüş) SONSUZ sayılır. Sebebi: zincir, kabul
 * edilmemiş bir kareden sonra daha güçlü modele yükseliyor ve puansız
 * denemede döngü zaten kırılıyor — yani puansız aday her zaman en son
 * ve en pahalı üretilendir. `?? 0` deseydik, hakem Pro çağrısından
 * sonra çökünce reddedilmiş ucuz kare kazanır, 0,142 $ çöpe giderdi.
 */
function enIyisi(adaylar: Aday[]): Aday | null {
  if (!adaylar.length) return null;
  const gecen = adaylar.find((a) => a.attempt.kabul === true);
  if (gecen) return gecen;
  const puan = (a: Aday) => a.attempt.puan ?? Number.POSITIVE_INFINITY;
  return adaylar.reduce((en, a) => (puan(a) > puan(en) ? a : en));
}

/* ==================================================================
   İLHAM / TÜRETİLMİŞ KOŞUSU

   Kompozisyon akışından üç yerde ayrılıyor:

   1. KALİTE KAPISI YOK. Hakemin rubriği üretilen kareyi ÜÇ REFERANSA
      karşı puanlıyor (ürün sadakati, kimlik koruma). Metinden üretimde
      karşılaştırılacak referans yok; kapıyı çalıştırmak anlamsız bir
      puan üretirdi.
   2. KAZANAN SEÇİMİ YOK. Kompozisyonda dört aday üretilip biri seçilir,
      ötekiler ÇÖPE gider. Burada dördü de kullanıcıya gidiyor — seçim
      kullanıcının.
   3. MODEL ZİNCİRİ YOK. Yükseltme "kapıdan geçemedi" durumuna bağlı;
      kapı olmayınca tetiği de yok.

   KISMİ BAŞARI KASITLI. Dört çağrının biri düşerse kalan üçü yine
   gösteriliyor. `Promise.all` ilk hatada hepsini düşürürdü; kullanıcı
   açısından üç kare sıfır kareden iyi ve ikinci bir tur ücretli.
   ================================================================== */
async function ilhamKosusu(job: Job): Promise<void> {
  const id = job.id;
  const katman: Katman = job.katman ?? VARSAYILAN_KATMAN;

  type Gorev = {
    eksen: JobKare["eksen"];
    prompt: string;
    aspect: string;
    referans?: { mimeType: string; data: string };
  };
  let gorevler: Gorev[];

  if (job.mod === "ilham") {
    const g = job.ilham;
    if (!g) return void (await basarisiz(id, "istek-yok", "İş kaydında istek metni yok."));
    gorevler = ILHAM_EKSENLERI.map((eksen) => ({
      eksen,
      prompt: buildIlhamPrompt(g.metin, g.kategori, eksen),
      aspect: g.aspect,
    }));
  } else {
    const t = job.turetilmis;
    if (!t) return void (await basarisiz(id, "istek-yok", "İş kaydında türetme isteği yok."));
    /* Referans kareyi kovadan indirip baytlarını modele veriyoruz.
       İstemciden tekrar yüklemesini istemek hem yavaş hem gereksiz:
       kare zaten bizde. */
    const dosya = await indir(t.kaynakYol);
    if (!dosya) {
      return void (await basarisiz(id, "kaynak-okunamadi", "Seçilen kare okunamadı. Tekrar deneyin."));
    }
    /* Referans BİR KEZ indirilip üç göreve de veriliyor — moodboard,
       kumaş ve branding aynı kareden türüyor. */
    const referans = { mimeType: dosya.mime, data: dosya.bayt.toString("base64") };
    gorevler = t.turler.map((tur) => ({
      eksen: tur,
      prompt: buildTuretilmisPrompt(tur, t.metin),
      aspect: t.aspect,
      referans,
    }));
  }

  await patchJob(id, { status: "processing", step: "model-cagriliyor" });
  const basladi = Date.now();
  const kalp = setInterval(() => {
    const sn = Math.round((Date.now() - basladi) / 1000);
    void patchJob(id, { step: `model-cagriliyor · ${sn} sn` }).catch(() => {});
  }, HEARTBEAT_MS);

  let sonuclar: PromiseSettledResult<Awaited<ReturnType<typeof generateFromText>>>[];
  try {
    sonuclar = await Promise.allSettled(
      gorevler.map((g) =>
        generateFromText(g.prompt, g.aspect, { katman, referans: g.referans }),
      ),
    );
  } finally {
    clearInterval(kalp);
  }

  const kareler: JobKare[] = [];
  let ilkHata: unknown = null;

  for (let i = 0; i < sonuclar.length; i += 1) {
    const s = sonuclar[i];
    if (s.status === "rejected") {
      ilkHata ??= s.reason;
      console.error(`ilhamKosusu: kare ${i} üretilemedi (${id}):`, s.reason);
      continue;
    }
    const kare = s.value;
    const eksen = gorevler[i].eksen;

    let imagePath: string | undefined;
    if (depoAcikMi()) {
      const uzanti = kare.mimeType === "image/png" ? "png" : kare.mimeType === "image/webp" ? "webp" : "jpg";
      const yol = `${id}/${eksen}.${uzanti}`;
      if (await dosyaYukle(yol, kare.mimeType, kare.data)) imagePath = yol;
    }
    kareler.push({
      eksen,
      imagePath,
      /* Depo kapalıysa ya da yükleme düştüyse kare yine gösterilir —
         yalnız kalıcı olmaz. Kompozisyon akışındaki aynı yedek. */
      dataUrl: imagePath ? undefined : `data:${kare.mimeType};base64,${kare.data}`,
      model: kare.model,
      ms: kare.ms,
    });
  }

  if (!kareler.length) {
    const mesaj =
      ilkHata instanceof ComposeError
        ? ilkHata.userMessage
        : `Beklenmeyen hata: ${ilkHata instanceof Error ? ilkHata.message : String(ilkHata)}`;
    return void (await basarisiz(id, "hata", mesaj));
  }

  await patchJob(id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    step: "bitti",
    kareler,
    meta: {
      model: kareler[0].model,
      ms: Date.now() - basladi,
      /* Kapı çalışmadı; `null` "denenmedi" demek, `false` "kaldı" demek
         olurdu ve ikisi karışmamalı. */
      kabul: null,
    },
  });
}

async function basarisiz(id: string, step: string, error: string): Promise<void> {
  await patchJob(id, {
    status: "failed",
    completedAt: new Date().toISOString(),
    step,
    error,
  });
}
