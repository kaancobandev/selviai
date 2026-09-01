import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow text-ash">404</p>
      <h1 className="mt-6 font-display text-5xl leading-[0.98] md:text-7xl">Sayfa bulunamadı.</h1>
      <p className="mt-6 max-w-[36ch] text-[15px] leading-7 text-fog">
        Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.
      </p>
      <div className="mt-10 flex items-center gap-8">
        <Button href="/">Anasayfa</Button>
        <Link href="/market" className="eyebrow u-line">
          Market
        </Link>
      </div>
    </div>
  );
}
