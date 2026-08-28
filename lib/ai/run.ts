import { ComposeError, generateComposite } from "./gemini";
import { getJob, patchJob } from "./jobs";

/* ------------------------------------------------------------------
   Bir işi baştan sona çalıştırır. İki yerden çağrılır:
   · yerelde  → /api/compose içinden, yanıt döndükten sonra
   · Netlify  → netlify/functions/compose-background.mts içinden

   Girdi görselleri işin başında kayıttan silinir: sonraki her yazma
   yarım megabaytlık veriyi tekrar tekrar taşımasın (ve görseller
   gereğinden uzun saklanmasın). Model çağrısı sürerken 10 saniyede bir
   kalp atışı yazılır — iş takılırsa sürecin ne zaman öldüğü görünür.
   ------------------------------------------------------------------ */

const HEARTBEAT_MS = 10_000;

export async function runJob(id: string): Promise<void> {
  const job = await getJob(id);
  if (!job) {
    console.error(`runJob: iş bulunamadı (${id})`);
    return;
  }
  if (!job.request) {
    await patchJob(id, { status: "failed", error: "İş kaydında girdi görselleri yok." });
    return;
  }
  if (job.status === "completed" || job.status === "processing") return;

  // Girdiyi belleğe al, kayıttan çıkar: bundan sonraki yazmalar küçük.
  const request = job.request;
  await patchJob(id, { status: "processing", step: "model-cagriliyor", request: undefined });

  const started = Date.now();
  let beats = 0;
  const heartbeat = setInterval(() => {
    beats += 1;
    const seconds = Math.round((Date.now() - started) / 1000);
    void patchJob(id, { step: `model-cagriliyor · ${seconds} sn` }).catch(() => {});
  }, HEARTBEAT_MS);

  try {
    const result = await generateComposite(request);
    clearInterval(heartbeat);
    await patchJob(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      step: "bitti",
      resultDataUrl: `data:${result.mimeType};base64,${result.data}`,
      meta: { model: result.model, ms: result.ms },
    });
  } catch (error) {
    clearInterval(heartbeat);
    const message =
      error instanceof ComposeError
        ? error.userMessage
        : `Beklenmeyen hata: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`runJob başarısız (${id}) · ${beats} kalp atışı:`, error);
    await patchJob(id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      step: "hata",
      error: message,
    });
  }
}
