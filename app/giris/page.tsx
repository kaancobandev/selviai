import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Giriş",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center px-5 pb-20 pt-28 md:pt-32">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-fog">Hesap</p>
        <h1 className="mt-5 font-display text-5xl leading-[0.98] md:text-6xl">Giriş</h1>
        <p className="mt-5 text-[15px] leading-7 text-fog">
          Koleksiyonlarınızı yönetin, derslerinize devam edin.
        </p>
        <LoginForm />
        <p className="mt-10 text-sm text-fog">
          Hesabınız yok mu?{" "}
          <a href={`mailto:${site.email}?subject=Hesap başvurusu`} className="u-line text-kalem">
            Başvurun
          </a>
        </p>
      </div>
    </div>
  );
}
