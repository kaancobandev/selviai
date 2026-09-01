"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BuyButton({ className }: { className?: string }) {
  const [added, setAdded] = useState(false);

  return (
    <Button
      variant="ghost"
      className={cn("w-full", added && "border-kalem bg-kalem text-zemin", className)}
      aria-live="polite"
      onClick={() => {
        if (added) return;
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }}
    >
      {added ? "Sepete eklendi" : "Satın al"}
    </Button>
  );
}
