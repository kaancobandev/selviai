"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { TemaAnahtari } from "@/components/tema-anahtari";

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
  /* Site kroması artık HER ZAMAN koyu; açık/koyu ternary'si kalktı. Hero'nun
     üstündeyken zemin şeffaf kalıyor — bar hero'nun tepesine oturmasın diye.
     Eski koşul (scrolled || workspace) yüzünden /giris, /market, /akademi ve
     404'ün tepesinde header hem şeffaf hem beyaz yazılıydı; !overHero bunu da
     kapatıyor. */
  const overHeroSayfasi = overHero && !scrolled && !open;
  const solid = !overHeroSayfasi;

  const isActive = (href: string) =>
    !href.includes("#") && (pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,color,border-color] duration-700 ease-[var(--ease-out-quart)]",
          /* Renk ARTIK kosula bagli. Onceden `text-paper` kosulsuzdu; koyu
             sitede dogruydu cunku bar ya koyu zeminliydi ya koyu hero'nun
             ustundeydi. Acik temada ikisi ayrisiyor:
             · solid  → bar SAYFA renginde, yani temayla doner (kalem/zemin)
             · seffaf → bar HERO'nun ustunde. Hero kalici koyu ada ve token
               yeniden baglamiyor, o yuzden burada MUTLAK beyaz sart. */
          /* `koyu-ada` YALNIZ şeffaf dalda. Bar o hâldeyken hero'nun ÜSTÜNDE
             duruyor ama hero'nun İÇİNDE değil, yani hero'nun token bloğunu
             miras almıyor. Sonuç sessiz bir erişilebilirlik hatası: açık
             temada `--color-odak` #0b0b0b oluyor ve nav bağlantılarının
             klavye odağı koyu hero'nun üstünde siyah-üstüne-siyah kalıyor.
             Zeminli dalda sınıf YOK — orada bar sayfanın rengini alıyor ve
             token'ların temayla dönmesi doğru olan. */
          solid
            ? "border-hair bg-zemin/85 text-kalem backdrop-blur-md"
            : "koyu-ada border-transparent bg-transparent text-paper",
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

          <div className="flex items-center gap-4 sm:gap-7">
            {/* Tema anahtarı, "Stüdyoyu aç"ın SOLUNDA. Rengi yok: header'ın
                `text-kalem` / `text-paper` durumundan currentColor ile
                miras alıyor, yani hero üstünde beyaz, zeminli barda
                sayfanın metin rengi oluyor. */}
            <TemaAnahtari className="-ml-2" />
            {/* Sepet silindi: state'i, context'i, localStorage anahtarı yoktu;
                "(0)" JSX'e gömülü sabit metindi. Ürün abonelik satıyor.
                Giriş de silindi: form yalnız "prototip" toast'ı gösteriyor. */}
            <Link
              href="/hizmetler/kompozisyon"
              /* bg-kalem/text-zemin cifti hapi HER İKİ temada da sayfanin
                 zittina boyuyor: koyuda beyaz hap-siyah yazi, acikta siyah
                 hap-beyaz yazi. Hero'nun ustunde ise mutlak kaliyor.
                 Uzerine gelme rengi lila-soft'tan vurgu ciftine tasindi:
                 lila-soft (#bfa6ee) sabit ACIK bir lila, acik temada uzerine
                 gelen beyaz yazi 1,9:1'e dusuyordu. vurgu/vurgu-kalem cifti
                 tam bunun icin var — koyuda #bfa6ee+siyah, acikta #6e51a0+beyaz. */
              className={cn(
                "eyebrow hidden h-10 items-center rounded-full px-5 transition-colors duration-300 hover:bg-vurgu hover:text-vurgu-kalem sm:inline-flex",
                solid ? "bg-kalem text-zemin" : "bg-paper text-ink",
              )}
            >
              Stüdyoyu aç
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
          "fixed inset-0 z-40 flex flex-col bg-zemin px-5 pt-28 pb-10 text-kalem transition-opacity duration-500 md:hidden",
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
                "border-b border-hair py-5 font-display text-4xl leading-none transition-[opacity,translate] duration-700 ease-[var(--ease-out-quart)]",
                open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
              style={{ transitionDelay: open ? `${120 + i * 70}ms` : "0ms" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-4">
          <Link
            href="/hizmetler/kompozisyon"
            className="eyebrow u-line"
            onClick={() => setOpen(false)}
          >
            Stüdyoyu aç
          </Link>
          <span className="eyebrow text-ash">{site.tagline}</span>
        </div>
      </div>
    </>
  );
}
