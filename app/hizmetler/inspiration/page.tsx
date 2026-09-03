import type { Metadata } from "next";
import { InspirationBoard } from "@/components/inspiration-board";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Inspiration — İlham panosu",
  description: "Görsel, not ve renk paletlerinden kendi ilham panonuzu kurun.",
};


/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı ve
   istemciye taşınacak bir şey yok. Kayıt yoksa null döner, pano da
   eski örnek içeriğiyle açılır. */
export const dynamic = "force-dynamic";

export default async function InspirationPage() {
  const tohum = await tohumOku();
  return <InspirationBoard tohum={tohum} />;
}
