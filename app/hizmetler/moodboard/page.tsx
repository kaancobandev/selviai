import type { Metadata } from "next";
import { MoodboardStudio } from "@/components/moodboard-studio";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Moodboard — Yön sayfası",
  description: "Seçilen yönü ızgara, palet ve tek cümleyle anlatan sunum sayfası.",
};

/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner ve araç boş kalıpla açılır. */
export const dynamic = "force-dynamic";

export default async function MoodboardPage() {
  const tohum = await tohumOku();
  return <MoodboardStudio tohum={tohum} />;
}
