import type { Metadata } from "next";
import { MarketGrid } from "@/components/market-grid";
import { Button } from "@/components/ui/button";
import { collections } from "@/lib/data";

export const metadata: Metadata = {
  title: "Koleksiyon Marketi",
  description: "Tasarımcıların yüklediği koleksiyonları keşfedin ve satın alın.",
};

export default function MarketPage() {
  return (
    <div className="px-5 pb-28 pt-28 md:px-10 md:pt-40">
      <header className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-fog">Koleksiyon Marketi</p>
          <h1 className="mt-5 font-display text-6xl leading-[0.95] tracking-[-0.01em] md:text-8xl">
            Market
          </h1>
        </div>
        <div className="flex items-center gap-8">
          <span className="eyebrow tabular-nums text-fog">{collections.length} koleksiyon</span>
          <Button href="/market/yukle" variant="ghost">
            Koleksiyon yükle
          </Button>
        </div>
      </header>

      <MarketGrid collections={collections} />
    </div>
  );
}
