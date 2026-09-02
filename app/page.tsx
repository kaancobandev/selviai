import { Hero } from "@/components/hero";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { DotImageReveal } from "@/components/ui/dot-image-reveal";

/**
 * Ana sayfa — hero ve altındaki sekiz bölüm.
 *
 * İçeriğin tamamı yatırımcı sunumundan geliyor; hiçbir sayı burada
 * uydurulmadı. Sunum denetiminden ELENEN iddialar (kaynaksız pazar payı
 * tahminleri, doğrulanamayan rakip fiyatları) bilerek dışarıda.
 *
 * Ürün gelir öncesi. Bu yüzden sayfada müşteri sayısı, referans, logo duvarı
 * ve "Satın al" düğmesi YOK; onların yerine ne çalıştığını ve neyin henüz
 * çalışmadığını açıkça söyleyen satırlar var.
 */

const GIRDILER = [
  { etiket: "Girdi · Kişi", baslik: "Model", not: "Tek kişi, yüz net. Kimlik birebir korunur." },
  { etiket: "Girdi · Ürün", baslik: "Tasarım", not: "Düz zeminde tek parça en iyi sonucu verir." },
  { etiket: "Girdi · Sahne", baslik: "Mekân", not: "Işık yönü ve renk sıcaklığı buradan okunur." },
];

/* Vitrin sağlayıcı adı vermiyor: ziyaretçiye anlatılan şey Selvi'nin kendi
   üretim hattı. Aşama adları hattın GERÇEK yapısını tarif ediyor (üret →
   bağımsız denetim → yükselt); altyapı sağlayıcısı sunucu tarafında kalıyor
   (lib/ai/). "Katman" bilerek seçildi: Selvi'nin sahip olduğu şey bu hat ve
   denetim mantığı, temel modelin kendisi değil. */
const HAT = [
  { rol: "Üret", model: "Selvi üretim katmanı" },
  { rol: "Puanla", model: "Selvi denetim katmanı" },
  { rol: "Yükselt", model: "Selvi yüksek kalite katmanı" },
];

/* "Dikey" bir iş terimi; vitrinde kimse böyle konuşmuyor. Veri de bölüm
   de "sektör" adına geçti. */
const SEKTORLER = [
  { ad: "Moda", durum: "canlı", not: "Kıyafet, takı, aksesuar." },
  { ad: "Otomotiv", durum: "sırada", not: "Çizimden renderlanmış sahneye." },
  { ad: "Yat", durum: "sırada", not: "Tekne hattı ve iç yerleşim." },
  { ad: "Mimari", durum: "sırada", not: "Teknik çizim ve sahne." },
  { ad: "İç mekân", durum: "sırada", not: "Malzeme, ışık, yerleşim." },
];

/* Sektörler bölümünün görseli. lib/data.ts'teki u() ile aynı biçim ama
   w=1100: canvas'ın ihtiyacı olan en büyük kaynak genişliği ~554 CSS px ×
   dpr 2. Bileşen ham <img> kullandığı için next/image dönüşümü devrede değil.

   SEÇİM. Kullanıcı seçti: katlı denim yığını. Portre değil, malzeme ve doku
   fotoğrafı — bu yüzden "manken" demiyor, kumaşın kendisini gösteriyor.

   Efekt açısından da uygun: nokta reveal'i görseli ~30-55px çaplı dairelerden
   okutuyor, yani ince çizgi ve küçük detay gürültüye dönüşüyor. Denimde geniş
   ton lekeleri ve dokuma dokusu var, o ölçekte okunuyor. Aynı sebeple teknik
   çizim görseli elendi: beyaz kağıt üstüne ince çizgi bu ölçekte gürültü. */
const SEKTOR_GORSEL =
  "https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1100&q=80";

/* Rakip rakamlarının hepsi yayıncının kendi fiyat sayfasından. Photoroom,
   Claid ve ZMO bilerek yok: resmî fiyat sayfaları okunamadı ve üçüncü taraf
   rakamları çelişiyor. */
const RAKIPLER = [
  {
    ad: "Selvi",
    bizMi: true,
    model: "Kredi aboneliği",
    giris: "₺699 / ay",
    hiz: "12 sn medyan",
    kapi: "Var",
    yerel: "Türkçe · TL",
  },
  {
    ad: "Botika",
    model: "Abonelik",
    giris: "$33 / ay",
    hiz: "~15 dakika",
    kapi: "İnsan · 1–4 gün",
    yerel: "Yok",
  },
  {
    ad: "Lunaar Vision",
    model: "Tek seferlik kredi",
    giris: "$15 indirimli · $25 liste",
    hiz: "Belirtilmemiş",
    kapi: "Yok",
    yerel: "Türkçe · TL",
  },
  {
    ad: "Pebblely",
    model: "Abonelik",
    giris: "$9 / ay · 30 görsel",
    hiz: "Belirtilmemiş",
    kapi: "Yok",
    yerel: "Yok",
  },
];

const KIMLER = [
  "Pazaryeri satıcıları",
  "Kendi sitesi olan markalar",
  "Butik üretici ve atölyeler",
  "Ajans ve operasyon şirketleri",
  "Tasarım öğrencileri",
  "Bağımsız tasarımcılar",
];

const KARSILASTIRMA_SATIRLARI = [
  { etiket: "Model", alan: "model" },
  { etiket: "Giriş", alan: "giris" },
  { etiket: "Hız", alan: "hiz" },
  { etiket: "Kalite kapısı", alan: "kapi" },
  { etiket: "Yerel", alan: "yerel" },
] as const;

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Hero ile içerik arasındaki geçiş — kavislerin ışığı sınırın altında
          sönerek devam ediyor, böylece iki alan arasında keskin çizgi kalmıyor.
          Hero'ya dokunmadan çözülüyor. */}
      <div aria-hidden className="selvi-gecis pointer-events-none h-56 md:h-72" />

      {/* ── Ürün ─────────────────────────────────────────────────── */}
      <section
        id="urun"
        className="scroll-mt-16 px-5 pb-24 pt-4 md:scroll-mt-20 md:px-10 md:pb-32 md:pt-8"
      >
        {/* Üç girdi kart olarak: önceden ince ayraçlarla bölünmüş düz bir
            şeritti ve "yüklenecek üç şey" olduğu okunmuyordu. Hairline
            ızgara (gap-px + bg-hair) sayfanın kendi kart dili — kalite
            kapısı bölümü de aynısını kullanıyor. */}
        <Reveal className="mx-auto max-w-5xl">
          <div className="grid gap-px bg-hair sm:grid-cols-3">
            {GIRDILER.map((g, i) => (
              <div key={g.etiket} className="flex flex-col bg-ink p-7 md:p-8">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="eyebrow text-ash">{g.etiket}</span>
                  <span className="eyebrow tabular-nums text-vurgu">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <span className="mt-6 font-display text-2xl md:text-3xl">{g.baslik}</span>
                <span className="mt-3 text-[15px] leading-7 text-fog">{g.not}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-14 max-w-5xl">
          <div>
            <Button href="/hizmetler/kompozisyon" variant="koyuDolgu">
              Stüdyoyu aç
            </Button>
          </div>
        </Reveal>
      </section>

      {/* ── Kalite kapısı ────────────────────────────────────────── */}
      <section
        id="kalite-kapisi"
        className="scroll-mt-16 px-5 py-24 md:scroll-mt-20 md:px-10 md:py-32"
      >
        <Reveal className="mx-auto max-w-4xl">
          <p className="eyebrow text-ash">Kalite kapısı</p>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] md:text-5xl">
            Kare size gelmeden önce <em className="text-vurgu">ikinci bir model</em> onu
            puanlıyor.
          </h2>
          <p className="mt-7 max-w-[58ch] text-[15px] leading-7 text-fog md:text-base">
            Her kare, gösterilmeden önce ayrı bir modelle ürün sadakati ve anatomi açısından
            puanlanır. Eşiğin altındaysa daha güçlü bir modelle yeniden üretilir.
          </p>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-14 max-w-5xl">
          <ol className="grid gap-px overflow-hidden bg-hair sm:grid-cols-3">
            {HAT.map((h, i) => (
              <li key={h.rol} className="flex flex-col gap-2 bg-ink p-7">
                <span className="eyebrow text-vurgu">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-2xl">{h.rol}</span>
                <span className="text-[13px] leading-6 text-fog">{h.model}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ── Sektörler ────────────────────────────────────────────── */}
      <section id="sektorler" className="scroll-mt-16 px-5 py-24 md:scroll-mt-20 md:px-10 md:py-32">
        {/* İki sütun. Yükseklikler birbirinden BAĞIMSIZ: sağdaki kutu
            aspect-ratio ile ölçülü, sol sütunun metnine bağlı değil.
            gap değerleri bileşenin bleed'inden (~33px) büyük tutuldu. */}
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-stretch md:gap-14 lg:gap-20">
          {/* Sol — metin. Sola yaslı, tek sütun liste. Büyük "Moda" kartı ve
              2x2 ızgara kaldırıldı: yarım genişlikte sıkışıyorlardı. Hiyerarşi
              artık punto ve etiket rengiyle kuruluyor. */}
          <Reveal>
            <p className="eyebrow text-ash">Sektörler</p>
            <h2 className="mt-5 font-display text-4xl leading-[1.05] md:text-[2.75rem] lg:text-5xl">
              Bir çizimden <em className="text-vurgu">gerçek bir sahneye</em>.
            </h2>
            <p className="mt-5 max-w-[42ch] text-[15px] leading-6 text-fog">
              Aynı motor, farklı konu. Bugün açık olan tek hat moda.
            </p>

            <ul className="mt-8 border-t border-hair">
              {SEKTORLER.map((d) => {
                const canli = d.durum === "canlı";
                return (
                  <li key={d.ad} className="border-b border-hair py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span
                        className={
                          canli
                            ? "font-display text-2xl md:text-[1.75rem]"
                            : "font-display text-xl text-paper/90"
                        }
                      >
                        {d.ad}
                      </span>
                      <span
                        className={
                          canli
                            ? "eyebrow shrink-0 border border-vurgu/40 px-2.5 py-1 text-vurgu"
                            : "eyebrow shrink-0 text-ash"
                        }
                      >
                        {d.durum}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[14px] leading-6 text-fog">{d.not}</p>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          {/* Sağ — ölçülü kutu. DotImageReveal host'u height:100% kullanıyor;
              bu zincir tek sütunda kopup 0'a çöküyor, masaüstünde de yüksekliği
              sol sütunun metnine bağlıyor. aspect-ratio ikisini de çözüyor.
              dotColor'a GERÇEK renk veriliyor: canvas fillStyle var() çözmez.
              alt="" — görsel dekoratif, bölümün bilgisi tamamen sol sütunda. */}
          <Reveal delay={120} className="md:h-full">
            <div className="relative aspect-[4/5] w-full md:aspect-auto md:h-full md:min-h-[460px]">
              <DotImageReveal
                src={SEKTOR_GORSEL}
                alt=""
                background="transparent"
                dots={12}
                gap={12}
                radius={180}
                dotColor="rgba(191, 166, 238, 0.28)"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Rakip karşılaştırması ────────────────────────────────── */}
      <section
        id="karsilastirma"
        className="scroll-mt-16 px-5 py-24 md:scroll-mt-20 md:px-10 md:py-32"
      >
        <Reveal className="mx-auto max-w-4xl">
          <p className="eyebrow text-ash">Karşılaştırma</p>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] md:text-5xl">
            <em className="text-vurgu">Ayrıştığımız yer</em> başka.
          </h2>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-12 max-w-5xl">
          {/* Geniş tablo kendi içinde kayar; sayfa gövdesi yatayda taşmaz. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-hair">
                  <th className="eyebrow py-4 pr-6 font-medium text-ash">&nbsp;</th>
                  {RAKIPLER.map((r) => (
                    <th
                      key={r.ad}
                      className={
                        "py-4 pr-6 font-display text-xl font-normal " +
                        (r.bizMi ? "text-vurgu" : "text-paper")
                      }
                    >
                      {r.ad}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[15px] leading-6">
                {KARSILASTIRMA_SATIRLARI.map(({ etiket, alan }) => (
                  <tr key={alan} className="border-b border-hair">
                    <th scope="row" className="eyebrow py-4 pr-6 align-top font-medium text-ash">
                      {etiket}
                    </th>
                    {RAKIPLER.map((r) => (
                      <td
                        key={r.ad}
                        className={"py-4 pr-6 align-top " + (r.bizMi ? "text-paper" : "text-fog")}
                      >
                        {r[alan]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-[13px] leading-6 text-ash">
            Her rakam yayıncının kendi fiyat sayfasından. Hız ve fiyat rakamlarımız iç ölçümümüz.
          </p>
        </Reveal>
      </section>

      {/* ── Neden ────────────────────────────────────────────────── */}
      <section id="neden" className="scroll-mt-16 px-5 py-24 md:scroll-mt-20 md:px-10 md:py-32">
        <Reveal className="mx-auto max-w-4xl">
          <p className="eyebrow text-ash">Neden</p>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] md:text-5xl">
            Bir ürün görseli için <em className="text-vurgu">bugün</em> ödediğiniz para.
          </h2>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-12 max-w-4xl">
          <dl className="grid gap-px overflow-hidden bg-hair sm:grid-cols-2">
            <div className="bg-ink p-8">
              <dt className="eyebrow text-ash">Stüdyo çekimi</dt>
              <dd className="mt-5 space-y-3 text-[15px] leading-7 text-fog">
                <span className="block">
                  <span className="font-display text-3xl text-paper">₺499–999</span>
                  <span className="block">ürün başına</span>
                </span>
                <span className="block">Asgari sipariş 15–40 ürün — ilk fatura ₺16.500–32.500</span>
                <span className="block">Teslim 3 iş günü</span>
              </dd>
            </div>
            <div className="bg-ink p-8">
              <dt className="eyebrow text-vurgu">Selvi</dt>
              <dd className="mt-5 space-y-3 text-[15px] leading-7 text-fog">
                <span className="block">
                  <span className="font-display text-3xl text-paper">₺14–20</span>
                  <span className="block">kalite kapılı kare</span>
                </span>
                <span className="block">Asgari sipariş yok — ₺699/ay</span>
                <span className="block">Teslim saniyeler</span>
              </dd>
            </div>
          </dl>
        </Reveal>
      </section>

      {/* ── Kimin için ───────────────────────────────────────────── */}
      <section id="kimin-icin" className="scroll-mt-16 px-5 py-24 md:scroll-mt-20 md:px-10 md:py-32">
        <Reveal className="mx-auto max-w-4xl">
          <p className="eyebrow text-ash">Kimin için</p>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] md:text-5xl">
            Görsel üretmek zorunda olan, <em className="text-vurgu">stüdyo tutamayan</em> herkes.
          </h2>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-12 max-w-4xl">
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {KIMLER.map((k) => (
              <li key={k} className="border-t border-hair py-4 text-[15px] leading-7 text-paper/85">
                {k}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>
    </>
  );
}
