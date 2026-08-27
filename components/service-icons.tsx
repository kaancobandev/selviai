import type { ServiceIcon } from "@/lib/data";
import { cn } from "@/lib/utils";

/* 1px çizgi ikonlar — terzilik ve editoryal dünyanın nesneleri */
const paths: Record<ServiceIcon, React.ReactNode> = {
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  collage: (
    <>
      <path d="M3 6h10v13H3z" />
      <path d="M11 3h10v9h-6" />
    </>
  ),
  board: (
    <>
      <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
    </>
  ),
  fabric: (
    <>
      <path d="M3 7c3-3 6 3 9 0s6 3 9 0" />
      <path d="M3 12c3-3 6 3 9 0s6 3 9 0" />
      <path d="M3 17c3-3 6 3 9 0s6 3 9 0" />
    </>
  ),
  flat: (
    <>
      <path d="M8.5 4 3.5 7l2 3 2-1v11h9V9l2 1 2-3-5-3a3.5 3.5 0 0 1-7 0Z" />
    </>
  ),
  book: (
    <>
      <path d="M12 6c-2-1.5-5-1.5-8 0v13c3-1.5 6-1.5 8 0V6Z" />
      <path d="M12 6c2-1.5 5-1.5 8 0v13c-3-1.5-6-1.5-8 0" />
    </>
  ),
  camera: (
    <>
      <path d="M3 7.5h4l1.5-3h7l1.5 3h4v12H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  seal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 15.5 12 7l3.5 8.5M10 13h4" />
    </>
  ),
  tag: (
    <>
      <path d="M4 4h8l8 8-8 8-8-8V4Z" />
      <circle cx="8" cy="8" r="1.1" />
    </>
  ),
  venn: (
    <>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </>
  ),
};

export function ServiceGlyph({ icon, className }: { icon: ServiceIcon; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn("h-6 w-6 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[icon]}
    </svg>
  );
}
