"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TEMA_ANAHTARI, TEMA_ACIK } from "@/lib/tema";

/**
 * Tema anahtarı.
 *
 * HİDRASYON TUZAĞI VE ÇÖZÜMÜ. Sunucu hangi temada olduğumuzu bilemez —
 * tercih localStorage'da ve `<head>`teki betik sınıfı ilk boyamadan önce
 * yazıyor. Bu yüzden ikonu `useState` ile seçmek iki kötü seçenekten
 * birine zorlar: ya sunucu-istemci uyuşmazlığı, ya da ilk karede yanlış
 * ikon. Onun yerine İKİ İKON DA DOM'a basılıyor ve hangisinin görüneceğine
 * CSS karar veriyor (`dark:` varyantı). Böylece doğru ikon ilk boyamada,
 * JavaScript hiç çalışmadan yerinde oluyor.
 *
 * Gösterilen ikon GİDİLECEK yeri anlatıyor: koyu temadayken güneş
 * (tıklayınca aydınlanır), açık temadayken ay.
 *
 * Erişilebilir ad SABİT ("Temayı değiştir"). Duruma göre değişen bir ad
 * (“Açık temaya geç”) daha bilgilendirici olurdu ama sunucuda bilinemez,
 * yani aynı uyuşmazlığı geri getirirdi. Sabit ad hem doğru hem yeterli.
 *
 * FAZ 5 KAPSAMI: burada View Transition animasyonu YOK. MagicUI'nin
 * daire-açılım geçişi Faz 8'e bırakıldı; üç ayrı yaması var (azaltılmış
 * hareket tercihi CSS ile durdurulamıyor çünkü WAAPI ile çalışıyor,
 * pointer-events sızıntısı, ilk tık hatası) ve anahtarın kendisinin
 * çalışması onlara bağlı olmamalı.
 */
export function TemaAnahtari({ className }: { className?: string }) {
  /* Yalnız erişilebilir durumu bildirmek için; görünüm CSS'ten geliyor. */
  const [hazir, setHazir] = useState(false);
  useEffect(() => setHazir(true), []);

  const cevir = () => {
    const kok = document.documentElement;
    const koyuOlacak = !kok.classList.contains("dark");
    kok.classList.toggle("dark", koyuOlacak);
    try {
      localStorage.setItem(TEMA_ANAHTARI, koyuOlacak ? "koyu" : TEMA_ACIK);
    } catch {
      /* Gizli sekmede ya da depolama kapalıyken yazma patlıyor. Tema yine
         de dönsün: tercih kalıcı olmaz ama oturum içinde çalışır. */
    }
  };

  return (
    <button
      type="button"
      onClick={cevir}
      aria-label="Temayı değiştir"
      title="Temayı değiştir"
      /* Hazır olana kadar tıklanamaz: betik sınıfı yazmadan önce basılırsa
         localStorage ile DOM ters düşebilir. */
      disabled={!hazir}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full",
        "text-current transition-colors duration-300",
        "hover:bg-current/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current",
        className,
      )}
    >
      {/* Güneş — KOYU temada görünür, "aydınlat" demek. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        className="hidden h-[18px] w-[18px] dark:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Ay — AÇIK temada görünür. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block h-[18px] w-[18px] dark:hidden"
      >
        <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.6 6.6 0 0 0 9.5 9.5Z" />
      </svg>
    </button>
  );
}
