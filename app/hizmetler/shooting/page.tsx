import type { Metadata } from "next";
import { ShootDesk } from "@/components/shoot-desk";
import { tohumOku } from "@/lib/ai/tohum";

/* Açıklama ekip / mekân / call sheet sayıyordu; üçü de kaldırıldı
   (bkz. components/shoot-desk.tsx). Geriye çekimin yaratıcı kısmı kaldı. */
export const metadata: Metadata = {
  title: "Shooting — Prodüksiyon masası",
  description: "Işık senaryosu, tearsheet referansları, look–model eşleştirme ve prop listesi — tek ekranda çekim hazırlığı.",
};


/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner ve araç eski varsayılanlarıyla açılır. */
export const dynamic = "force-dynamic";

export default async function ShootingPage() {
  const tohum = await tohumOku();
  return <ShootDesk tohum={tohum} />;
}
