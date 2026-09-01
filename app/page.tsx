import { Hero } from "@/components/hero";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

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

const HAT = [
  { rol: "Üret", model: "Gemini 3.1 Flash Image" },
  { rol: "Puanla", model: "Gemini 3.1 Flash Lite Image" },
  { rol: "Yükselt", model: "Gemini 3 Pro Image" },
];

/* "Dikey" bir iş terimi; vitrinde kimse böyle konuşmuyor. Veri de bölüm
   de "sektör" adına geçti. */
const SEKTORLER = [
  { ad: "Moda", durum: "canlı", not: "Kıyafet, takı ve aksesuar. Bugün üretim yapan tek hat." },
  { ad: "Otomotiv", durum: "sırada", not: "Teknik çizimden renderlanmış sahneye." },
  { ad: "Yat", durum: "sırada", not: "Tekne hattı ve iç yerleşim görselleştirmesi." },
  { ad: "Mimari", durum: "sırada", not: "Temel teknik çizim ve çizimin sahneye dönüşümü." },
  { ad: "İç mekân", durum: "sırada", not: "Malzeme, ışık ve yerleşim denemeleri." },
];

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
                  <span className="eyebrow tabular-nums text-lila-soft">
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
            Kare size gelmeden önce <em className="text-lila-soft">ikinci bir model</em> onu
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
                <span className="eyebrow text-lila-soft">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-2xl">{h.rol}</span>
                <span className="text-[13px] leading-6 text-fog">{h.model}</span>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={180} className="mx-auto mt-10 max-w-4xl">
          {/* Bu iki satır bilerek burada: kapının bedeli ve sınırı söylenmezse
              vitrin, ürünün yapabildiğinden fazlasını vaat eder. */}
          <p className="text-[15px] leading-7 text-fog">
            Kapı bedava değil: kapılı üretim tipik olarak 12 saniyeden yaklaşık 20 saniyeye çıkıyor.
            Yükseltmenin maliyeti bizde kalıyor — müşteriye ek kredi yazılmıyor.
          </p>
          <p className="mt-4 text-[15px] leading-7 text-paper/80">
            Karşılaştırdığımız oyuncuların hiçbirinde otomatik kalite kapısı yok.
          </p>
        </Reveal>
      </section>

      {/* ── Sektörler ────────────────────────────────────────────── */}
      <section id="sektorler" className="scroll-mt-16 px-5 py-24 md:scroll-mt-20 md:px-10 md:py-32">
        <Reveal className="mx-auto max-w-4xl">
          <p className="eyebrow text-ash">Sektörler</p>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] md:text-5xl">
            Moda bugün. <em className="text-lila-soft">Tasarımın geri kalanı</em> sırada.
          </h2>
          <p className="mt-7 max-w-[58ch] text-[15px] leading-7 text-fog md:text-base">
            Aynı motor, farklı alanlar. Teknik çizimi renderlanmış bir sahneye çevirmek her
            sektörde aynı problem — değişen yalnızca konu.
          </p>
        </Reveal>

        {/* Moda ayrı ve büyük: bugün üretim yapan TEK hat bu. Eşit yükseklikte
            beş liste satırı olarak dizildiğinde o hiyerarşi kayboluyor ve
            sayfa beş şeyin de hazır olduğunu ima ediyordu. */}
        <Reveal delay={120} className="mx-auto mt-14 max-w-5xl">
          {SEKTORLER.filter((d) => d.durum === "canlı").map((d) => (
            <div key={d.ad} className="border border-hair bg-paper/[0.04] p-7 md:p-9">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <span className="font-display text-3xl md:text-4xl">{d.ad}</span>
                <span className="eyebrow border border-lila-soft/40 px-3 py-1.5 text-lila-soft">
                  {d.durum}
                </span>
              </div>
              <p className="mt-5 max-w-[54ch] text-[15px] leading-7 text-fog">{d.not}</p>
            </div>
          ))}

          <div className="mt-5 grid gap-px bg-hair sm:grid-cols-2">
            {SEKTORLER.filter((d) => d.durum !== "canlı").map((d) => (
              <div key={d.ad} className="flex flex-col bg-ink p-7">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-2xl">{d.ad}</span>
                  <span className="eyebrow text-ash">{d.durum}</span>
                </div>
                <p className="mt-3 text-[15px] leading-7 text-fog">{d.not}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Rakip karşılaştırması ────────────────────────────────── */}
      <section
        id="karsilastirma"
        className="scroll-mt-16 px-5 py-24 md:scroll-mt-20 md:px-10 md:py-32"
      >
        <Reveal className="mx-auto max-w-4xl">
          <p className="eyebrow text-ash">Karşılaştırma</p>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] md:text-5xl">
            <em className="text-lila-soft">Ayrıştığımız yer</em> başka.
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
                        (r.bizMi ? "text-lila-soft" : "text-paper")
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
            Bir ürün görseli için <em className="text-lila-soft">bugün</em> ödediğiniz para.
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
              <dt className="eyebrow text-lila-soft">Selvi</dt>
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
          <p className="mt-8 text-[13px] leading-6 text-ash">
            Giyimde iptal-iade oranı %21,6, sektörlerin en yükseği (Ticaret Bakanlığı). İadelerin
            %11&apos;i görselle uyuşmazlıktan (Coresight Research, 190 marka). Türkiye&apos;deki
            634.611 e-ticaret işletmesinin %75&apos;i şahıs işletmesi (ETBİS 2025). Stüdyo fiyatları
            studyofotopark.com, fotometrik360.com ve armut.com yayınlanmış listelerinden.
          </p>
        </Reveal>
      </section>

      {/* ── Kimin için ───────────────────────────────────────────── */}
      <section id="kimin-icin" className="scroll-mt-16 px-5 py-24 md:scroll-mt-20 md:px-10 md:py-32">
        <Reveal className="mx-auto max-w-4xl">
          <p className="eyebrow text-ash">Kimin için</p>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] md:text-5xl">
            Görsel üretmek zorunda olan, <em className="text-lila-soft">stüdyo tutamayan</em> herkes.
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
          <p className="mt-8 text-[13px] leading-6 text-ash">
            Hepsiburada&apos;da tek başına 102.000 aktif satıcı var (2025 yıl sonu SEC bildirimi).
          </p>
        </Reveal>
      </section>

      {/* ── Kapanış ──────────────────────────────────────────────── */}
      <section className="px-5 pb-32 pt-24 md:px-10 md:pb-40 md:pt-32">
        <Reveal className="mx-auto max-w-4xl">
          <div aria-hidden className="seam text-paper/25" />
          <h2 className="mt-14 font-display text-4xl leading-[1.05] md:text-6xl">İki kapı.</h2>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button href="/hizmetler/kompozisyon" variant="koyuDolgu" size="lg">
              Stüdyoyu aç
            </Button>
            <Button href="mailto:info@selviai.com" variant="koyuHatli" size="lg">
              info@selviai.com
            </Button>
          </div>
          <p className="mt-10 max-w-[58ch] text-[15px] leading-7 text-fog">
            Denemek için model, ürün ve mekân görselini hazır bulundurun. Ürün görselinde şeffaf PNG
            yerine düz zeminli JPEG daha iyi sonuç veriyor.
          </p>
          <p className="eyebrow mt-6 text-ash">İstanbul</p>
        </Reveal>
      </section>
    </>
  );
}
