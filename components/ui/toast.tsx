"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  message: string | null;
  /** Süre dolunca çağrılır; üst bileşen mesajı null yapar. */
  onHide: () => void;
  duration?: number;
};

/** Kısa, tek satırlık geri bildirim. Mesaj varken görünür, süre dolunca kaybolur. */
export function Toast({ message, onHide, duration = 2600 }: Props) {
  // Kaybolma animasyonu sırasında son metni tutar
  const [last, setLast] = useState(message);
  if (message && message !== last) setLast(message);

  const onHideRef = useRef(onHide);
  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onHideRef.current(), duration);
    return () => clearTimeout(t);
  }, [message, duration]);

  const visible = Boolean(message);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-8 z-[60] flex justify-center px-5 transition-all duration-500 ease-[var(--ease-out-expo)]",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <div className="bg-kalem px-5 py-3 eyebrow text-zemin shadow-[0_10px_40px_-20px_rgba(0,0,0,0.5)]">
        {message ?? last}
      </div>
    </div>
  );
}
