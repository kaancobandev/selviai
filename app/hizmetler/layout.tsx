import type { ReactNode } from "react";
import { ServicesNav } from "@/components/services-nav";

/**
 * Hizmetler çalışma alanı: solda yapışkan dikey menü, sağda içerik.
 * Footer bu rotalarda gizlenir (FooterGate); içerik ekranı doldurur.
 */
export default function ServicesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ada-acik flex flex-1 flex-col pt-16 md:pt-20">
      <div className="flex flex-1 flex-col lg:flex-row">
        <ServicesNav />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
