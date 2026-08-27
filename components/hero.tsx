import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-ink text-bone">
      {site.hero.video ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={site.hero.video}
          poster={site.hero.image}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <Image
          src={site.hero.image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="photo drift object-cover object-[50%_30%]"
        />
      )}

      {/* Üstte başlık, altta metin okunurluğu için iki yumuşak geçiş */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent via-35% to-ink/75"
      />

      {/* Sağ kenar: dikey dikiş + kaydır ipucu */}
      <div className="absolute bottom-0 right-10 hidden flex-col items-center gap-5 pb-16 md:flex">
        <span className="eyebrow rotate-180 text-bone/70 [writing-mode:vertical-rl]">Kaydır</span>
        <span aria-hidden className="seam-y h-24 text-bone" />
      </div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-10 md:px-10 md:pb-16">
        <p className="rise rise-1 eyebrow text-bone/75">{site.tagline}</p>
        <h1 className="rise rise-2 mt-10 font-display text-[17vw] leading-[0.9] tracking-[-0.015em] sm:text-[14vw] md:text-[9rem] lg:text-[10.5rem]">
          <span className="block">İlhamdan</span>
          <span className="block italic">vitrine.</span>
        </h1>
        <div className="rise rise-3 mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between md:mt-10">
          <p className="max-w-[34ch] text-[15px] leading-7 text-bone/80">
            Moodboard&apos;dan lookbook&apos;a, bir koleksiyonun bütün yolculuğu tek çatı altında.
          </p>
          <div className="flex gap-8 sm:pb-1 md:pr-16">
            <Link href="/#hizmetler" className="eyebrow u-line">
              Hizmetler
            </Link>
            <Link href="/market" className="eyebrow u-line">
              Market
            </Link>
            <Link href="/akademi" className="eyebrow u-line">
              Akademi
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
