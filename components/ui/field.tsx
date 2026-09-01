import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Alt çizgili form sistemi — kutu yok, yalnızca bir hairline.
   Odakta çizgi kalem rengine döner.

   Zemin-BAĞIMSIZ yazıldı: kalem/zemin/hair/fog dördü `.ada-acik` içinde
   yeniden bağlandığı için aynı alan hem koyu kromda hem beyaz adada doğru
   çalışıyor. Sabit text-ink / border-mist yazsaydık koyu sayfada alan
   siyah üstüne siyah kalırdı.
   ------------------------------------------------------------------ */

const control =
  "peer w-full bg-transparent border-0 border-b border-hair py-3 text-[15px] leading-6 " +
  "text-kalem outline-none transition-colors duration-500 focus:border-kalem " +
  "disabled:opacity-40 rounded-none";

type WrapProps = {
  label: string;
  hint?: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
  trailing?: ReactNode;
};

export function Field({ label, hint, htmlFor, className, children, trailing }: WrapProps) {
  return (
    <div className={cn("group/field", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="eyebrow text-fog">
          {label}
        </label>
        {trailing && <span className="eyebrow text-fog">{trailing}</span>}
      </div>
      {children}
      {hint && <p className="mt-2 text-[11px] leading-4 text-fog">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      rows={3}
      className={cn(control, "resize-none leading-7", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <div className="relative">
      <select className={cn(control, "appearance-none pr-8 cursor-pointer", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-fog"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <path d="M3 6l5 5 5-5" />
      </svg>
    </div>
  );
}

export function Checkbox({
  id,
  label,
  ...props
}: ComponentPropsWithoutRef<"input"> & { label: ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-fog">
      <span className="relative mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <input id={id} type="checkbox" className="peer absolute inset-0 appearance-none cursor-pointer border border-kalem/40 checked:border-kalem checked:bg-kalem" {...props} />
        <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none relative h-2 w-2 opacity-0 peer-checked:opacity-100 text-zemin" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M2 6.5l2.5 2.5L10 3" />
        </svg>
      </span>
      <span className="leading-5">{label}</span>
    </label>
  );
}
