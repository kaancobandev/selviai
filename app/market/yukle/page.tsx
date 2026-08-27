import type { Metadata } from "next";
import Link from "next/link";
import { UploadForm } from "@/components/upload-form";

export const metadata: Metadata = {
  title: "Koleksiyon yükle",
};

export default function UploadPage() {
  return (
    <div className="px-5 pb-28 pt-28 md:px-10 md:pt-40">
      <Link href="/market" className="inline-flex items-center gap-3 eyebrow text-ash u-line">
        <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M15 8H2M7 3 2 8l5 5" />
        </svg>
        Market
      </Link>
      <header className="mt-8 max-w-2xl">
        <p className="eyebrow text-ash">Koleksiyon Marketi</p>
        <h1 className="mt-5 font-display text-5xl leading-[0.98] tracking-[-0.01em] md:text-7xl">
          Koleksiyon <em>yükle.</em>
        </h1>
        <p className="mt-6 max-w-[44ch] text-[15px] leading-7 text-smoke">
          Görselleri ekleyin, birkaç alanı doldurun. Koleksiyonunuz kısa bir incelemenin
          ardından Market&apos;te yayınlanır.
        </p>
      </header>

      <UploadForm />
    </div>
  );
}
