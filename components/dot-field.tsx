"use client";

import { useEffect, useRef } from "react";

/**
 * Hero'nun nokta ızgarası.
 *
 * İki üst üste katman:
 *   1. taban  — sönük noktalar, her zaman görünür
 *   2. parlak — aynı ızgaranın açık renkli kopyası, yalnızca imlecin
 *               çevresinde `mask-image` ile açılıyor
 *
 * Izgaranın kendisi CSS'te tek bir `background-image` tekrarı (globals.css,
 * `.selvi-izgara-katman`). Burada yapılan tek iş, parlak katmanın maskesini
 * imlecin altına taşımak.
 *
 * Önceki sürüm canvas'ta her karede ~2.400 daire çiziyordu. Hem pahalıydı hem
 * de sonuç seyrek ve sönük olduğu için "sis" gibi duruyordu. Referans aldığımız
 * Stitch hero'su bu maske yöntemini kullanıyor: aralık 10px, ışık yarıçapı
 * 120px, imleç durduktan 800 ms sonra sönme.
 */

const ISIK = 170; // imleç parıltısının yarıçapı (px)
const SOLMA = 800; // imleç durduktan sonra sönme süresi (ms)

// Tamamen saydam maske: parlak katmanı bütünüyle gizler.
const GIZLI = "linear-gradient(transparent, transparent)";

function maske(x: number, y: number, a: number) {
  return (
    `radial-gradient(circle ${ISIK}px at ${x}px ${y}px, ` +
    `rgba(0, 0, 0, ${a}) 0%, ` +
    `rgba(0, 0, 0, ${a * 0.8}) 25%, ` +
    `rgba(0, 0, 0, ${a * 0.4}) 55%, ` +
    `transparent 100%)`
  );
}

export function DotField({ className = "" }: { className?: string }) {
  const parlakRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parlak = parlakRef.current;
    if (!parlak) return;

    let x = 0;
    let y = 0;
    let sonHareket = 0;
    let cerceve = 0;

    function uygula(deger: string) {
      parlak!.style.maskImage = deger;
      parlak!.style.webkitMaskImage = deger;
    }

    function ciz(zaman: number) {
      const alfa = 1 - Math.min((zaman - sonHareket) / SOLMA, 1);

      // Söndü: maskeyi kapat ve döngüyü bırak. İmleç yeniden kıpırdayana
      // kadar hiçbir iş yapılmıyor.
      if (alfa <= 0.01) {
        uygula(GIZLI);
        cerceve = 0;
        return;
      }

      uygula(maske(x, y, alfa));
      cerceve = requestAnimationFrame(ciz);
    }

    function fareHareket(e: PointerEvent) {
      const r = parlak!.getBoundingClientRect();
      // Izgara yalnızca hero'yu kaplıyor; imleç dışarıdayken uğraşmıyoruz.
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      sonHareket = performance.now();
      // Maskeyi hemen uygula: rAF'ı beklersek ışık imlecin bir kare gerisinde
      // kalıyor. Döngünün işi bundan sonrası, yani sönme.
      uygula(maske(x, y, 1));
      if (!cerceve) cerceve = requestAnimationFrame(ciz);
    }

    function fareCik() {
      // Sönmeyi hemen başlat: bir sonraki karede alfa düşmeye başlıyor.
      sonHareket = performance.now() - SOLMA;
    }

    uygula(GIZLI);
    window.addEventListener("pointermove", fareHareket, { passive: true });
    window.addEventListener("pointerleave", fareCik, { passive: true });

    return () => {
      if (cerceve) cancelAnimationFrame(cerceve);
      window.removeEventListener("pointermove", fareHareket);
      window.removeEventListener("pointerleave", fareCik);
    };
  }, []);

  return (
    <div aria-hidden className={className}>
      <div className="selvi-izgara-katman selvi-izgara-taban" />
      <div ref={parlakRef} className="selvi-izgara-katman selvi-izgara-parlak" />
    </div>
  );
}
