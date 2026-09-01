"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Rota değişince menüyü kapat (render sırasında türetilen durum)
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Çalışma alanı rotalarında header her zaman zeminli ve çizgili
  const workspace = pathname.startsWith("/hizmetler");
  const light = overHero && !scrolled && !open;
  const solid = (scrolled || workspace) && !open;

  const isActive = (href: string) =>
    !href.includes("#") && (pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,color,border-color] duration-700 ease-[var(--ease-out-quart)]",
          light ? "text-bone" : "text-ink",
          solid
            ? "border-mist bg-bone/85 backdrop-blur-md"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 md:h-20 md:px-10">
          <Link
            href="/"
            className="font-display text-[22px] leading-none tracking-[-0.01em] md:text-2xl"
            aria-label={`${site.name} — anasayfa`}
          >
            {site.name}
          </Link>

          <nav aria-label="Ana menü" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="eyebrow u-line"
                data-active={isActive(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-7">
            <Link href="/giris" className="eyebrow u-line hidden sm:inline-block">
              Giriş
            </Link>
            <Link href="/market" className="eyebrow u-line">
              Sepet <span className="tabular-nums">(0)</span>
            </Link>
            <button
              type="button"
              className="relative -mr-1 flex h-8 w-8 items-center justify-center md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
              onClick={() => setOpen((v) => !v)}
            >
              <span
                className={cn(
                  "absolute h-px w-5 bg-current transition-transform duration-500 ease-[var(--ease-out-expo)]",
                  open ? "rotate-45" : "-translate-y-[3px]",
                )}
              />
              <span
                className={cn(
                  "absolute h-px w-5 bg-current transition-transform duration-500 ease-[var(--ease-out-expo)]",
                  open ? "-rotate-45" : "translate-y-[3px]",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobil menü — tam ekran, büyük serif bağlantılar */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-bone px-5 pt-28 pb-10 text-ink transition-opacity duration-500 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
      >
        <nav aria-label="Mobil menü" className="flex flex-col gap-1">
          {site.nav.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "border-b border-mist py-5 font-display text-4xl leading-none transition-[opacity,translate] duration-700 ease-[var(--ease-out-quart)]",
                open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
              style={{ transitionDelay: open ? `${120 + i * 70}ms` : "0ms" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between">
          <Link href="/giris" className="eyebrow u-line" onClick={() => setOpen(false)}>
            Giriş
          </Link>
          <span className="eyebrow text-ash">{site.tagline}</span>
        </div>
      </div>
    </>
  );
}
