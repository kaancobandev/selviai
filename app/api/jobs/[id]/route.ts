import { NextResponse } from "next/server";
import { getJob, patchJob } from "@/lib/ai/jobs";
import { girdiYollari } from "@/lib/ai/resolve";
import { girdileriSil } from "@/lib/ai/storage";
import { toJobView } from "@/lib/ai/types";

/** Kalp atışı 10 sn'de bir gelir; bu kadar sessizlik süreç öldü demektir. */
const STALE_MS = 90_000;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return NextResponse.json({ error: "İş kaydı bulunamadı." }, { status: 404 });
  }

  /*
   * Sessizce ölmüş işi toparla. "queued" de kapsanıyor: arka plan
   * fonksiyonu çağrıyı alır almaz 202 döndüğü için, handler içindeki
   * her erken çıkış (imza reddi, gövde okunamadı, modül yükleme hatası)
   * çağıran tarafa BAŞARILI görünüyor ve iş sonsuza dek kuyrukta kalıyordu.
   * Toparlama burada yapılıyor, fonksiyonun imza-reddi dalında DEĞİL:
   * o dal imzasız çağrılara açık ve oradan yazmak, jobId'yi bilen birine
   * meşru bir işin girdilerini sildirme imkânı verirdi.
   */
  if (job.status === "processing" || job.status === "queued") {
    const last = Date.parse(job.updatedAt ?? job.createdAt);
    if (Number.isFinite(last) && Date.now() - last > STALE_MS) {
      // Girdiler artık kullanılmayacak; yüz fotoğrafları depoda kalmasın.
      if (job.request) await girdileriSil(girdiYollari(job.request));
      const dead =
        (await patchJob(id, {
          status: "failed",
          completedAt: new Date().toISOString(),
          step: job.status === "queued" ? "baslatilamadi" : "surec-durdu",
          error: "Üretim süreci beklenmedik şekilde durdu. Tekrar deneyin.",
          request: undefined,
        })) ?? job;
      return NextResponse.json(toJobView(dead), { headers: { "cache-control": "no-store" } });
    }
  }

  return NextResponse.json(toJobView(job), {
    headers: { "cache-control": "no-store" },
  });
}
