"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Harf harf çevrilen yazı animasyonu.
 *
 * Kaynak: Vengeance UI — https://www.vengenceui.com/components/flip-text
 * (kayıt: Ashutoshx7/VengeanceUI, public/r/flip-text.json)
 *
 * Dışarıdan alınmış bir bileşen olduğu için API'si olduğu gibi bırakıldı
 * (İngilizce prop adları, orijinal davranış) — kaynak güncellenirse
 * karşılaştırmak kolay olsun diye. Depodaki diğer bileşenler Türkçe adlandırma
 * kullanır; buradaki istisna bilinçli.
 *
 * Kaynakta sarmalayıcıya inline `perspective: 1000px` veriliyordu. Onu
 * kaldırdık: perspektif sarmalayıcının MERKEZİNDEN uygulanıyor, dolayısıyla
 * merkeze uzak harfler aşırı çarpıtılıyordu. Demo tek kısa satır olduğu için
 * sorun görünmüyor; çok satırlı geniş bir başlıkta harfler dev gölgeler
 * halinde taşıyor. Perspektif artık CSS'te harf başına veriliyor.
 *
 * Görünümün tamamı CSS'te: `.flip-char` ve `flip-char-turn` / `flip-char-fade`
 * keyframe'leri (app/globals.css). Bileşenin tek işi her karakteri kendi
 * span'ine koyup gecikmesini hesaplamak.
 *
 * DİKKAT — erişilebilirlik: her harf ayrı bir span olduğu için ekran
 * okuyucular metni harf harf okuyabilir. Kullanıldığı yerde bu düğümü
 * `aria-hidden` yapıp yanına `sr-only` bir kopya koymak gerekiyor; hero'da
 * öyle yapılıyor.
 */

interface FlipTextProps {
  /** Sarmalayıcıya eklenecek sınıflar */
  className?: string;
  /** Animasyonlanacak metin (boşluklardan bölünür) */
  children: string;
  /** Çevirme süresi (saniye) @default 2.2 */
  duration?: number;
  /** Başlamadan önceki gecikme (saniye) @default 0 */
  delay?: number;
  /** Sonsuz tekrar etsin mi @default true */
  loop?: boolean;
  /** Bölme ayıracı @default " " */
  separator?: string;
  /** Tüm harfler birlikte mi dönsün (kademesiz) @default false */
  together?: boolean;
}

export function FlipText({
  className,
  children,
  duration = 2.2,
  delay = 0,
  loop = true,
  separator = " ",
  together = false,
}: FlipTextProps) {
  const words = useMemo(() => children.split(separator), [children, separator]);
  const totalChars = children.length;

  // Her karakterin metin içindeki mutlak sırası — kademeli gecikme buna göre
  const getCharIndex = (wordIndex: number, charIndex: number) => {
    let index = 0;
    for (let i = 0; i < wordIndex; i++) {
      index += words[i].length + (separator === " " ? 1 : separator.length);
    }
    return index + charIndex;
  };

  return (
    <div className={cn("flip-text-wrapper inline-block leading-none", className)}>
      {words.map((word, wordIndex) => {
        const chars = word.split("");

        return (
          <span key={wordIndex} className="word inline-block whitespace-nowrap">
            {chars.map((char, charIndex) => {
              const currentGlobalIndex = getCharIndex(wordIndex, charIndex);

              // `together` kapalıyken gecikme sinüs eğrisiyle dağıtılıyor:
              // baştaki harfler arasındaki fark büyük, sona doğru sıkışıyor.
              let calculatedDelay = delay;
              if (!together) {
                const normalizedIndex = currentGlobalIndex / totalChars;
                const sineValue = Math.sin(normalizedIndex * (Math.PI / 2));
                calculatedDelay = sineValue * (duration * 0.25) + delay;
              }

              return (
                <span
                  key={charIndex}
                  className="flip-char"
                  data-char={char}
                  style={
                    {
                      "--flip-duration": `${duration}s`,
                      // toFixed(3) kaynakta yok, biz ekledik. Math.sin
                      // ECMAScript'te bit düzeyinde aynı olmak zorunda değil;
                      // Node ile tarayıcı son basamakta ayrışıyor ve her
                      // yüklemede hydration uyuşmazlığı veriyordu
                      // (0.44605706461467676 / ...687). Milisaniye
                      // hassasiyeti fazlasıyla yeterli.
                      "--flip-delay": `${calculatedDelay.toFixed(3)}s`,
                      "--flip-iteration": loop ? "infinite" : "1",
                    } as React.CSSProperties
                  }
                >
                  {char}
                </span>
              );
            })}
            {separator === " " && wordIndex < words.length - 1 && (
              <span className="whitespace inline-block">&nbsp;</span>
            )}
            {separator !== " " && wordIndex < words.length - 1 && (
              <span className="separator inline-block">{separator}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default FlipText;
