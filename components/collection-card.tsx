import Image from "next/image";
import type { Collection } from "@/lib/data";
import { cn, formatTRY } from "@/lib/utils";
import { BuyButton } from "@/components/buy-button";

type CardData = Pick<Collection, "name" | "designer" | "season" | "pieces" | "price"> & {
  image?: string;
};

type Props = {
  collection: CardData;
  className?: string;
  priority?: boolean;
  /** Önizleme modunda satın al butonu gizlenir */
  interactive?: boolean;
};

export function CollectionCard({ collection: c, className, priority, interactive = true }: Props) {
  const isLocal = c.image?.startsWith("blob:") || c.image?.startsWith("data:");

  return (
    <article className={cn("group flex flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-mist">
        {c.image ? (
          <Image
            src={c.image}
            alt={c.name}
            fill
            priority={priority}
            unoptimized={isLocal}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="photo-reveal object-cover group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center eyebrow text-ash">
            Görsel
          </div>
        )}
        {c.season && (
          <span className="absolute left-3 top-3 bg-bone/90 px-2.5 py-2 eyebrow text-ink">
            {c.season}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight sm:text-xl">{c.name || "Koleksiyon adı"}</h3>
          <p className="mt-2 eyebrow leading-4 text-ash">
            {c.designer || "Tasarımcı"}
            {c.pieces ? ` · ${c.pieces} parça` : ""}
          </p>
        </div>
        <p className="whitespace-nowrap text-sm tabular-nums sm:pt-0.5">{formatTRY(c.price || 0)}</p>
      </div>

      {interactive && <BuyButton className="mt-4" />}
    </article>
  );
}
