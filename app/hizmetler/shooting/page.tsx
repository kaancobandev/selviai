import type { Metadata } from "next";
import { ShootDesk } from "@/components/shoot-desk";

export const metadata: Metadata = {
  title: "Shooting — Prodüksiyon masası",
  description: "Ekip, mekân, ışık, look–model eşleştirme, prop listesi ve call sheet — tek ekranda çekim yönetimi.",
};

export default function ShootingPage() {
  return <ShootDesk />;
}
