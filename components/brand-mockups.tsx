/* ------------------------------------------------------------------
   Monokrom, düz (flat) mockup çizimleri — SVG.
   Renkler ve yazı tipleri marka durumundan gelir; metinler canlı güncellenir.
   ------------------------------------------------------------------ */

export type MockupProps = {
  wordmark: string;
  monogram: string;
  /** CSS font-family değeri, örn. "var(--font-bodoni)" */
  display: string;
  primary: string;
  secondary: string;
  accent: string;
  onPrimary: string;
  onSecondary: string;
};

const frame = "h-full w-full";

export function BagMockup({ wordmark, display, primary, accent, onPrimary }: MockupProps) {
  return (
    <svg viewBox="0 0 300 340" className={frame} role="img" aria-label="Alışveriş çantası mockup">
      {/* saplar */}
      <path d="M108 112C108 62 136 62 136 112" fill="none" stroke="#0b0b0b" strokeOpacity="0.55" strokeWidth="1" />
      <path d="M164 112C164 62 192 62 192 112" fill="none" stroke="#0b0b0b" strokeOpacity="0.55" strokeWidth="1" />
      {/* gövde */}
      <rect x="72" y="110" width="156" height="196" fill={primary} />
      <rect x="72" y="110" width="156" height="196" fill="none" stroke="#0b0b0b" strokeOpacity="0.1" />
      {/* asma etiket */}
      <path d="M192 112L211 122" stroke="#0b0b0b" strokeOpacity="0.5" strokeWidth="1" />
      <rect x="205" y="122" width="12" height="18" fill={accent} />
      {/* logotype */}
      <text
        x="150"
        y="214"
        textAnchor="middle"
        fill={onPrimary}
        style={{ fontFamily: display, fontSize: 20, letterSpacing: 4 }}
      >
        {wordmark.toUpperCase()}
      </text>
    </svg>
  );
}

export function ScarfMockup({ monogram, display, primary, secondary, accent }: MockupProps) {
  return (
    <svg viewBox="0 0 300 340" className={frame} role="img" aria-label="İpek fular mockup">
      <g transform="rotate(-7 150 170)">
        <rect x="55" y="75" width="190" height="190" fill={secondary} />
        <rect x="55" y="75" width="190" height="190" fill="none" stroke="#0b0b0b" strokeOpacity="0.1" />
        {/* kıvrık kenar dikişi — vurgu renginde */}
        <rect x="66" y="86" width="168" height="168" fill="none" stroke={accent} strokeWidth="1" strokeDasharray="2 3" />
        <text
          x="216"
          y="246"
          textAnchor="end"
          fill={primary}
          style={{ fontFamily: display, fontSize: 34 }}
        >
          {monogram}
        </text>
      </g>
    </svg>
  );
}

export function BoxMockup({ wordmark, monogram, display, primary, accent, onPrimary }: MockupProps) {
  return (
    <svg viewBox="0 0 300 340" className={frame} role="img" aria-label="Kutu mockup">
      {/* gövde */}
      <rect x="62" y="150" width="176" height="140" fill={primary} />
      {/* kapak */}
      <rect x="54" y="124" width="192" height="30" fill={primary} />
      <line x1="54" y1="154" x2="246" y2="154" stroke={onPrimary} strokeOpacity="0.3" />
      <rect x="54" y="124" width="192" height="166" fill="none" stroke="#0b0b0b" strokeOpacity="0.1" />
      {/* şerit */}
      <rect x="146" y="124" width="8" height="166" fill={accent} />
      {/* kapakta logotype */}
      <text
        x="100"
        y="144"
        textAnchor="middle"
        fill={onPrimary}
        fillOpacity="0.92"
        style={{ fontFamily: display, fontSize: 11, letterSpacing: 3 }}
      >
        {wordmark.toUpperCase()}
      </text>
      {/* gövdede monogram */}
      <text
        x="196"
        y="270"
        textAnchor="middle"
        fill={onPrimary}
        fillOpacity="0.85"
        style={{ fontFamily: display, fontSize: 28 }}
      >
        {monogram}
      </text>
    </svg>
  );
}
