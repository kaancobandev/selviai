import type { Metadata } from "next";
import { ComposeStudio } from "@/components/compose-studio";

export const metadata: Metadata = {
  title: "Kompozisyon — Üç görsel, tek kare",
  description:
    "Kişi, ürün ve arka plan görsellerini yapay zekâ ile tek editoryal fotoğrafta birleştirin.",
};

export default function ComposePage() {
  return <ComposeStudio />;
}
