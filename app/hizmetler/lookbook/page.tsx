import type { Metadata } from "next";
import { LookbookStudio } from "@/components/lookbook-studio";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Lookbook — Editoryal sunum",
  description: "Koleksiyonu kapak, sayfa dizgisi ve künyeyle alıcıya anlatan lookbook.",
};

/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner ve araç örnek kitapla açılır. */
export const dynamic = "force-dynamic";

export default async function LookbookPage() {
  const tohum = await tohumOku();
  return <LookbookStudio tohum={tohum} />;
}
