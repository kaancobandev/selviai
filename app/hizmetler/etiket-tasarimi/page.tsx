import type { Metadata } from "next";
import { LabelStudio } from "@/components/label-studio";

export const metadata: Metadata = {
  title: "Etiket — Etiket stüdyosu",
  description: "Dokuma, asma ve bakım etiketlerini gerçek ölçekte tasarlayın; üretim şartnamesini oluşturun.",
};

export default function LabelPage() {
  return <LabelStudio />;
}
