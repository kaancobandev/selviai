"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { services } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Arrow } from "@/components/ui/button";
import { site } from "@/lib/site";

/**
 * Hizmetler çalışma alanının dikey menüsü.
 * Masaüstünde sol kenarda yapışkan; mobilde header altında yatay şerit.
 * Aktif sekme: ince yatay çizgi + hafif ağırlık. Hover: 2px kayma, renk koyulaşması.
 */
export function ServicesNav() {
  const pathname = usePathname();
  const isActive = (slug: string) =>
    pathname === `/hizmetler/${slug}` || (slug === "inspiration" && pathname === "/hizmetler");
  const galeriAktif = pathname === "/hizmetler/kompozisyon/galeri";

  return (
    <>
      {/* Masaüstü — dikey, yapışkan */}
      <aside className="sticky top-20 hidden h-[calc(100svh-5rem)] w-60 shrink-0 flex-col overflow-y-auto border-r border-mist bg-bone px-8 pb-8 pt-10 lg:flex xl:w-64">
        {/* Araç — disiplinlerden ayrı durur */}
        <p className="eyebrow text-ash">Stüdyo</p>
        <nav aria-label="Stüdyo araçları" className="mt-5 flex flex-col">
          <Link
            href="/hizmetler/kompozisyon"
            aria-current={isActive("kompozisyon") ? "page" : undefined}
            className={cn(
              "relative flex items-center py-2.5 text-[13.5px] leading-5 transition-[color,padding-left] duration-500 ease-[var(--ease-out-expo)]",
              isActive("kompozisyon")
                ? "pl-7 font-medium text-ink"
                : "pl-0 text-smoke hover:pl-2 hover:text-ink",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 h-px -translate-y-1/2 bg-ink transition-[width,opacity] duration-500 ease-[var(--ease-out-expo)]",
                isActive("kompozisyon") ? "w-4 opacity-100" : "w-0 opacity-0",
              )}
            />
            Kompozisyon
          </Link>
          <Link
            href="/hizmetler/kompozisyon/galeri"
            aria-current={galeriAktif ? "page" : undefined}
            className={cn(
              "relative flex items-center py-2.5 text-[13.5px] leading-5 transition-[color,padding-left] duration-500 ease-[var(--ease-out-expo)]",
              galeriAktif
                ? "pl-7 font-medium text-ink"
                : "pl-0 text-smoke hover:pl-2 hover:text-ink",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 h-px -translate-y-1/2 bg-ink transition-[width,opacity] duration-500 ease-[var(--ease-out-expo)]",
                galeriAktif ? "w-4 opacity-100" : "w-0 opacity-0",
              )}
            />
            Galeri
          </Link>
        </nav>
        <div aria-hidden className="seam my-6 text-ink" />
        <p className="eyebrow text-ash">Hizmetler</p>
        <nav aria-label="Hizmetler" className="mt-5 flex flex-col">
          {services.map((s) => {
            const active = isActive(s.slug);
            return (
              <Link
                key={s.slug}
                href={`/hizmetler/${s.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center py-2.5 text-[13.5px] leading-5 transition-[color,padding-left] duration-500 ease-[var(--ease-out-expo)]",
                  active
                    ? "pl-7 font-medium text-ink"
                    : "pl-0 text-smoke hover:pl-2 hover:text-ink",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 h-px -translate-y-1/2 bg-ink transition-[width,opacity] duration-500 ease-[var(--ease-out-expo)]",
                    active ? "w-4 opacity-100" : "w-0 opacity-0",
                  )}
                />
                {s.short}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-mist pt-6">
          <p className="text-[11px] leading-4 text-ash">On disiplin. Tek başına ya da bütün olarak.</p>
          <a
            href={`mailto:${site.email}?subject=Teklif`}
            className="group mt-4 inline-flex items-center gap-3 eyebrow u-line"
          >
            Teklif al
            <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
          </a>
        </div>
      </aside>

      {/* Mobil — yatay şerit */}
      <div className="sticky top-16 z-30 border-b border-mist bg-bone/90 backdrop-blur-md lg:hidden">
        <nav
          aria-label="Hizmetler"
          className="flex gap-7 overflow-x-auto px-5 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Link
            href="/hizmetler/kompozisyon"
            aria-current={isActive("kompozisyon") ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b py-4 text-[13px] transition-colors duration-500",
              isActive("kompozisyon")
                ? "border-ink font-medium text-ink"
                : "border-transparent text-smoke",
            )}
          >
            Kompozisyon
          </Link>
          <Link
            href="/hizmetler/kompozisyon/galeri"
            aria-current={galeriAktif ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b py-4 text-[13px] transition-colors duration-500",
              galeriAktif ? "border-ink font-medium text-ink" : "border-transparent text-smoke",
            )}
          >
            Galeri
          </Link>
          <span aria-hidden className="my-4 w-px shrink-0 bg-mist" />
          {services.map((s) => {
            const active = isActive(s.slug);
            return (
              <Link
                key={s.slug}
                href={`/hizmetler/${s.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap border-b py-4 text-[13px] transition-colors duration-500",
                  active ? "border-ink font-medium text-ink" : "border-transparent text-smoke",
                )}
              >
                {s.short}
              </Link>
            );
          })}
          <span aria-hidden className="w-6 shrink-0" />
        </nav>
      </div>
    </>
  );
}
