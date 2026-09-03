import type { Metadata } from "next";
import { KolajStudio } from "@/components/kolaj-studio";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Collage — Parçalardan siluet",
  description: "Kareleri kesip üst üste bindirerek siluet, oran ve atmosfer denemesi.",
};

/* Tohum SUNUCUDA okunuyor: tuval açılışta dolu gelsin diye. Kayıt yoksa
   boş tuval açılıyor. */
export const dynamic = "force-dynamic";

export default async function CollagePage() {
  const tohum = await tohumOku();
  return <KolajStudio tohum={tohum} />;
}
