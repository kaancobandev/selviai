import type { Metadata } from "next";
import { ShootDesk } from "@/components/shoot-desk";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Shooting — Prodüksiyon masası",
  description: "Ekip, mekân, ışık, look–model eşleştirme, prop listesi ve call sheet — tek ekranda çekim yönetimi.",
};


/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner ve araç eski varsayılanlarıyla açılır. */
export const dynamic = "force-dynamic";

export default async function ShootingPage() {
  const tohum = await tohumOku();
  return <ShootDesk tohum={tohum} />;
}
