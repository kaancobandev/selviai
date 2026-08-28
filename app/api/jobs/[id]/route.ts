import { NextResponse } from "next/server";
import { getJob, patchJob } from "@/lib/ai/jobs";
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

  // Üretim süreci sessizce ölmüşse iş sonsuza dek "işleniyor" kalmasın.
  if (job.status === "processing") {
    const last = Date.parse(job.updatedAt ?? job.createdAt);
    if (Number.isFinite(last) && Date.now() - last > STALE_MS) {
      const dead =
        (await patchJob(id, {
          status: "failed",
          completedAt: new Date().toISOString(),
          step: "surec-durdu",
          error: "Üretim süreci beklenmedik şekilde durdu. Tekrar deneyin.",
        })) ?? job;
      return NextResponse.json(toJobView(dead), { headers: { "cache-control": "no-store" } });
    }
  }

  return NextResponse.json(toJobView(job), {
    headers: { "cache-control": "no-store" },
  });
}
