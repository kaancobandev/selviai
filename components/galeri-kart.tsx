"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GaleriKaydi } from "@/lib/ai/storage";

/* Galeri kartı — küçük görsel, üretim künyesi ve silme.
   Küçültmeyi Next'in görsel iyileştiricisi yapar: kart 220 px genişliğinde
   ~10 KB'lık bir sürüm ister, tam boy 630 KB'lık dosya hiç indirilmez. */

const OLCU: Record<string, string> = {
  "16:9": "aspect-video",
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
  "4:5": "aspect-[4/5]",
};

export function GaleriKart({ kayit }: { kayit: GaleriKaydi }) {
  const [siliniyor, setSiliniyor] = useState(false);
  const [silindi, setSilindi] = useState(false);
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function sil() {
    setSiliniyor(true);
    setHata(null);
    try {
      const res = await fetch(`/api/kare/${kayit.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setSilindi(true);
    } catch {
      setHata("Silinemedi, tekrar deneyin.");
      setSiliniyor(false);
      setOnay(false);
    }
  }

  if (silindi) return null;

  // Saat dilimi açıkça verilmeli: sunucu UTC'de, tarayıcı yerel
  // dilimde biçimlendirince metinler tutmuyor ve hidrasyon patlıyor
  // (React #418). Yerelde görünmez — dev makinesi de UTC+3.
  const tarih = new Date(kayit.olusturuldu).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

  return (
    <figure className={cn("group flex flex-col", siliniyor && "opacity-40")}>
      <div
        className={cn(
          "relative overflow-hidden border border-mist bg-bone",
          OLCU[kayit.enBoy ?? "4:5"] ?? "aspect-[4/5]",
        )}
      >
        <Image
          src={`/api/kare/${kayit.id}`}
          alt={`${kayit.yerlesim ?? "kompozisyon"} · ${tarih}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        {kayit.kabul === false && (
          <span
            className="absolute left-2 top-2 bg-paper/90 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-smoke"
            title={kayit.gerekce ?? undefined}
          >
            Eşiğin altında
          </span>
        )}
      </div>

      <figcaption className="mt-2 flex flex-col gap-1">
        <span className="eyebrow tabular-nums text-ash">{tarih}</span>
        <span className="text-[11px] leading-4 text-smoke">
          {kayit.yerlesim} · {kayit.kirpma}
          {kayit.puan != null && ` · ${kayit.puan.toFixed(1)}`}
        </span>

        <div className="mt-1 flex items-center gap-3">
          <a
            href={`/api/kare/${kayit.id}`}
            download={`selvi-${kayit.id.slice(0, 8)}.jpg`}
            className="eyebrow u-line hover:text-ink"
          >
            İndir
          </a>
          {onay ? (
            <>
              <button
                type="button"
                onClick={sil}
                disabled={siliniyor}
                className="eyebrow text-ink u-line"
              >
                Emin misiniz
              </button>
              <button
                type="button"
                onClick={() => setOnay(false)}
                className="eyebrow text-ash u-line hover:text-ink"
              >
                Vazgeç
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setOnay(true)}
              className="eyebrow text-ash u-line hover:text-ink"
            >
              Sil
            </button>
          )}
        </div>
        {hata && <span className="text-[11px] text-smoke">{hata}</span>}
      </figcaption>
    </figure>
  );
}
