import type { Metadata } from "next";
import { FabricLab } from "@/components/fabric-lab";

export const metadata: Metadata = {
  title: "Kumaş — Dijital kartela",
  description: "Makro dokularıyla kumaş kütüphanesi; metraj, ağırlık, esneklik ve döküm ölçümleri.",
};

export default function FabricPage() {
  return <FabricLab />;
}
