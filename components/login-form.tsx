"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { site } from "@/lib/site";

export function LoginForm() {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <form
        className="mt-12 grid gap-9"
        onSubmit={(e) => {
          e.preventDefault();
          setToast("Prototip: hesap girişi henüz bağlı değil.");
        }}
      >
        <Field label="E-posta" htmlFor="login-email">
          <Input id="login-email" type="email" required autoComplete="email" placeholder="ad@ornek.com" />
        </Field>
        <Field label="Şifre" htmlFor="login-password" trailing={<a href={`mailto:${site.email}`} className="u-line">Unuttum</a>}>
          <Input id="login-password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </Field>
        <Button type="submit" size="lg" className="mt-2 w-full">
          Giriş yap
        </Button>
      </form>
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}
