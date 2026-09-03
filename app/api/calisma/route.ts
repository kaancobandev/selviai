import { NextResponse } from "next/server";
import { calismaYaz, getJob } from "@/lib/ai/jobs";
import { oturumOku } from "@/lib/ai/session";
import type { Calisma } from "@/lib/ai/types";

/* ------------------------------------------------------------------
   ÇALIŞMA KAYDI — ana sayfa yazar, stüdyo okur.

   Ana sayfa "şu işin şu karesini seçtim" diyor; stüdyo sayfaları bunu
   sunucu tarafında okuyup araçlara tohum olarak geçiriyor.

   İSTEMCİYE GÜVENİLMİYOR. Gövdeden yalnız iş kimlikleri ve sıra
   alınıyor; kaydın gerçekten bu oturuma ait olduğu sunucuda
   doğrulanıyor. Aksi hâlde başkasının işini kendi çalışmasına
   bağlayan bir istek yazılabilirdi.
   ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const oturum = await oturumOku();
  if (!oturum) return new Response("Oturum yok", { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Gövde okunamadı." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const ilhamIs = typeof b.ilhamIs === "string" ? b.ilhamIs : "";
  const secilenSira = Number(b.secilenSira);
  if (!ilhamIs || !Number.isInteger(secilenSira) || secilenSira < 0) {
    return NextResponse.json({ error: "Seçim eksik." }, { status: 400 });
  }

  const is = await getJob(ilhamIs);
  if (!is || is.sessionId !== oturum) {
    return NextResponse.json({ error: "İş bulunamadı." }, { status: 404 });
  }
  if (!is.kareler?.[secilenSira]) {
    return NextResponse.json({ error: "Seçilen kare yok." }, { status: 400 });
  }

  const turetIsId = typeof b.turetIs === "string" ? b.turetIs : undefined;
  if (turetIsId) {
    const turet = await getJob(turetIsId);
    if (!turet || turet.sessionId !== oturum) {
      return NextResponse.json({ error: "Türetme işi bulunamadı." }, { status: 404 });
    }
  }

  const calisma: Calisma = {
    brief: typeof b.brief === "string" ? b.brief.slice(0, 600) : "",
    ilhamIs,
    secilenSira,
    turetIs: turetIsId,
    guncellendi: new Date().toISOString(),
  };
  await calismaYaz(oturum, calisma);

  return NextResponse.json({ tamam: true });
}
