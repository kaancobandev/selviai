import type { Metadata } from "next";
import { BrandStudio } from "@/components/brand-studio";
import { brandFontClass } from "@/lib/brand-fonts";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Branding — Marka sistemi",
  description: "Logo, tipografi, renk ve canlı uygulama: markanın görsel kimliğini tek akışta kurun.",
};

/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner ve araç eski varsayılanlarıyla açılır. */
export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const tohum = await tohumOku();
  // Ek yazı tipi değişkenleri yalnızca bu sayfada tanımlanır
  return (
    <div className={`${brandFontClass} flex flex-1 flex-col`}>
      <BrandStudio tohum={tohum} />
    </div>
  );
}
