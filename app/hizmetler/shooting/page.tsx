import type { Metadata } from "next";
import { CekimListesi } from "@/components/shoot-desk";
import { tohumOku } from "@/lib/ai/tohum";

/* Açıklama önce ekip / mekân / call sheet, sonra da ışık senaryosu ve
   look–model eşleştirme sayıyordu; hiçbiri kalmadı. Araç artık tek bir
   şey yapıyor (bkz. components/shoot-desk.tsx). */
export const metadata: Metadata = {
  title: "Shooting — Çekim listesi",
  description: "Tasarladığınız giysiden çekilecek karelerin listesi: her satır bir kadraj, bir ışık senaryosu ve bir üretim.",
};


/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner; araç yine açılır ve önce tasarım gerektiğini
   kendisi söyler. */
export const dynamic = "force-dynamic";

export default async function ShootingPage() {
  const tohum = await tohumOku();
  return <CekimListesi tohum={tohum} />;
}
