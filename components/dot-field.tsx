"use client";

import { useEffect, useRef } from "react";

/**
 * Hero'nun nokta ızgarası.
 *
 * Neden canvas: 1440×900'de ~2.900 nokta düşüyor. Bunları DOM öğesi yapmak
 * her karede 2.900 stil hesabı demek; canvas'ta tek bir çizim döngüsü oluyor.
 *
 * Etkileşim: imlecin çevresindeki noktalar büyüyüp parlıyor. İmleç konumu
 * doğrudan değil, yumuşatılarak takip ediliyor — fare sıçradığında ışık da
 * sıçramasın diye.
 *
 * Açılış: noktalar hemen görünmüyor; metin (.rise-*) yerine oturmaya
 * başladıktan sonra biniyorlar.
 */

const ARALIK = 22; // noktalar arası mesafe (px)
const TABAN_YARICAP = 1.0; // dinlenme hâlindeki nokta yarıçapı
const TEPE_YARICAP = 2.6; // imlecin tam altındaki yarıçap
const TABAN_ALFA = 0.22;
const TEPE_ALFA = 1.0;
const ETKI = 420; // imlecin etki yarıçapı (px)
const GIRIS_SURESI = 1400; // noktaların belirme süresi (ms)
const GECIKME = 700; // metin girişine binmesin diye beklenen süre (ms)

/* Ortam dalgası — ızgara boyunca süzülen tek bir sinüs, noktaların
   parlaklığını oynatıyor.

   ŞU AN KAPALI (DERINLIK 0). Hero'da hareket eden tek şey prompt kutusunun
   halkası olsun istiyoruz; dalga açıkken ızgara "yapı" değil "duman" gibi
   duruyordu. Geri açmak için DERINLIK'i 0.55 yapmak yeterli.

   Hız ölçülerek seçildi: 7 sn periyot, saniyede ~%43 parlaklık değişimi.
   Daha yavaşı (15 sn) bakan gözün hareket olarak seçemediği, daha hızlısı
   huzursuz duran bir aralığa düşüyordu. */
const DALGA_HIZ = 0.0009;
const DALGA_OLCEK_X = 0.0075;
const DALGA_OLCEK_Y = 0.011;
const DALGA_DERINLIK = 0;

/* İmleç takibi zaman tabanlı. Önceki sürüm kare başına sabit bir katsayı
   (0.12) uyguluyordu; bu, takip hızını doğrudan ekranın tazeleme hızına
   bağlıyordu — 60 Hz'de 391 ms olan oturma süresi 144 Hz'de 163 ms'ye
   düşüyor, 30 fps'e düşen bir makinede 781 ms'ye çıkıyordu. */
const TAKIP_TAU = 130; // zaman sabiti (ms)

/* Nokta rengi, imlece yakınlığa (t) göre beyazdan lilaya kayıyor. Renk
   dizgisini her nokta için yeniden kurmak kare başına ~2.400 dizgi ayırmak
   demekti; bunun yerine 33 kademelik sabit tablo. */
const RENK_KADEME = 32;
const RENKLER = Array.from({ length: RENK_KADEME + 1 }, (_, i) => {
  const k = 1 - i / RENK_KADEME;
  return `rgb(${Math.round(214 + 41 * k)}, ${Math.round(196 + 59 * k)}, 255)`;
});
const TABAN_RENK = "rgb(226, 224, 235)";

export function DotField({ className = "" }: { className?: string }) {
  const tuvalRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const tuval = tuvalRef.current;
    if (!tuval) return;
    const ctx = tuval.getContext("2d");
    if (!ctx) return;

    const sorgu = window.matchMedia("(prefers-reduced-motion: reduce)");
    let azHareket = sorgu.matches;

    let gen = 0;
    let yuk = 0;
    let opr = Math.min(window.devicePixelRatio || 1, 2);
    let cerceve = 0;
    let oncekiZaman = 0;
    let goruntude = true;
    let sonKareDurgun = false;

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
      sonKareDurgun = false; // yeniden boyutlandıktan sonra mutlaka çiz
    }

    function ciz(zaman: number) {
      cerceve = requestAnimationFrame(ciz);

      // rAF damgası performance.now() ile aynı tabanda, CSS animasyonları da
      // sayfa yüklenmesinden sayıyor. Bu yüzden ilk kareyi sıfır kabul
      // etmiyoruz: aksi hâlde noktaların girişi hydration gecikmesi kadar
      // geriye kayıp metin animasyonundan kopuyordu.
      const dt = oncekiZaman ? Math.min(zaman - oncekiZaman, 100) : 16.7;
      oncekiZaman = zaman;

      // İmleci zaman tabanlı yumuşatmayla takip et
      if (hedefX < 0) {
        x = -1;
        y = -1;
      } else if (x < 0) {
        x = hedefX;
        y = hedefY;
      } else {
        const k = 1 - Math.exp(-dt / TAKIP_TAU);
        x += (hedefX - x) * k;
        y += (hedefY - y) * k;
      }

      // Açılış: gecikmeden sonra 0 → 1
      const giris = azHareket
        ? 1
        : Math.max(0, Math.min(1, (zaman - GECIKME) / GIRIS_SURESI));
      const g = giris * giris * (3 - 2 * giris); // yumuşak giriş eğrisi

      const dalgaAcik = !azHareket && DALGA_DERINLIK > 0;

      // Görüntünün değişmesi için üç sebepten biri gerekiyor: açılış sürüyor,
      // dalga açık, ya da imleç alanda. Üçü de yoksa kare birebir aynı çıkar;
      // bir kez çizip duruyoruz. Dalga kapalıyken bu, imleç dışarıdayken kare
      // başına ~2.400 daireyi sıfıra indiriyor.
      const durgun = giris >= 1 && !dalgaAcik && x < 0;
      if (durgun && sonKareDurgun) return;
      sonKareDurgun = durgun;

      ctx!.clearRect(0, 0, gen, yuk);

      // Izgarayı ortala ki kenarlarda yarım sütun kalmasın
      const sutun = Math.floor(gen / ARALIK);
      const satir = Math.floor(yuk / ARALIK);
      const kaydirX = (gen - sutun * ARALIK) / 2 + ARALIK / 2;
      const kaydirY = (yuk - satir * ARALIK) / 2 + ARALIK / 2;

      const dalgaFaz = zaman * DALGA_HIZ;
      const etkiKare = ETKI * ETKI;

      for (let i = 0; i <= sutun; i++) {
        const nx = kaydirX + i * ARALIK;
        const dx = nx - x;
        const dxKare = dx * dx;

        for (let j = 0; j <= satir; j++) {
          const ny = kaydirY + j * ARALIK;

          let t = 0;
          if (x >= 0) {
            const dy = ny - y;
            const uzaklikKare = dxKare + dy * dy;
            if (uzaklikKare < etkiKare) {
              const k = 1 - Math.sqrt(uzaklikKare) / ETKI;
              t = k * k; // merkeze doğru hızlanan artış
            }
          }

          const dalga = dalgaAcik
            ? 1 +
              DALGA_DERINLIK *
                Math.sin(nx * DALGA_OLCEK_X + ny * DALGA_OLCEK_Y + dalgaFaz)
            : 1;

          const yaricap = (TABAN_YARICAP * dalga + (TEPE_YARICAP - TABAN_YARICAP) * t) * g;
          const alfa = (TABAN_ALFA * dalga + (TEPE_ALFA - TABAN_ALFA) * t) * g;
          if (yaricap <= 0.05 || alfa <= 0.004) continue;

          ctx!.fillStyle = t > 0.02 ? RENKLER[(t * RENK_KADEME) | 0] : TABAN_RENK;
          ctx!.globalAlpha = alfa < 1 ? alfa : 1;
          ctx!.beginPath();
          ctx!.arc(nx, ny, yaricap, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      ctx!.globalAlpha = 1;
    }

    function basla() {
      if (cerceve) return;
      oncekiZaman = 0;
      sonKareDurgun = false;
      cerceve = requestAnimationFrame(ciz);
    }
    function dur() {
      if (!cerceve) return;
      cancelAnimationFrame(cerceve);
      cerceve = 0;
    }

    function fareHareket(e: PointerEvent) {
      const r = tuval!.getBoundingClientRect();
      hedefX = e.clientX - r.left;
      hedefY = e.clientY - r.top;
      sonKareDurgun = false;
    }
    function fareCik() {
      hedefX = -1;
      hedefY = -1;
      sonKareDurgun = false;
    }
    function hareketDegisti(e: MediaQueryListEvent) {
      azHareket = e.matches;
      sonKareDurgun = false;
    }
    function sekmeDegisti() {
      if (document.hidden) dur();
      else if (goruntude) basla();
    }

    olcule();
    basla();

    const boyutIzleyici = new ResizeObserver(olcule);
    boyutIzleyici.observe(tuval);

    // Hero ekrandan çıkınca çizmeyi bırak. Sayfa uzun ve hero yalnızca ilk
    // ekranı kaplıyor; kaydırmanın geri kalanında görünmeyen bir tuvale kare
    // başına ~2.400 daire çizmenin anlamı yok.
    const gorunumIzleyici = new IntersectionObserver(
      ([kayit]) => {
        goruntude = kayit.isIntersecting;
        if (goruntude) basla();
        else dur();
      },
      { rootMargin: "120px" },
    );
    gorunumIzleyici.observe(tuval);

    window.addEventListener("pointermove", fareHareket, { passive: true });
    window.addEventListener("pointerleave", fareCik, { passive: true });
    document.addEventListener("visibilitychange", sekmeDegisti);
    sorgu.addEventListener("change", hareketDegisti);

    return () => {
      dur();
      boyutIzleyici.disconnect();
      gorunumIzleyici.disconnect();
      window.removeEventListener("pointermove", fareHareket);
      window.removeEventListener("pointerleave", fareCik);
      document.removeEventListener("visibilitychange", sekmeDegisti);
      sorgu.removeEventListener("change", hareketDegisti);
    };
  }, []);

  return <canvas ref={tuvalRef} aria-hidden className={className} />;
}
