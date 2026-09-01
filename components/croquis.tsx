/* ------------------------------------------------------------------
   Croquis — 9 baş oranlı manken silueti, ince çizgi.
   Tuval birimi: 4 birim = 1 cm; figür ~170 cm = 680 birim, x merkezli.
   ------------------------------------------------------------------ */
const X = (s: 1 | -1) => (x: number) => (s * x).toFixed(1);

function sideD(s: 1 | -1) {
  const x = X(s);
  return [
    // omuz çizgisi: boyun → omuz ucu
    `M ${x(-13)} 100 C ${x(-35)} 104 ${x(-58)} 108 ${x(-72)} 118`,
    // omuz ucu → koltuk altı
    `M ${x(-72)} 118 C ${x(-66)} 135 ${x(-60)} 150 ${x(-56)} 160`,
    // dış kol
    `M ${x(-72)} 118 C ${x(-86)} 150 ${x(-90)} 200 ${x(-86)} 250 C ${x(-84)} 290 ${x(-82)} 330 ${x(-80)} 360 C ${x(-79)} 372 ${x(-80)} 384 ${x(-78)} 396 C ${x(-78)} 405 ${x(-82)} 415 ${x(-76)} 425`,
    // iç kol
    `M ${x(-56)} 160 C ${x(-62)} 200 ${x(-64)} 240 ${x(-62)} 270 C ${x(-60)} 300 ${x(-58)} 340 ${x(-60)} 380 L ${x(-62)} 400`,
    // gövde yanı → kalça → dış bacak → ayak
    `M ${x(-56)} 160 C ${x(-52)} 210 ${x(-48)} 250 ${x(-44)} 290 C ${x(-40)} 330 ${x(-54)} 360 ${x(-58)} 400 C ${x(-62)} 450 ${x(-54)} 500 ${x(-50)} 530 C ${x(-48)} 570 ${x(-44)} 620 ${x(-40)} 650 L ${x(-44)} 672 L ${x(-22)} 672 L ${x(-24)} 655`,
    // iç bacak
    `M 0 440 C ${x(-8)} 470 ${x(-14)} 500 ${x(-18)} 530 C ${x(-22)} 570 ${x(-24)} 620 ${x(-22)} 650 L ${x(-24)} 655`,
  ].join(" ");
}

export function Croquis({ back = false }: { back?: boolean }) {
  const guides = [
    { y: 200, label: "Göğüs" },
    { y: 290, label: "Bel" },
    { y: 400, label: "Kalça" },
  ];
  return (
    <g className="pointer-events-none" fill="none" stroke="#1a1a1a" strokeWidth="1" vectorEffect="non-scaling-stroke">
      <g opacity="0.38" strokeLinecap="round" strokeLinejoin="round" style={{ vectorEffect: "non-scaling-stroke" }}>
        <ellipse cx="0" cy="40" rx="26" ry="36" vectorEffect="non-scaling-stroke" />
        <path d="M -12 76 L -13 100 M 12 76 L 13 100" vectorEffect="non-scaling-stroke" />
        <path d={sideD(1)} vectorEffect="non-scaling-stroke" />
        <path d={sideD(-1)} vectorEffect="non-scaling-stroke" />
      </g>
      {/* yapı çizgileri */}
      <g opacity="0.22" strokeDasharray="3 4" vectorEffect="non-scaling-stroke">
        <path d="M 0 100 L 0 440" vectorEffect="non-scaling-stroke" />
        {guides.map((g) => (
          <path key={g.y} d={`M -78 ${g.y} L 78 ${g.y}`} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g opacity="0.55" fill="#1a1a1a" stroke="none" fontSize="7" fontFamily="var(--font-sans)" letterSpacing="1">
        {guides.map((g) => (
          <text key={g.y} x="84" y={g.y + 2.5}>
            {g.label.toUpperCase()}
          </text>
        ))}
        <text x="-12" y="-14">{back ? "ARKA" : "ÖN"}</text>
      </g>
    </g>
  );
}
