import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutFromQuery } from "@/components/checkout-from-query";

export const metadata: Metadata = {
  title: "Ödeme",
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[60svh]" aria-busy="true" />}>
      <CheckoutFromQuery />
    </Suspense>
  );
}
