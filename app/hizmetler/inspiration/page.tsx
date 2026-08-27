import type { Metadata } from "next";
import { InspirationBoard } from "@/components/inspiration-board";

export const metadata: Metadata = {
  title: "Inspiration — İlham panosu",
  description: "Görsel, not ve renk paletlerinden kendi ilham panonuzu kurun.",
};

export default function InspirationPage() {
  return <InspirationBoard />;
}
