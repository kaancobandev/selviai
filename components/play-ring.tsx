import { cn } from "@/lib/utils";

export function PlayRing({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bone/70 bg-ink/20 text-bone backdrop-blur-sm transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-110",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="ml-0.5 h-3.5 w-3.5" fill="currentColor">
        <path d="M4 2.5v11l9-5.5z" />
      </svg>
    </span>
  );
}
