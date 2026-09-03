import type { Metadata } from "next";
import { FabricLab } from "@/components/fabric-lab";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Kumaş — Dijital kartela",
  description: "Makro dokularıyla kumaş kütüphanesi; metraj, ağırlık, esneklik ve döküm ölçümleri.",
};


/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner ve araç eski varsayılanlarıyla açılır. */
export const dynamic = "force-dynamic";

export default async function FabricPage() {
  const tohum = await tohumOku();
  return <FabricLab tohum={tohum} />;
}
