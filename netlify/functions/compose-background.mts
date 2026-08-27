import type { Config } from "@netlify/functions";
import { runJob } from "../../lib/ai/run";
import { patchJob } from "../../lib/ai/jobs";

/* ------------------------------------------------------------------
   Arka plan fonksiyonu — 15 dakikaya kadar çalışır ve çağrıldığı anda
   boş bir 202 döner. Kompozisyon üretimi 10–40 saniye sürdüğü için
   senkron uçların 10 saniyelik sınırına sığmaz.

   Sonuç istemciye değil, iş kaydına yazılır; istemci /api/jobs/:id
   ucundan durumu yoklar.
   ------------------------------------------------------------------ */
export default async function handler(request: Request) {
  let jobId: string | undefined;
  try {
    const body = (await request.json()) as { jobId?: unknown };
    if (typeof body.jobId === "string") jobId = body.jobId;
  } catch {
    // gövde okunamadı — aşağıda ele alınır
  }

  if (!jobId) {
    console.error("compose-background: jobId gelmedi");
    return;
  }

  // runJob kendi hatalarını yakalar; buradaki kalkan, modül yükleme ya da
  // beklenmeyen bir çökme durumunda işin sonsuza dek "processing" kalmasını önler.
  try {
    await runJob(jobId);
  } catch (error) {
    console.error("compose-background çöktü:", error);
    await patchJob(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      step: "fonksiyon-cokmesi",
      error: `Arka plan işi beklenmedik şekilde durdu: ${
        error instanceof Error ? error.message : String(error)
      }`,
      request: undefined,
    }).catch(() => {});
  }
}

export const config: Config = {
  background: true,
};
