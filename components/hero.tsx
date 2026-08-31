import Link from "next/link";
import { Arrow } from "@/components/ui/button";

/**
 * Hero — siyah zemin üzerinde akan lila ışık.
 *
 * Işık bir görsel dosyası değil: üst üste binen, ağır bulanıklık verilmiş
 * radyal gradyanlar. Böylece hero'nun ağırlığı sıfır kalıyor (indirilecek
 * dosya yok), her ekran boyutunda aynı kompozisyonu koruyor ve rengi tek
 * bir token'dan yönetiliyor.
 */

const rakamlar = [
  { deger: "Öğren → Üret → Sat", etiket: "Tek platform" },
  { deger: "On disiplin", etiket: "Stüdyo" },
];

export function Hero() {
  return (
    <section className="relative isolate flex h-[100svh] min-h-[640px] flex-col overflow-hidden bg-ink text-paper">
      {/* ── Lila ışık ───────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Ana kütle — sağ üstten inen sıcak lila çekirdek */}
        <div
          className="absolute -right-[10%] -top-[28%] h-[105%] w-[78%] rounded-full opacity-95 blur-[100px]"
          style={{
            background:
              "radial-gradient(closest-side, #f0e4ff 0%, #c9a3ff 26%, #8b4cf0 52%, #4a1d8f 72%, transparent 86%)",
          }}
        />
        {/* Işık sırtı — örnekteki dalgayı veren parlak yay.
            Halka biçimli gradyan: içi boş, kenarı parlak. */}
        <div
          className="absolute -bottom-[78%] left-[-30%] h-[150%] w-[160%] rounded-[50%] opacity-90 blur-[45px]"
          style={{
            background:
              "radial-gradient(closest-side, transparent 58%, #7c3aed 66%, #c9a3ff 73%, #f4ebff 76%, #a970f5 80%, #4a1d8f 88%, transparent 96%)",
          }}
        />
        {/* Sol alttan yükselen ikinci, sönük kütle — kompozisyonu dengeler */}
        <div
          className="absolute -bottom-[35%] -left-[18%] h-[80%] w-[62%] rounded-full opacity-70 blur-[130px]"
          style={{
            background: "radial-gradient(closest-side, #9d6ef0 0%, #5b2ea8 48%, transparent 76%)",
          }}
        />
        {/* Metin bölgesini karartan perdeler — başlık her zaman okunur kalsın */}
        <div className="absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-ink via-ink/80 via-30% to-transparent" />
        <div className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-ink/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-ink/90 to-transparent" />
      </div>

      {/* ── Başlık bloğu ────────────────────────────────────────── */}
      <div className="flex flex-1 items-center px-5 pt-24 md:px-10">
        <div className="w-full max-w-4xl">
          <p className="rise rise-1 eyebrow text-lila-soft">
            Yapay zekâ destekli yaratıcı tasarım platformu
          </p>

          <h1 className="rise rise-2 mt-7 font-display text-[15vw] leading-[0.92] tracking-[-0.02em] sm:text-[11vw] md:text-[7.5rem] lg:text-[8.5rem]">
            <span className="block">Fikirden</span>
            <span className="block">gerçek ürüne.</span>
          </h1>

          <p className="rise rise-3 mt-8 max-w-[46ch] text-[15px] leading-7 text-paper/75 md:text-base">
            SELVI AI; tasarım öğrenme, üretme ve satma süreçlerini tek platformda
            birleştiren yapay zekâ destekli bir yaratıcı tasarım altyapısıdır.
          </p>

          <div className="rise rise-3 mt-10">
            <Link
              href="/hizmetler/kompozisyon"
              className="group inline-flex items-center gap-3 bg-paper px-6 py-4 text-[13px] font-medium tracking-[0.02em] text-ink transition-colors duration-300 hover:bg-lila-soft"
            >
              Stüdyoyu dene
              <Arrow className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Alt şerit: iki rakam solda, tek cümle sağda ─────────── */}
      <div className="rise rise-3 px-5 pb-10 md:px-10 md:pb-12">
        <div className="flex flex-col gap-8 border-t border-paper/15 pt-7 sm:flex-row sm:items-start sm:justify-between">
          <dl className="flex flex-wrap gap-x-12 gap-y-5">
            {rakamlar.map((r) => (
              <div key={r.etiket}>
                <dt className="text-[15px] font-semibold leading-tight">{r.deger}</dt>
                <dd className="mt-1.5 eyebrow text-paper/50">{r.etiket}</dd>
              </div>
            ))}
          </dl>
          <p className="max-w-[34ch] text-[15px] leading-7 text-paper/70 sm:text-right">
            Yaratıcı fikri öğrenilebilir, üretilebilir ve satılabilir hale getiren
            altyapı. Moda, ilk dikeyimiz.
          </p>
        </div>
      </div>
    </section>
  );
}
