import type { CareSymbol } from "@/lib/labels";

/* Bakım sembolleri — 1 birim kontur, 24×24. Ölçüyü dışarıdan verin (width/height). */
type Props = { className?: string; style?: React.CSSProperties };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

export function WashSymbol({ temp, className, style }: Props & { temp: 30 | 40 }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-label={`${temp}° yıkama`}>
      <path d="M3 8.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" {...base} />
      <path d="M4 9.5l2 10h12l2-10" {...base} />
      <text x="12" y="17" textAnchor="middle" fontSize="6.5" fill="currentColor" stroke="none" fontFamily="inherit">
        {temp}
      </text>
    </svg>
  );
}

export function CareGlyph({ symbol, className, style }: Props & { symbol: CareSymbol }) {
  switch (symbol) {
    case "bleach":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} aria-label="Ağartıcı kullanmayın">
          <path d="M12 4.5L21 19.5H3z" {...base} />
          <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" {...base} />
        </svg>
      );
    case "iron":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} aria-label="Düşük ısıda ütüleyin">
          <path d="M3.5 17.5h17V12a5.5 5.5 0 0 0-5.5-5.5H10.5L3.5 13.5z" {...base} />
          <circle cx="12.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tumble":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} aria-label="Kurutma makinesine atmayın">
          <rect x="4" y="4" width="16" height="16" {...base} />
          <circle cx="12" cy="12" r="5.5" {...base} />
          <path d="M4 4l16 16M20 4L4 20" {...base} />
        </svg>
      );
    case "dryclean":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} aria-label="Kuru temizleme">
          <circle cx="12" cy="12" r="8.5" {...base} />
          <text x="12" y="15" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontFamily="inherit">
            P
          </text>
        </svg>
      );
  }
}
