"use client";

import { useSearchParams } from "next/navigation";
import { plans } from "@/lib/data";
import { CheckoutForm } from "@/components/checkout-form";

/** Planı URL'den (?plan=tek|tam|mentor) istemci tarafında okur — statik export uyumlu. */
export function CheckoutFromQuery() {
  const params = useSearchParams();
  const planId = params.get("plan");
  const plan = plans.find((p) => p.id === planId) ?? plans.find((p) => p.featured) ?? plans[0];
  return <CheckoutForm plan={plan} />;
}
