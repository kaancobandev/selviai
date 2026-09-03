import type { Metadata } from "next";
import { LabelStudio } from "@/components/label-studio";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Etiket — Etiket stüdyosu",
  description: "Dokuma, asma ve bakım etiketlerini gerçek ölçekte tasarlayın; üretim şartnamesini oluşturun.",
};


/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner ve araç eski varsayılanlarıyla açılır. */
export const dynamic = "force-dynamic";

export default async function LabelPage() {
  const tohum = await tohumOku();
  return <LabelStudio tohum={tohum} />;
}
