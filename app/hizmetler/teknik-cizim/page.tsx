import type { Metadata } from "next";
import { FlatSketch } from "@/components/flat-sketch";

export const metadata: Metadata = {
  title: "Teknik Çizim — Dijital kalıp ve çizim tuvali",
  description: "Tarayıcıda vektörel teknik çizim: kalem, seçim, mezura, makas, dikiş tipleri, kumaş dolgusu; ön/arka/detay görünümleri.",
};

export default function FlatSketchPage() {
  return <FlatSketch />;
}
