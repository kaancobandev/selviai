"use client";

/* ------------------------------------------------------------------
   Dot Image Reveal — nokta ızgarası, imleçle açılan görsel.

   Kaynak: Originkit — originkit.dev/components/dot-image-reveal
   Kod kullanıcı tarafından verildi. // SAPMA ile işaretli her satır bir
   denetim bulgusunu kapatıyor; işaretsiz satırlar kaynaktakiyle aynıdır.
   ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type CSSProperties } from "react";

/* SAPMA — tip adı MagneticGridProps -> DotImageRevealProps; image nesnesi ve
   ölü srcSet prop'u kaldırıldı, src/alt düzleştirildi ve zorunlu yapıldı. */
interface DotImageRevealProps {
  src: string;
  /** Dekoratifse "" ver, bilgi taşıyorsa gerçek metin yaz. */
  alt: string;
  background?: string;
  dots?: number;
  gap?: number;
  intensity?: number;
  radius?: number;
  /** SAPMA — kaynakta çizim rengi Cell.draw çağrısında "#FFFFFF" sabitti.
      canvas fillStyle var() ÇÖZMEZ: gerçek bir renk değeri ver. */
  dotColor?: string;
  className?: string;
  style?: CSSProperties;
}

type Fit = { fit: number; dx: number; dy: number };

class Cell {
  x: number;
  y: number;
  reveal = 0;
  treveal = 0;
  lastHit = 0;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(mx: number, my: number, hit: boolean, radius: number, falloff: number, now: number) {
    if (hit) {
      this.lastHit = now;
      const dist = Math.hypot(mx - this.x, my - this.y);
      const n = Math.max(0, Math.min(1, 1 - dist / radius));
      const shaped = Math.pow(n, falloff);
      this.treveal = shaped * shaped * (3 - 2 * shaped);
    } else if (now - this.lastHit > 50) {
      this.treveal = 0;
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | null,
    dotSize: number,
    fullSize: number,
    f: Fit | null,
    color: string,
  ) {
    this.reveal += (this.treveal - this.reveal) * 0.15;
    /* SAPMA — hedefe yapıştırma. Yumuşatma asimptotik olduğu için reveal hiç
       tam 0 olmuyordu; bu satır olmadan "hareket bitti" koşulu asla doğru
       olmaz ve rAF döngüsü hiç durmaz. */
    if (Math.abs(this.treveal - this.reveal) < 0.002) this.reveal = this.treveal;

    const d = dotSize + (fullSize - dotSize) * this.reveal;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.arc(0, 0, d / 2, 0, 2 * Math.PI);
    if (img && img.complete && img.naturalWidth > 0 && f) {
      ctx.clip();
      const sw = d / f.fit;
      const sx = (this.x - d / 2 - f.dx) / f.fit;
      const sy = (this.y - d / 2 - f.dy) / f.fit;
      ctx.drawImage(img, sx, sy, sw, sw, -d / 2, -d / 2, d, d);
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }
}

/* SAPMA — kaynakta yoktu. Efekt yalnızca hassas imleç + hover yeteneği +
   hareket kısıtı yokken açılır. Başlangıç false: SSR ve ilk boyama düz
   görseli verir, hydration uyuşmazlığı olmaz, JS'siz kullanıcı doğru şeyi
   görür. Dokunmatikte efekt hiç açılmadığı için touchcancel takılması,
   parmağı takip eden spot ve mobil rAF maliyeti tek kapıda kapanır. */
function useEfektAcik() {
  const [acik, setAcik] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const uygula = () => setAcik(mq.matches);
    uygula();
    mq.addEventListener("change", uygula);
    return () => mq.removeEventListener("change", uygula);
  }, []);
  return acik;
}

/* SAPMA — DEFAULT_IMAGE sabiti silindi (Originkit'in kendi Cloudflare Images
   hesabına hotlink'ti). src artık zorunlu prop. */

export function DotImageReveal({
  src,
  alt,
  background = "transparent", // SAPMA — kaynakta "#000000"; site zemini #0b0b0b
  dots = 12,
  gap = 12,
  intensity = 10,
  radius = 150,
  dotColor = "rgba(255,255,255,0.22)", // SAPMA — kaynakta sabit "#FFFFFF"
  className,
  style,
}: DotImageRevealProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null); // SAPMA — canvas kaynağı bu düğüm
  const mouseRef = useRef({ x: -99999, y: -99999, active: false });
  const fitRef = useRef<(() => void) | null>(null);

  const efektAcik = useEfektAcik();
  const [gorselDustu, setGorselDustu] = useState(false);
  /* Görsel düşerse <img> kırık ikon gösterir; canvas'ı açık tutup sade nokta
     ızgarasına düşüyoruz. */
  const canvasAcik = efektAcik || gorselDustu;

  useEffect(() => {
    if (!canvasAcik) return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = Math.max(1, Math.floor(dots));
    const I = Math.max(1, Math.min(10, intensity));
    const falloff = Math.pow(2, (0.5 - ((I - 1) * 5) / 9) / 1.5);

    /* SAPMA — new Image() + crossOrigin="anonymous" kalktı. Piksel geri
       okunmadığı için CORS gereksizdi; ayrı istek önbellekte ikinci girdi
       açıp aynı dosyayı iki kez indiriyordu. */
    const img = imgRef.current;

    let W = 1, H = 1, pitch = 20, dotSize = 20, fullSize = 20, bleed = 0, RR = 1, rowN = 1;
    let fitInfo: Fit | null = null;
    let cells: Cell[] = [];
    let sonW = -1, sonH = -1; // SAPMA — gereksiz yeniden kurulum eşiği
    let rect = host.getBoundingClientRect(); // SAPMA — rect önbelleği
    let gorunur = false;
    let raf = 0;

    const computeFit = () => {
      if (!img || !img.complete || !img.naturalWidth) {
        fitInfo = null;
        return;
      }
      const nW = img.naturalWidth;
      const nH = img.naturalHeight;
      const fit = Math.max(W / nW, H / nH);
      fitInfo = { fit, dx: (W - nW * fit) / 2, dy: (H - nH * fit) / 2 };
    };

    const tazeleRect = () => { rect = host.getBoundingClientRect(); };

    /* SAPMA — build() artık parametre almıyor ve TEK ölçü kaynağı kullanıyor:
       host.client*. Kaynakta ilk çağrı getBoundingClientRect (padding dahil,
       transform uygulanmış), RO çağrısı contentRect (padding hariç) okuyordu. */
    const build = () => {
      const w = Math.max(1, Math.floor(host.clientWidth));
      const h = Math.max(1, Math.floor(host.clientHeight));
      if (w === sonW && h === sonH) return;
      const onceki = cells;
      const oncekiSatir = rowN;
      sonW = w; sonH = h; W = w; H = h;
      tazeleRect();

      pitch = W / cols;
      /* SAPMA — gap >= pitch olduğunda dotSize 1px'e çöküyordu. */
      dotSize = Math.max(2, pitch - Math.min(Math.max(0, gap), pitch * 0.6));
      fullSize = pitch * Math.SQRT2;
      /* SAPMA — yarıçap kutu genişliğine orantılandı; sabit 150px dar kutuda
         genişliğin %45'ini kaplıyor, efekt kayboluyordu. */
      RR = Math.max(24, Math.min(Math.max(1, radius), W * 0.42));
      rowN = Math.max(1, Math.ceil(H / pitch));

      bleed = Math.ceil(fullSize / 2 + 4);

      const dpr = Math.min(window.devicePixelRatio || 1, 2); // SAPMA — 2'de sınırlı
      const cw = W + bleed * 2;
      const ch = H + bleed * 2;
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      canvas.style.left = -bleed + "px";
      canvas.style.top = -bleed + "px";
      ctx.setTransform(dpr, 0, 0, dpr, bleed * dpr, bleed * dpr);

      const gridH = rowN * pitch;
      const oy = (H - gridH) / 2 + pitch / 2;

      cells = [];
      for (let c = 0; c < cols; c++) {
        for (let rIdx = 0; rIdx < rowN; rIdx++) {
          cells.push(new Cell(c * pitch + pitch / 2, oy + rIdx * pitch));
        }
      }
      /* SAPMA — aynı ızgara boyutunda açılma durumu taşınıyor; kaynakta her
         resize açılmış görseli bir karede noktalara çöktürüyordu. */
      if (onceki.length === cells.length && oncekiSatir === rowN) {
        cells.forEach((c, i) => {
          c.reveal = onceki[i].reveal;
          c.treveal = onceki[i].treveal;
        });
      }
      computeFit();
    };

    const drawFrame = (now: number) => {
      const m = mouseRef.current;
      ctx.clearRect(-bleed, -bleed, W + bleed * 2, H + bleed * 2);
      for (const cell of cells) {
        cell.update(m.x, m.y, m.active, RR, falloff, now);
        cell.draw(ctx, img, dotSize, fullSize, fitInfo, dotColor);
      }
    };

    /* SAPMA — koşulsuz rAF yerine uyan/uyu. Repodaki dot-field.tsx deseni. */
    const hareketVar = () =>
      mouseRef.current.active || cells.some((c) => c.reveal !== 0 || c.treveal !== 0);

    const loop = (now: number) => {
      drawFrame(now);
      if (!gorunur || !hareketVar()) { raf = 0; return; }
      raf = requestAnimationFrame(loop);
    };
    const uyandir = () => { if (!raf && gorunur) raf = requestAnimationFrame(loop); };

    fitRef.current = () => { computeFit(); uyandir(); };

    build();

    /* SAPMA — contentRect okunmuyor, build() ölçüyü kendi alıyor. */
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => { build(); uyandir(); })
      : null;
    ro?.observe(host);

    /* Hareket kısıtı / dokunmatik: tek statik kare çiz, döngü ve dinleyici yok.
       (Buraya yalnızca gorselDustu true iken düşülür.) */
    if (!efektAcik) {
      drawFrame(performance.now());
      return () => { ro?.disconnect(); fitRef.current = null; };
    }

    /* SAPMA — görünürlük kapısı. Ekran dışındayken döngü hiç dönmez. */
    const io = new IntersectionObserver(
      ([e]) => {
        gorunur = e.isIntersecting;
        if (gorunur) { uyandir(); return; }
        cancelAnimationFrame(raf);
        raf = 0;
        mouseRef.current.active = false;
        for (const c of cells) { c.treveal = 0; c.reveal = 0; }
        drawFrame(performance.now()); // donmuş yarım açılma kalmasın
      },
      { rootMargin: "200px" },
    );
    io.observe(host);

    /* SAPMA — mousemove/mouseleave/touchmove/touchend yerine pointer olayları.
       pointercancel, kaynaktaki eksik touchcancel'ın yerini alıyor. */
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
      uyandir();
    };
    const onCik = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -99999;
      mouseRef.current.y = -99999;
      uyandir();
    };

    host.addEventListener("pointerenter", tazeleRect); // <Reveal> translateY'si için şart
    host.addEventListener("pointermove", onPointer, { passive: true });
    host.addEventListener("pointerleave", onCik);
    host.addEventListener("pointercancel", onCik);
    window.addEventListener("scroll", tazeleRect, { passive: true });

    /* SAPMA — dpr değişimi (monitör değiştirme / tarayıcı zoom) yakalanıyor. */
    let dprMq: MediaQueryList | null = null;
    const onDpr = () => { sonW = -1; build(); uyandir(); dprDinle(); };
    const dprDinle = () => {
      dprMq?.removeEventListener("change", onDpr);
      dprMq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprMq.addEventListener("change", onDpr);
    };
    dprDinle();

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io.disconnect();
      fitRef.current = null;
      dprMq?.removeEventListener("change", onDpr);
      host.removeEventListener("pointerenter", tazeleRect);
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onCik);
      host.removeEventListener("pointercancel", onCik);
      window.removeEventListener("scroll", tazeleRect);
    };
  }, [canvasAcik, efektAcik, src, dots, gap, intensity, radius, dotColor]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        /* SAPMA — spread background'dan ÖNCE: çağrı yeri prop'u sessizce ezmesin */
        ...(style || {}),
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden", // SAPMA — kaynakta "visible"; bleed komşu sütuna biniyordu
        background,
      }}
    >
      {/* SAPMA — bilginin taşıyıcısı bu. Efekt açıkken opacity:0 ile görünmez
         ama erişilebilirlik ağacında kalır (display:none çıkarırdı). JS yokken,
         hareket kısıtlıyken ve dokunmatikte görünen tek şey bu. Aynı zamanda
         canvas'ın kaynağı: tek istek, tek önbellek girdisi. */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        decoding="async"
        loading="lazy"
        onLoad={() => fitRef.current?.()}
        onError={() => setGorselDustu(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: canvasAcik ? 0 : 1,
        }}
      />
      {canvasAcik && (
        <canvas
          ref={canvasRef}
          aria-hidden="true" // SAPMA — efekt tümüyle dekoratif
          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
        />
      )}
    </div>
  );
}

// SAPMA — adlandırılmış export eklendi (components/ui konvansiyonu),
// default geriye dönük uyumluluk için kaldı.
export default DotImageReveal;
