import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlayRing } from "@/components/play-ring";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { featuredLesson, lessons, plans } from "@/lib/data";
import { cn, formatTRY } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Akademi",
  description: "Uygulamanın her adımını anlatan kısa dersler ve eğitim programı.",
};

export default function AcademyPage() {
  return (
    <div className="pb-28 pt-28 md:pt-40">
      {/* Başlık */}
      <header className="px-5 md:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-fog">Akademi</p>
            <h1 className="mt-5 font-display text-6xl leading-[0.95] tracking-[-0.01em] md:text-8xl">
              Akademi
            </h1>
          </div>
          <p className="max-w-[40ch] text-[15px] leading-7 text-fog md:pb-3">
            Uygulamanın her adımını anlatan kısa dersler. Ücretsiz başlayın, programla
            derinleşin.
          </p>
        </div>
      </header>

      {/* Öne çıkan ders */}
      <section className="mt-16 px-5 md:px-10">
        <Reveal>
          <Link
            href="#dersler"
            className="group relative block aspect-[16/9] overflow-hidden bg-ink md:aspect-[21/9]"
            aria-label={`${featuredLesson.title} — izle`}
          >
            <Image
              src={featuredLesson.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="photo-reveal object-cover group-hover:scale-[1.02]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/88 via-ink/28 to-transparent" />
            <PlayRing />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 text-paper sm:flex-row sm:items-end sm:justify-between md:p-8">
              <div>
                <p className="eyebrow text-paper/90">
                  {featuredLesson.access} · {featuredLesson.level}
                </p>
                <p className="mt-3 font-display text-2xl leading-tight md:text-4xl">
                  {featuredLesson.title}
                </p>
              </div>
              <span className="eyebrow tabular-nums text-paper/70">{featuredLesson.duration}</span>
            </div>
          </Link>
        </Reveal>
      </section>

      {/* Dersler */}
      <section id="dersler" className="scroll-mt-24 px-5 pt-24 md:px-10 md:pt-32">
        <Reveal className="flex items-end justify-between border-b border-hair pb-6">
          <h2 className="font-display text-3xl md:text-4xl">Dersler</h2>
          <span className="eyebrow tabular-nums text-fog">{lessons.length + 1} ders</span>
        </Reveal>
        <div className="mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l, i) => (
            <Reveal key={l.id} delay={(i % 3) * 80}>
              <article className="group cursor-pointer">
                <div className="relative aspect-[16/10] overflow-hidden bg-ink">
                  <Image
                    src={l.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="photo-reveal object-cover group-hover:scale-[1.04]"
                  />
                  <span
                    className={cn(
                      "absolute left-3 top-3 px-2.5 py-2 eyebrow",
                      l.access === "Ücretsiz" ? "bg-bone/90 text-ink" : "bg-ink/85 text-bone",
                    )}
                  >
                    {l.access}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-ink/80 px-2.5 py-2 eyebrow tabular-nums text-bone">
                    {l.duration}
                  </span>
                  <PlayRing className="h-12 w-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-4 font-display text-xl leading-tight">{l.title}</h3>
                <p className="mt-2 eyebrow text-fog">{l.level}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Fiyatlandırma */}
      <section id="fiyatlandirma" className="scroll-mt-24 px-5 pt-28 md:px-10 md:pt-40">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-fog">Fiyatlandırma</p>
          <h2 className="mt-5 font-display text-4xl leading-[1.05] md:text-5xl">
            Eğitime <em>erişim.</em>
          </h2>
          <p className="mt-6 max-w-[44ch] text-[15px] leading-7 text-fog">
            Tek seferlik ödeme, ömür boyu erişim. Bütün planlarda 14 gün koşulsuz iade.
          </p>
        </Reveal>

        <Reveal delay={100} className="mt-14">
          <div className="grid gap-px border border-hair bg-hair md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex flex-col p-8 md:p-10",
                  p.featured ? "ters-kart bg-zemin text-kalem" : "bg-kalem/[0.04] text-kalem",
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn("eyebrow", p.featured ? "text-kalem/60" : "text-fog")}>{p.name}</p>
                  {p.featured && <span className="eyebrow text-kalem/60">En çok tercih edilen</span>}
                </div>
                <p className="mt-8 font-display text-5xl tabular-nums tracking-[-0.01em] md:text-6xl">
                  {formatTRY(p.price)}
                </p>
                <p className={cn("mt-3 text-sm leading-6", p.featured ? "text-kalem/70" : "text-fog")}>
                  {p.note}
                </p>
                <ul className="mt-10 space-y-3 text-sm leading-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-4">
                      <span aria-hidden className="mt-3 h-px w-3 shrink-0 bg-current opacity-60" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-12">
                  <Button
                    href={`/akademi/odeme?plan=${p.id}`}
                    variant={p.featured ? "solid" : "ghost"}
                    className="w-full"
                  >
                    Kursu satın al
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
