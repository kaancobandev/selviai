"use client";

import { useEffect, useRef } from "react";

/**
 * Hero'nun nokta ızgarası.
 *
 * Neden canvas: 1440×900'de ~2.900 nokta düşüyor. Bunları DOM öğesi yapmak
 * her karede 2.900 stil hesabı demek; canvas'ta tek bir çizim döngüsü oluyor.
 *
 * Etkileşim: imlecin çevresindeki noktalar büyüyüp parlıyor. İmleç konumu
 * doğrudan değil, yumuşatılarak (lerp) takip ediliyor — fare sıçradığında
 * ışık da sıçramasın diye.
 *
 * Açılış: noktalar hemen görünmüyor; `girisSuresi` boyunca soluklaşarak
 * geliyor. Referans aldığımız Stitch hero'sunda da nokta katmanı aurora'dan
 * yaklaşık iki saniye sonra beliriyordu.
 */

const ARALIK = 22;          // noktalar arası mesafe (px)
const TABAN_YARICAP = 1.0;  // dinlenme hâlindeki nokta yarıçapı
const TEPE_YARICAP = 2.4;   // imlecin tam altındaki yarıçap
const TABAN_ALFA = 0.24;
const TEPE_ALFA = 0.95;
const ETKI = 150;           // imlecin etki yarıçapı (px)
const GIRIS_SURESI = 1400;  // noktaların belirme süresi (ms)
const GECIKME = 900;        // aurora yerleşsin diye beklenen süre (ms)

export function DotField({ className = "" }: { className?: string }) {
  const tuvalRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const tuval = tuvalRef.current;
    if (!tuval) return;
    const ctx = tuval.getContext("2d");
    if (!ctx) return;

    const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let gen = 0;
    let yuk = 0;
    let opr = Math.min(window.devicePixelRatio || 1, 2);
    let cerceve = 0;
    let baslangic = 0;

    // Hedef ve yumuşatılmış imleç konumu. -1 = imleç alanda değil.
    let hedefX = -1;
    let hedefY = -1;
    let x = -1;
    let y = -1;

    function olcule() {
      const r = tuval!.getBoundingClientRect();
      gen = r.width;
      yuk = r.height;
      opr = Math.min(window.devicePixelRatio || 1, 2);
      tuval!.width = Math.round(gen * opr);
      tuval!.height = Math.round(yuk * opr);
      ctx!.setTransform(opr, 0, 0, opr, 0, 0);
    }

    function ciz(zaman: number) {
      if (!baslangic) baslangic = zaman;
      const gecen = zaman - baslangic;

      // Açılış: gecikmeden sonra 0 → 1
      const giris = azHareket
        ? 1
        : Math.max(0, Math.min(1, (gecen - GECIKME) / GIRIS_SURESI));
      // Yumuşak giriş eğrisi
      const g = giris * giris * (3 - 2 * giris);

      // İmleci yumuşatarak takip et
      if (hedefX < 0) {
        x = -1;
        y = -1;
      } else if (x < 0) {
        x = hedefX;
        y = hedefY;
      } else {
        x += (hedefX - x) * 0.12;
        y += (hedefY - y) * 0.12;
      }

      ctx!.clearRect(0, 0, gen, yuk);

      // Izgarayı ortala ki kenarlarda yarım sütun kalmasın
      const sutun = Math.floor(gen / ARALIK);
      const satir = Math.floor(yuk / ARALIK);
      const kaydirX = (gen - sutun * ARALIK) / 2 + ARALIK / 2;
      const kaydirY = (yuk - satir * ARALIK) / 2 + ARALIK / 2;

      for (let i = 0; i <= sutun; i++) {
        for (let j = 0; j <= satir; j++) {
          const nx = kaydirX + i * ARALIK;
          const ny = kaydirY + j * ARALIK;

          let t = 0;
          if (x >= 0) {
            const dx = nx - x;
            const dy = ny - y;
            const uzaklik = Math.sqrt(dx * dx + dy * dy);
            if (uzaklik < ETKI) {
              const k = 1 - uzaklik / ETKI;
              t = k * k; // merkeze doğru hızlanan artış
            }
          }

          const yaricap = (TABAN_YARICAP + (TEPE_YARICAP - TABAN_YARICAP) * t) * g;
          const alfa = (TABAN_ALFA + (TEPE_ALFA - TABAN_ALFA) * t) * g;
          if (yaricap <= 0.05 || alfa <= 0.004) continue;

          // İmlece yaklaştıkça beyazdan lilaya kayan bir ton
          ctx!.fillStyle =
            t > 0.02
              ? `rgba(${Math.round(214 + 41 * (1 - t))}, ${Math.round(196 + 59 * (1 - t))}, 255, ${alfa})`
              : `rgba(226, 224, 235, ${alfa})`;

          ctx!.beginPath();
          ctx!.arc(nx, ny, yaricap, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Hareket azaltılmışsa ve açılış bittiyse döngüyü durdur
      if (azHareket && x < 0) return;
      cerceve = requestAnimationFrame(ciz);
    }

    function fareHareket(e: PointerEvent) {
      const r = tuval!.getBoundingClientRect();
      hedefX = e.clientX - r.left;
      hedefY = e.clientY - r.top;
    }
    function fareCik() {
      hedefX = -1;
      hedefY = -1;
    }

    olcule();
    cerceve = requestAnimationFrame(ciz);

    const boyutIzleyici = new ResizeObserver(olcule);
    boyutIzleyici.observe(tuval);
    window.addEventListener("pointermove", fareHareket, { passive: true });
    window.addEventListener("pointerleave", fareCik, { passive: true });

    return () => {
      cancelAnimationFrame(cerceve);
      boyutIzleyici.disconnect();
      window.removeEventListener("pointermove", fareHareket);
      window.removeEventListener("pointerleave", fareCik);
    };
  }, []);

  return <canvas ref={tuvalRef} aria-hidden className={className} />;
}
