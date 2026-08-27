import { ComposeError, generateComposite } from "./gemini";
import { getJob, patchJob } from "./jobs";

/* ------------------------------------------------------------------
   Bir işi baştan sona çalıştırır. İki yerden çağrılır:
   · yerelde  → /api/compose içinden, yanıt döndükten sonra
   · Netlify  → netlify/functions/compose-background.mts içinden
   ------------------------------------------------------------------ */
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

  await patchJob(id, { status: "processing", step: "model-cagriliyor" });

  try {
    const result = await generateComposite(job.request);
    await patchJob(id, { step: "sonuc-yaziliyor" });
    await patchJob(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      step: "bitti",
      resultDataUrl: `data:${result.mimeType};base64,${result.data}`,
      meta: { model: result.model, ms: result.ms },
      // Girdi görsellerini sonuç yazıldıktan sonra tutmuyoruz.
      request: undefined,
    });
  } catch (error) {
    const message =
      error instanceof ComposeError
        ? error.userMessage
        : `Beklenmeyen hata: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`runJob başarısız (${id}):`, error);
    await patchJob(id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      step: "hata",
      error: message,
      request: undefined,
    });
  }
}
