import type { Config } from "@netlify/functions";
import { runJob } from "../../lib/ai/run";

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

  await runJob(jobId);
}

export const config: Config = {
  background: true,
  path: "/.netlify/functions/compose-background",
};
