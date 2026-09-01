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
  /* Koyu zemin için iki varyant. Mevcut dördü açık zemine göre yazılmış ve
     hero'nun Arrow'u bu dosyadan geldiği için onlara dokunulmadı. */
  koyuDolgu: "bg-paper text-ink hover:bg-lila-soft",
  koyuHatli: "border border-paper/25 text-paper hover:border-paper hover:bg-paper hover:text-ink",
  solid: "bg-ink text-bone hover:bg-smoke",
  ghost: "border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-bone",
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
