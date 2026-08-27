import { cn } from "@/lib/utils";

/**
 * Santimetre cetveli — tam cm'de uzun, yarım cm'de kısa çentik, 9px rakamlar.
 * Yatay: çentikler altta, rakamlar üstte. Dikey: çentikler sağda, rakamlar solda.
 */
export function Ruler({ cm, orientation, className }: { cm: number; orientation: "h" | "v"; className?: string }) {
  const ticks = Array.from({ length: Math.floor(cm * 2) + 1 }, (_, k) => k / 2);
  const horizontal = orientation === "h";
  return (
    <div aria-hidden className={cn("relative text-ink", className)}>
      {ticks.map((t) => {
        const pos = (t / cm) * 100;
        const major = Number.isInteger(t);
        return (
          <span
            key={t}
            className="absolute"
            style={horizontal ? { left: `${pos}%`, bottom: 0 } : { top: `${pos}%`, right: 0 }}
          >
            <span
              className={cn(
                "block bg-current",
                horizontal ? (major ? "h-3 w-px" : "h-1.5 w-px") : major ? "h-px w-3" : "h-px w-1.5",
                !major && "opacity-40",
              )}
            />
            {major && t < cm && (
              <span
                className={cn(
                  "absolute text-[9px] leading-none tabular-nums text-ash",
                  horizontal ? "bottom-[15px] left-[3px]" : "right-[15px] top-[3px]",
                )}
              >
                {t}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
