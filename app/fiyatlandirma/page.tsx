import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { abonelikPlanlari } from "@/lib/planlar";

export const metadata: Metadata = {
  /* Kök layout `title.template = "%s — Selvi AI"` uyguluyor; marka adı
     burada tekrarlanmıyor. */
  title: "Fiyatlandırma",
  description:
    "Selvi AI planları: aylık kredi, kredi başı fiyat ve kalite kapılı kare maliyeti bir arada.",
  /* ZORUNLU: app/layout.tsx `alternates: { canonical: "/" }` tanımlıyor ve
     bu değer çocuk sayfalara MİRAS KALIYOR. Ezilmezse /fiyatlandirma
     kendini ana sayfa olarak canonical'lar ve arama motoru bu rotayı
     yok sayar. */
  alternates: { canonical: "/fiyatlandirma" },
};

const TANIMLAR = [
  { terim: "Kredi", aciklama: "Plana dahil olan aylık üretim hakkı." },
  { terim: "Kredi başı", aciklama: "Aylık ücretin plandaki kredi sayısına bölümü." },
  {
    terim: "Kalite kapılı kare",
    aciklama: "Kalite kapısından geçen kare başına düşen maliyet.",
  },
];

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="fiyat-ikincil">{etiket}</dt>
      <dd className="tabular-nums text-paper">{deger}</dd>
    </div>
  );
}

export default function FiyatlandirmaPage() {
  return (
    <div className="pb-28 pt-28 md:pt-40">
      {/* Başlık — market ve akademi ile aynı kabuk: tam genişlikte
          px-5 md:px-10, bölüm içinde mx-auto max-w-6xl. Başlık bloğu ile
          kart ızgarası AYNI genişlikte, yoksa 1024px üstünde kartlar
          başlığın iki yanından taşıp sayfa kenar hizasını kırıyor. */}
      <header className="px-5 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow text-fog">Planlar ve krediler</p>
            <h1 className="mt-5 font-display text-6xl leading-[0.95] tracking-[-0.01em] md:text-8xl">
              Fiyatlandırma
            </h1>
          </div>
          <p className="max-w-[42ch] text-[15px] leading-7 text-fog lg:pb-3">
            Kredi satıyoruz, kota değil. Hızlı kare 1 kredi · Kalite kapılı kare 2 kredi ·
            Teknik çizim → render 4 kredi.
          </p>
        </div>
      </header>

      {/* Kart alanı.
          Bu bölüme overflow-hidden EKLENMEYECEK: atadaki kırpma kartların
          backdrop-filter'ını sessizce öldürür. Kırpma zaten .fiyat-zemin'in
          kendi maskesiyle yapılıyor. Aynı şey filter, opacity<1, transform,
          mask ve clip-path için de geçerli.
          Kartlar bilerek <Reveal> ile SARILMADI: .reveal görünüme girene
          kadar opacity<1 + will-change taşıyor, bu da backdrop root açıp
          camı boş bırakıyor ve sonra "patlatıyordu". Kullanıcı zaten
          hareket istemedi. */}
      <section
        aria-labelledby="planlar-basligi"
        className="fiyat-alan mt-16 px-5 md:mt-20 md:px-10"
      >
        {/* Bölümün görünür bir başlığı yok ama başlık hiyerarşisinde
            karşılığı olmalı: h1'den sonra doğrudan h3'lere düşülemez. */}
        <h2 id="planlar-basligi" className="sr-only">
          Aylık planlar
        </h2>

        {/* Camın bulanıklaştıracağı statik doku. Kartların ATASI değil
            KARDEŞİ: maske taşıdığı için ata konumunda backdrop root
            yaratır ve camı öldürürdü.
            Doğrulama yöntemi: bu katmanı geçici olarak kaldırın; kartların
            görünümü DEĞİŞMİYORSA frost hiç çalışmıyordu. */}
        <div aria-hidden className="fiyat-zemin" />

        <div className="relative mx-auto grid max-w-6xl gap-5 lg:grid-cols-3 lg:gap-6">
          {abonelikPlanlari.map((p) => {
            const baslikId = `plan-${p.ad.toLowerCase()}`;

            return (
              /* aria-labelledby + gerçek başlık: fiyat KARŞILAŞTIRMA
                 sayfasında ekran okuyucu kullanıcısının planlar arasında
                 gezinmesinin tek yolu bu. Plan adı <span> olsaydı kartlar
                 isimsiz gruplar olarak geçilirdi. */
              <article
                key={p.ad}
                aria-labelledby={baslikId}
                className={p.oneCikan ? "fiyat-kart fiyat-kart-one" : "fiyat-kart"}
              >
                {/* Cam yüzey ve kenar halkası ayrı katmanlar — yarıçap
                    artefaktı ve backdrop root sorunları bu ayrım sayesinde
                    oluşmuyor. */}
                <div aria-hidden className="fiyat-cam" />
                <div aria-hidden className="fiyat-halka" />

                {/* Konumlanmış kardeşler akış içeriğinden SONRA boyandığı
                    için içerik kendi yığın seviyesine alınıyor. */}
                <div className="relative z-10 flex h-full flex-col p-7 md:p-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 id={baslikId} lang={p.dil} className="eyebrow fiyat-vurgu">
                      {p.ad}
                    </h3>
                    {p.oneCikan && (
                      <span className="fiyat-rozet eyebrow">en çok seçilen</span>
                    )}
                  </div>

                  <p className="fiyat-ikincil mt-5 text-[14px] leading-6">{p.ozet}</p>

                  <p className="mt-7 flex items-baseline gap-2">
                    <span className="font-display text-5xl leading-none tracking-[-0.01em] md:text-6xl">
                      {p.aylik}
                    </span>
                    <span className="fiyat-ikincil text-[13px]">/ ay</span>
                  </p>

                  {/* Etiketler ana sayfadaki tabloyla birebir aynı
                      ("Kredi", "Kredi başı", "Kalite kapılı kare"); aynı
                      satır iki sayfada iki farklı adla görünmesin. */}
                  <dl className="fiyat-ayrac mt-8 space-y-3 pt-7 text-[15px] leading-6">
                    <Satir etiket="Kredi" deger={String(p.kredi)} />
                    <Satir etiket="Kredi başı" deger={p.krediBasi} />
                    <Satir etiket="Kalite kapılı kare" deger={p.kare} />
                  </dl>

                  <div className="mt-auto pt-9">
                    {/* Üç kartta birebir aynı "Erken erişim" metni, bağlantı
                        listesinde ayırt edilemez üç öğe demek (WCAG 2.4.4).
                        Görünmeyen önek her bağlantıya kendi adını veriyor. */}
                    <Button
                      href={`mailto:${site.email}?subject=${encodeURIComponent(
                        `Selvi AI — ${p.ad} planı`,
                      )}`}
                      variant={p.oneCikan ? "koyuDolgu" : "koyuHatli"}
                      className={p.oneCikan ? "w-full" : "fiyat-dugme-hat w-full"}
                    >
                      <span className="sr-only">{p.ad} planı için </span>Erken erişim
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Tablo sözlüğü — cam alanın DIŞINDA, düz mürekkep zeminde. Buradaki
          text-fog / text-ash mevcut sayfalardaki değerleriyle geçiyor
          (7,85:1 ve 5,59:1); o token'lar yalnız cam yüzeyde düşüyordu. */}
      <section className="mt-16 px-5 md:mt-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="eyebrow text-fog">Tabloda ne var</h2>
          <dl className="mt-8 grid gap-px bg-hair sm:grid-cols-3">
            {TANIMLAR.map((t) => (
              <div key={t.terim} className="bg-zemin p-6 md:p-7">
                <dt className="text-[15px] text-kalem">{t.terim}</dt>
                <dd className="mt-2 text-[14px] leading-6 text-fog">{t.aciklama}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-12 max-w-[60ch] text-[15px] leading-7 text-fog">
            Kalite kapısı bir kareyi yetersiz bulup daha güçlü modele yükselttiğinde ek kredi
            yazılmıyor — yükseltmenin maliyeti bizde.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button href={`mailto:${site.email}`} variant="solid">
              Erken erişim için yazın
            </Button>
            <Button href="/#karsilastirma" variant="ghost">
              Karşılaştırma
            </Button>
          </div>
          {/* Ödeme altyapısı kodda hiç yok. Çalışmayan bir "Satın al"
              düğmesi koymak yerine bunu açıkça söylüyoruz. */}
          <p className="mt-5 text-[13px] text-ash">Ödeme altyapısı henüz açık değil.</p>
        </div>
      </section>
    </div>
  );
}
