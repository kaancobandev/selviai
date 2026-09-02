"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TEMA_ANAHTARI, TEMA_ACIK } from "@/lib/tema";

/**
 * Tema anahtarı.
 *
 * HİDRASYON TUZAĞI VE ÇÖZÜMÜ. Sunucu hangi temada olduğumuzu bilemez —
 * tercih localStorage'da ve `<head>`teki betik sınıfı ilk boyamadan önce
 * yazıyor. Bu yüzden ikonu `useState` ile seçmek iki kötü seçenekten
 * birine zorlar: ya sunucu-istemci uyuşmazlığı, ya da ilk karede yanlış
 * ikon. Onun yerine İKİ İKON DA DOM'a basılıyor ve hangisinin görüneceğine
 * CSS karar veriyor (`dark:` varyantı). Böylece doğru ikon ilk boyamada,
 * JavaScript hiç çalışmadan yerinde oluyor.
 *
 * Gösterilen ikon GİDİLECEK yeri anlatıyor: koyu temadayken güneş
 * (tıklayınca aydınlanır), açık temadayken ay.
 *
 * Erişilebilir ad SABİT ("Temayı değiştir"). Duruma göre değişen bir ad
 * (“Açık temaya geç”) daha bilgilendirici olurdu ama sunucuda bilinemez,
 * yani aynı uyuşmazlığı geri getirirdi. Sabit ad hem doğru hem yeterli.
 *
 * FAZ 5 KAPSAMI: burada View Transition animasyonu YOK. MagicUI'nin
 * daire-açılım geçişi Faz 8'e bırakıldı; üç ayrı yaması var (azaltılmış
 * hareket tercihi CSS ile durdurulamıyor çünkü WAAPI ile çalışıyor,
 * pointer-events sızıntısı, ilk tık hatası) ve anahtarın kendisinin
 * çalışması onlara bağlı olmamalı.
 */
export function TemaAnahtari({ className }: { className?: string }) {
  /* Yalnız erişilebilir durumu bildirmek için; görünüm CSS'ten geliyor. */
  const [hazir, setHazir] = useState(false);
  useEffect(() => setHazir(true), []);

  const dugmeRef = useRef<HTMLButtonElement>(null);

  /** Temayı DOM'da çevirir ve tercihi yazar. Senkron — çağıran buna güveniyor. */
  const uygula = () => {
    const kok = document.documentElement;
    const koyuOlacak = !kok.classList.contains("dark");
    kok.classList.toggle("dark", koyuOlacak);
    try {
      localStorage.setItem(TEMA_ANAHTARI, koyuOlacak ? "koyu" : TEMA_ACIK);
    } catch {
      /* Gizli sekmede ya da depolama kapalıyken yazma patlıyor. Tema yine
         de dönsün: tercih kalıcı olmaz ama oturum içinde çalışır. */
    }
  };

  const cevir = async () => {
    const kok = document.documentElement;

    /* YAMA 1 — AZALTILMIŞ HAREKET JS'TE KONTROL EDİLİYOR.
       Aşağıdaki animasyon WAAPI ile (`element.animate()`) kuruluyor ve
       `@media (prefers-reduced-motion)` bir WAAPI animasyonunu DURDURAMAZ;
       CSS yalnız CSS animasyonlarını kapatır. Tercihi burada okumazsak
       vestibüler duyarlılığı olan kullanıcı tam ekran bir daire açılımı
       yer. Ayrıca API yoksa (Firefox, eski Safari) yine düz çevriliyor. */
    const azHareket =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* YAMA 4 — SAYFA GÖRÜNÜR DEĞİLSE ANİMASYON YOK.
       `startViewTransition` render hattıyla ilerliyor; sayfa gizliyken
       (arka plan sekmesi) geri çağrı SÜRESİZ erteleniyor. Yani tema hiç
       dönmüyor ve tercih de yazılmıyor — kullanıcı geri geldiğinde tema
       aniden değişiyor. Ölçüm sırasında tam bu yaşandı: tık kaydedildi,
       hiçbir şey olmadı, panel görünür olunca geçiş birden tamamlandı. */
    if (
      azHareket ||
      document.visibilityState !== "visible" ||
      !("startViewTransition" in document) ||
      !dugmeRef.current
    ) {
      uygula();
      return;
    }

    /* YAMA 5 — BUTONUN YERİ GEÇİŞTEN **ÖNCE** OKUNUYOR.
       Önce `await gecis.ready` sonrasında okunuyordu. Geçiş etkinken kök
       öğe `view-transition-name: root` alıyor ve bazı mobil derlemelerde
       gerçek içerik o an düzenlenmiş sayılmıyor; `getBoundingClientRect()`
       sıfır dönüyor. Sonuç `circle(0px at 0px 0px)` — yani daire ekranın
       SOL ÜST köşesinden açılıyor ve merkez yanlış olduğu için hareket
       okunmuyor, tema "birden değişmiş" gibi görünüyor. Masaüstünde
       görünmüyordu çünkü orada düzen geçiş boyunca yerinde kalıyor.
       Ölçümü geçişten önce almanın hiçbir maliyeti yok. */
    const kutu = dugmeRef.current.getBoundingClientRect();
    /* Kutu yine de bozuksa merkez tahmin edilmiyor, sağ üste sabitleniyor:
       düğme orada duruyor ve yanlış bir merkezden açılan daire, hiç
       animasyon olmamasından daha kötü görünüyor. */
    const gecerli = kutu.width > 0 && kutu.height > 0;
    const gorunumG = document.documentElement.clientWidth || innerWidth;
    const gorunumY = document.documentElement.clientHeight || innerHeight;
    const x = gecerli ? kutu.left + kutu.width / 2 : gorunumG - 40;
    const y = gecerli ? kutu.top + kutu.height / 2 : 32;

    /* YÜZDEYLE, PİKSELLE DEĞİL.
       `::view-transition-new(root)` sözde öğesi görsel görünüme değil
       **anlık görüntü kapsayıcısına** göre konumlanıyor. Mobilde adres
       çubuğu gizlenip göründükçe bu ikisi ayrışıyor, yani piksel
       koordinatları kayıyor. Yüzdeler sözde öğenin KENDİ kutusuna göre
       çözüldüğü için bu farktan etkilenmiyor. Yarıçap da yüzde: %150
       kutunun köşegenini garantiyle aşıyor, dolayısıyla artık
       innerWidth/innerHeight hesabına hiç gerek yok. */
    const xy = `${((x / gorunumG) * 100).toFixed(2)}% ${((y / gorunumY) * 100).toFixed(2)}%`;

    /* YAMA 3 — İLK TIK. MagicUI'nin sürümü temayı bir React state'inden
       okuyor; state ilk render'da henüz doğru değeri taşımadığı için ilk
       tık ya hiçbir şey yapmıyor ya ters yöne dönüyordu. Burada durum
       DOM'dan okunuyor (`classList.contains`) ve `uygula` senkron
       çalışıyor, yani startViewTransition geri çağrısı bittiğinde DOM
       kesinlikle yeni temada. Ek bir `flushSync` gerekmiyor çünkü React
       state'i hiç devrede değil. */
    const gecis = (
      document as Document & {
        startViewTransition: (cb: () => void) => { ready: Promise<void> };
      }
    ).startViewTransition(() => uygula());

    try {
      await gecis.ready;
    } catch {
      return; // geçiş iptal edildi (art arda tık) — animasyon kurulmasın
    }

    kok.animate(
      { clipPath: [`circle(0% at ${xy})`, `circle(150% at ${xy})`] },
      {
        duration: 620,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  };

  return (
    <button
      ref={dugmeRef}
      type="button"
      onClick={cevir}
      aria-label="Temayı değiştir"
      title="Temayı değiştir"
      /* Hazır olana kadar tıklanamaz: betik sınıfı yazmadan önce basılırsa
         localStorage ile DOM ters düşebilir. */
      disabled={!hazir}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full",
        "text-current transition-colors duration-300",
        "hover:bg-current/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current",
        className,
      )}
    >
      {/* Güneş — KOYU temada görünür, "aydınlat" demek. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        className="hidden h-[18px] w-[18px] dark:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Ay — AÇIK temada görünür. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block h-[18px] w-[18px] dark:hidden"
      >
        <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.6 6.6 0 0 0 9.5 9.5Z" />
      </svg>
    </button>
  );
}
