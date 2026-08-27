import { NextResponse } from "next/server";
import { getJob } from "@/lib/ai/jobs";
import { toJobView } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return NextResponse.json({ error: "İş kaydı bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(toJobView(job), {
    headers: { "cache-control": "no-store" },
  });
}
