import type { Metadata } from "next";
import { FlatSketch } from "@/components/flat-sketch";
import { tohumOku } from "@/lib/ai/tohum";

export const metadata: Metadata = {
  title: "Teknik Çizim — Dijital kalıp ve çizim tuvali",
  description: "Tarayıcıda vektörel teknik çizim: kalem, seçim, mezura, makas, dikiş tipleri, kumaş dolgusu; ön/arka/detay görünümleri.",
};


/* Tohum SUNUCUDA okunuyor: çalışma kaydı oturum çerezine bağlı.
   Kayıt yoksa null döner ve araç eski varsayılanlarıyla açılır. */
export const dynamic = "force-dynamic";

export default async function FlatSketchPage() {
  const tohum = await tohumOku();
  return <FlatSketch tohum={tohum} />;
}
