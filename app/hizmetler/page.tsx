import type { Metadata } from "next";
import { InspirationBoard } from "@/components/inspiration-board";

export const metadata: Metadata = {
  title: "Hizmetler — İlham panosu",
  description: "Çalışma alanı: ilk durak ilham panosu.",
};

/** /hizmetler — statik export'ta redirect yerine ilk çalışma alanı doğrudan burada açılır. */
export default function ServicesIndex() {
  return <InspirationBoard />;
}
