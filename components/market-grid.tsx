"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { collectionCategories, type Collection, type CollectionCategory } from "@/lib/data";
import { cn } from "@/lib/utils";
import { CollectionCard } from "@/components/collection-card";
import { Reveal } from "@/components/ui/reveal";

type Sort = "yeni" | "artan" | "azalan";

const sortLabels: Record<Sort, string> = {
  yeni: "Yeni",
  artan: "Fiyat, artan",
  azalan: "Fiyat, azalan",
};

export function MarketGrid({ collections }: { collections: Collection[] }) {
  const [category, setCategory] = useState<CollectionCategory>("Tümü");
  const [sort, setSort] = useState<Sort>("yeni");

  const visible = useMemo(() => {
    const list = category === "Tümü" ? collections : collections.filter((c) => c.category === category);
    if (sort === "artan") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "azalan") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [collections, category, sort]);

  return (
    <>
      {/* Filtre çubuğu — kaydırınca başlığın altına yapışır */}
      <div className="sticky top-16 z-30 -mx-5 mt-14 border-y border-hair bg-zemin/90 px-5 backdrop-blur-md md:top-20 md:-mx-10 md:px-10">
        <div className="flex items-center justify-between gap-6">
          <div className="-mx-1 flex min-w-0 gap-6 overflow-x-auto py-4 pr-8 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {collectionCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                data-active={category === cat}
                className={cn(
                  "mx-1 whitespace-nowrap eyebrow u-line transition-colors duration-500",
                  category === cat ? "text-kalem" : "text-fog hover:text-kalem",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <label className="flex shrink-0 items-center gap-3 eyebrow text-fog">
            <span className="hidden sm:inline">Sırala</span>
            <span className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="cursor-pointer appearance-none bg-transparent py-4 pr-5 eyebrow text-kalem outline-none"
              >
                {(Object.keys(sortLabels) as Sort[]).map((k) => (
                  <option key={k} value={k}>
                    {sortLabels[k]}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="pointer-events-none absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-kalem"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M3 6l5 5 5-5" />
              </svg>
            </span>
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-32 text-center">
          <p className="font-display text-2xl">Bu kategoride henüz koleksiyon yok.</p>
          <Link href="/market/yukle" className="mt-6 inline-block eyebrow u-line">
            İlk koleksiyonu siz yükleyin
          </Link>
        </div>
      ) : (
        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 md:gap-x-6 md:gap-y-16 lg:grid-cols-4">
          {visible.map((c, i) => (
            <Reveal key={c.id} delay={(i % 4) * 70}>
              <CollectionCard collection={c} priority={i < 4} />
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
