import type { Metadata } from "next";
import { BrandStudio } from "@/components/brand-studio";
import { brandFontClass } from "@/lib/brand-fonts";

export const metadata: Metadata = {
  title: "Branding — Marka sistemi",
  description: "Logo, tipografi, renk ve canlı uygulama: markanın görsel kimliğini tek akışta kurun.",
};

export default function BrandingPage() {
  // Ek yazı tipi değişkenleri yalnızca bu sayfada tanımlanır
  return (
    <div className={`${brandFontClass} flex flex-1 flex-col`}>
      <BrandStudio />
    </div>
  );
}
