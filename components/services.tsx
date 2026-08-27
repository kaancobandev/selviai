"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { services } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ServiceGlyph } from "@/components/service-icons";
import { Reveal } from "@/components/ui/reveal";
import { site } from "@/lib/site";
import { Arrow } from "@/components/ui/button";

/**
 * Hizmetler — editoryal bir içindekiler listesi gibi.
 * Sol: yapışkan başlık + aktif hizmetin görseli. Sağ: akordeon liste.
 */
export function Services() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="hizmetler" className="scroll-mt-16 bg-paper md:scroll-mt-20">
      <div className="px-5 py-24 md:px-10 md:py-36">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          {/* Sol sütun */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <Reveal>
                <p className="eyebrow text-ash">Hizmetler</p>
                <h2 className="mt-5 font-display text-4xl leading-[1.05] md:text-5xl">
                  İlk referanstan <em>etikete.</em>
                </h2>
                <p className="mt-6 max-w-[38ch] text-[15px] leading-7 text-smoke">
                  Bir koleksiyonu fikirden rafa taşıyan on disiplin. Tek başına ya da bütün
                  olarak.
                </p>
              </Reveal>

              <Reveal delay={120} className="mt-12 hidden lg:block">
                <div className="relative aspect-[4/5] w-full max-w-[400px] overflow-hidden bg-bone">
                  {services.map((s, i) => (
                    <Image
                      key={s.slug}
                      src={s.image}
                      alt=""
                      fill
                      sizes="400px"
                      className={cn(
                        "photo object-cover transition-opacity duration-700 ease-[var(--ease-out-quart)]",
                        i === active ? "opacity-100" : "opacity-0",
                      )}
                    />
                  ))}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-bone/90 px-3 py-2.5 eyebrow text-ink">
                    <span>{services[active].phase}</span>
                    <span aria-hidden className="h-px w-3 bg-ink/40" />
                    <span className="font-display normal-case tracking-normal text-sm leading-none">
                      {services[active].name}
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Sağ sütun — liste */}
          <Reveal delay={80} className="lg:col-span-7">
            <ul className="border-t border-mist">
              {services.map((s, i) => {
                const isOpen = open === i;
                return (
                  <li
                    key={s.slug}
                    className="border-b border-mist"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(isOpen ? null : i);
                        setActive(i);
                      }}
                      aria-expanded={isOpen}
                      aria-controls={`svc-${s.slug}`}
                      className="group flex w-full items-center gap-5 py-6 text-left md:gap-8 md:py-7"
                    >
                      <ServiceGlyph
                        icon={s.icon}
                        className={cn(
                          "transition-colors duration-500",
                          isOpen ? "text-ink" : "text-ink/60 group-hover:text-ink",
                        )}
                      />
                      <span
                        className={cn(
                          "flex-1 font-display text-[1.6rem] leading-none transition-transform duration-700 ease-[var(--ease-out-expo)] md:text-[2rem]",
                          "group-hover:translate-x-1.5",
                        )}
                      >
                        {s.name}
                      </span>
                      <span className="hidden eyebrow text-ash sm:block">{s.phase}</span>
                      <span aria-hidden className="relative ml-1 h-3 w-3 shrink-0">
                        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
                        <span
                          className={cn(
                            "absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-500 ease-[var(--ease-out-expo)]",
                            isOpen && "scale-y-0",
                          )}
                        />
                      </span>
                    </button>

                    <div id={`svc-${s.slug}`} className="acc-panel" data-open={isOpen}>
                      <div>
                        <div className="pb-8 pl-[44px] pr-6 md:pl-[56px]">
                          <p className="max-w-[52ch] text-[15px] leading-7 text-smoke">{s.detail}</p>
                          <div className="mt-6 flex items-center gap-8">
                            <Link
                              href={`/hizmetler/${s.slug}`}
                              className="group/link inline-flex items-center gap-3 eyebrow u-line"
                            >
                              Stüdyoda aç
                              <Arrow className="transition-transform duration-500 group-hover/link:translate-x-1" />
                            </Link>
                            <a
                              href={`mailto:${site.email}?subject=${encodeURIComponent(`Teklif: ${s.name}`)}`}
                              className="eyebrow text-ash u-line"
                            >
                              Teklif al
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
