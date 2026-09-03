import type { Metadata } from "next";
import { KulturAnalizi } from "@/components/kultur-analizi";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Kültür analizi — Bu yön nereden geliyor",
  description: "Tasarım yönünün kültürel arka planı, canlı aramaya dayanan kaynaklarla.",
};

/* Tohum SUNUCUDA okunuyor: brief'i alana önceden yazmak için.
   Kayıt yoksa kullanıcı kendi metnini yazıyor. */
export const dynamic = "force-dynamic";

export default async function KulturPage() {
  const tohum = await tohumOku();
  return <KulturAnalizi tohum={tohum} />;
}
