import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { Services } from "@/components/services";
import { CollectionCard } from "@/components/collection-card";
import { PlayRing } from "@/components/play-ring";
import { Reveal } from "@/components/ui/reveal";
import { Arrow, Button } from "@/components/ui/button";
import { collections, featuredLesson } from "@/lib/data";
import { cn } from "@/lib/utils";

const pillars = [
  { label: "Stüdyo", title: "Hizmetler", cta: "On disiplin", href: "/hizmetler" },
  { label: "Market", title: "Koleksiyonlar", cta: "Yükle, sergile, sat", href: "/market" },
  { label: "Akademi", title: "Eğitim", cta: "Dersler ve program", href: "/akademi" },
];

export default function HomePage() {
  const picks = collections.slice(0, 3);

  return (
    <>
      <Hero />

      {/* Stüdyo — tek cümlelik manifesto ve üç kapı */}
      <section id="studyo" className="scroll-mt-20 px-5 py-28 md:px-10 md:py-40">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className="eyebrow text-ash">Stüdyo</p>
          <p className="mt-8 font-display text-3xl leading-[1.2] md:text-5xl md:leading-[1.15]">
            Her koleksiyon bir fikirle başlar. Biz o fikri kumaşa, çizime ve markaya
            dönüştürürüz.
          </p>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-20 max-w-5xl md:mt-28">
          <div aria-hidden className="seam text-ink" />
          <div className="grid sm:grid-cols-3">
            {pillars.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group flex flex-col gap-4 border-b border-mist py-8 last:border-b-0 sm:border-b-0 sm:border-r sm:px-8 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
              >
                <span className="eyebrow text-ash">{p.label}</span>
                <span className="font-display text-2xl md:text-3xl">{p.title}</span>
                <span className="mt-2 flex items-center gap-3 eyebrow">
                  {p.cta}
                  <Arrow className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
          <div aria-hidden className="seam text-ink" />
        </Reveal>
      </section>

      <Services />

      {/* Koleksiyon Marketi — üç seçki, ortadaki bir adım aşağıda */}
      <section className="px-5 py-24 md:px-10 md:py-36">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-ash">Koleksiyon Marketi</p>
            <h2 className="mt-5 font-display text-4xl leading-[1.05] md:text-5xl">
              Tasarımcıların <em>koleksiyonları.</em>
            </h2>
          </div>
          <Link href="/market" className="group flex items-center gap-3 eyebrow u-line">
            Tümünü gör
            <Arrow className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <div className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-3">
          {picks.map((c, i) => (
            <Reveal key={c.id} delay={i * 100} className={cn(i === 1 && "sm:mt-16")}>
              <CollectionCard collection={c} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-20 flex flex-col items-start gap-6 border-t border-mist pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[40ch] text-[15px] leading-7 text-smoke">
            Kendi koleksiyonunuzu yükleyin; fiyatını belirleyin, dünyaya açın.
          </p>
          <Button href="/market/yukle" variant="ghost">
            Koleksiyon yükle
          </Button>
        </Reveal>
      </section>

      {/* Akademi — sayfanın tek koyu bölümü */}
      <section className="bg-ink px-5 py-24 text-bone md:px-10 md:py-36">
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow text-bone/60">Akademi</p>
            <h2 className="mt-5 font-display text-4xl leading-[1.05] md:text-5xl">
              Uygulamayı <em>ustaca</em> kullanın.
            </h2>
            <p className="mt-6 max-w-[38ch] text-[15px] leading-7 text-bone/70">
              İlk koleksiyonunuzu kurmaktan lookbook dizgisine; her adımı anlatan kısa, net
              dersler.
            </p>
            <div className="mt-10 flex items-center gap-8">
              <Button href="/akademi" variant="light">
                Dersleri gör
              </Button>
              <Link href="/akademi#fiyatlandirma" className="eyebrow u-line">
                Fiyatlandırma
              </Link>
            </div>
          </Reveal>

          <Reveal delay={100} className="lg:col-span-7">
            <Link
              href="/akademi"
              className="group relative block aspect-[16/9] overflow-hidden bg-smoke"
              aria-label={`${featuredLesson.title} — dersi izle`}
            >
              <Image
                src={featuredLesson.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="photo-reveal object-cover opacity-90 group-hover:scale-[1.03]"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent"
              />
              <PlayRing />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-5 md:p-6">
                <span className="font-display text-lg leading-tight md:text-xl">
                  {featuredLesson.title}
                </span>
                <span className="eyebrow tabular-nums text-bone/70">{featuredLesson.duration}</span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
