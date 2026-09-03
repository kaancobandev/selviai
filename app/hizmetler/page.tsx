import type { Metadata } from "next";
import { InspirationBoard } from "@/components/inspiration-board";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Hizmetler — İlham panosu",
  description: "Çalışma alanı: ilk durak ilham panosu.",
};

/** /hizmetler — statik export'ta redirect yerine ilk çalışma alanı doğrudan burada açılır. */

/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı ve
   istemciye taşınacak bir şey yok. Kayıt yoksa null döner, pano da
   eski örnek içeriğiyle açılır. */
export const dynamic = "force-dynamic";

export default async function ServicesIndex() {
  const tohum = await tohumOku();
  return <InspirationBoard tohum={tohum} />;
}
