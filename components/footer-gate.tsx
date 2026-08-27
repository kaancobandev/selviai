"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Çalışma alanı rotalarında (/hizmetler) footer gizlenir; tuval ekranı doldurur. */
export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/hizmetler")) return null;
  return <>{children}</>;
}
