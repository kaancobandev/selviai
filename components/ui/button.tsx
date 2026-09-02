import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "ghost" | "light" | "link" | "koyuDolgu" | "koyuHatli";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-3 whitespace-nowrap select-none " +
  "eyebrow transition-[background-color,color,border-color,opacity] duration-500 " +
  "ease-[var(--ease-out-expo)] disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  /* SABİT koyu yüzeyler için — temayla DÖNMEZ. Tek meşru kullanım yeri
     fiyat kartlarının mavi-lila gradyanı: o yüzey temadan bağımsız koyu,
     dolayısıyla üstündeki düğme de mutlak beyaz kalmalı. Sayfanın kendi
     zemininde KULLANILMAZ — açık temada beyaz üstüne beyaz düğme çıkar.
     Oradaki doğru karşılıkları solid ve ghost. */
  koyuDolgu: "bg-paper text-ink hover:bg-lila-soft",
  koyuHatli: "border border-paper/25 text-paper hover:border-paper hover:bg-paper hover:text-ink",

  /* solid ve ghost artık zemin-BAĞIMSIZ. Önceden mürekkebe çiviliydiler
     (bg-ink text-bone), yani koyu sayfada siyah üstüne siyah düğme
     çıkıyordu. kalem/zemin `.tuval` içinde ters bağlandığı için beyaz
     adalardaki görünüm eskisiyle birebir aynı kalıyor; koyu tarafta ise
     çağrı yerlerine dokunmadan kendiliğinden düzeliyorlar. */
  /* Üzerine gelme rengi vurgu çiftine bağlı: koyuDolgu'nun bugünkü lila
     davranışını koyu tarafta birebir koruyor (vurgu koyuda #bfa6ee), açık
     tarafta ise mor+beyaz oluyor. Eski `bg-kalem/85` iki tarafta da
     yalnızca soluk bir gri veriyordu. */
  solid: "bg-kalem text-zemin hover:bg-vurgu hover:text-vurgu-kalem",
  ghost: "border border-kalem/25 text-kalem hover:border-kalem hover:bg-kalem hover:text-zemin",

  /* Fotoğraf üstü — her iki zeminde de beyaz kalmalı. */
  light: "bg-bone text-ink hover:bg-paper",
  link: "u-line px-0 h-auto",
};

const sizes: Record<Size, string> = {
  md: "h-12 px-7",
  lg: "h-14 px-9",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

type ButtonProps = CommonProps & ComponentPropsWithoutRef<"button"> & { href?: undefined };
type AnchorProps = CommonProps & ComponentPropsWithoutRef<typeof Link> & { href: string };

export function Button(props: ButtonProps | AnchorProps) {
  const { variant = "solid", size = "md", className, ...rest } = props;
  const classes = cn(base, variant !== "link" && sizes[size], variants[variant], className);

  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...anchorRest } = rest as AnchorProps;
    return <Link href={href} className={classes} {...anchorRest} />;
  }

  const { type = "button", ...buttonRest } = rest as ButtonProps;
  return <button type={type} className={classes} {...buttonRest} />;
}

/** Küçük ok — bağlantıların sonunda kullanılan tek vurgu işareti */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn("h-3 w-3 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M1 8h13M9 3l5 5-5 5" />
    </svg>
  );
}
