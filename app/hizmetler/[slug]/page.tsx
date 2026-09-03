import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { services } from "@/lib/data";
import { Arrow, Button } from "@/components/ui/button";
import { ServiceGlyph } from "@/components/service-icons";
import { site } from "@/lib/site";

type Params = Promise<{ slug: string }>;

/** Kendi çalışma alanı olan hizmetler — bu rota onları işlemez */
const WORKSPACES = new Set([
  "inspiration",
  "kumas-secimi",
  "branding",
  "etiket-tasarimi",
  "shooting",
  "teknik-cizim",
  "lookbook",
]);

/** Statik export: yalnızca bilinen slug'lar üretilir */
export const dynamicParams = false;

export function generateStaticParams() {
  return services.filter((s) => !WORKSPACES.has(s.slug)).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  return { title: s ? `${s.name} — Hizmetler` : "Hizmetler" };
}

/** Henüz çalışma alanı olmayan hizmetler için zarif bir tanıtım ekranı. */
export default async function ServicePage({ params }: { params: Params }) {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  if (!s || WORKSPACES.has(slug)) notFound();

  const index = services.findIndex((x) => x.slug === slug);
  const prev = services[index - 1];
  const next = services[index + 1];

  return (
    <div className="grid flex-1 lg:grid-cols-12">
      <div className="flex flex-col px-6 pb-12 pt-12 md:px-12 md:pt-16 lg:col-span-6 lg:min-h-[calc(100svh-5rem)]">
        <div className="flex items-center gap-4">
          <ServiceGlyph icon={s.icon} className="text-kalem/60" />
          <p className="eyebrow text-fog">{s.phase}</p>
        </div>
        <h1 className="mt-8 max-w-[14ch] font-display text-5xl leading-[0.98] tracking-[-0.01em] md:text-6xl">
          {s.name}
        </h1>
        <p className="mt-8 max-w-[44ch] font-display text-xl leading-snug text-kalem md:text-2xl">{s.summary}</p>
        <p className="mt-6 max-w-[52ch] text-[15px] leading-7 text-fog">{s.detail}</p>

        <div className="mt-10 flex items-center gap-8">
          <Button href={`mailto:${site.email}?subject=${encodeURIComponent(`Teklif: ${s.name}`)}`}>
            Teklif al
          </Button>
          <Link href="/hizmetler/inspiration" className="eyebrow u-line">
            İlham panosuna dön
          </Link>
        </div>

        <div className="mt-14 border-t border-hair pt-6">
          <p className="eyebrow text-fog">Çalışma alanı</p>
          <p className="mt-3 max-w-[44ch] text-sm leading-6 text-fog">
            Bu hizmetin çalışma alanı hazırlanıyor. Şimdilik stüdyo ekibiyle birlikte yürütülür;
            ilham panonuz başlangıç noktasıdır.
          </p>
        </div>

        <nav aria-label="Hizmetler arasında gezin" className="mt-auto flex items-center justify-between pt-12 eyebrow">
          {prev ? (
            <Link href={`/hizmetler/${prev.slug}`} className="group inline-flex items-center gap-3 text-fog u-line hover:text-kalem">
              <Arrow className="rotate-180 transition-transform duration-500 group-hover:-translate-x-1" />
              {prev.short}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/hizmetler/${next.slug}`} className="group inline-flex items-center gap-3 text-fog u-line hover:text-kalem">
              {next.short}
              <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          )}
        </nav>
      </div>

      <div className="relative min-h-[46vh] bg-hair lg:col-span-6 lg:min-h-full">
        <Image src={s.image} alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="photo object-cover" />
      </div>
    </div>
  );
}
