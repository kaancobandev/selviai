"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { bolumlereAyir, guvenilirKaynakMi, type Bolum } from "@/lib/kultur";
import type { StudyoTohum } from "@/lib/ai/tohum";

/* ------------------------------------------------------------------
   KÜLTÜR ANALİZİ

   Depodaki TEK metin üreten araç. Diğerleri görsel üretiyor ya da
   yerel düzenleyici; burada çıktı okunacak bir şey.

   KAYNAKLAR SÜS DEĞİL TAŞIYICI. Bu araç iddia üretiyor ("bu yön şu
   akımdan besleniyor") ve iddianın tek güvencesi kaynağı. Bu yüzden
   kaynaklar dipnot gibi en alta gömülmüyor: analizle aynı görsel
   ağırlıkta, yanında duruyor. Modelin hangi sorguları çalıştırdığı da
   gösteriliyor — kullanıcı neye baktığını görebilmeli.

   Arama yapılmadıysa bu AÇIKÇA söyleniyor. Kaynaksız bir kültür
   analizini sessizce kaynaklıymış gibi sunmak, aracın yapabileceği en
   zararlı şey.

   ÜRETİM ARKA PLANDA. Analiz canlı arama yaptığı için 10-30 saniye
   sürüyor; senkron uçlar 10 saniyede kesildiğinden iş kuyruğa giriyor
   ve burası görsel araçlarıyla aynı yoklama döngüsünü kullanıyor.
   ------------------------------------------------------------------ */

type Kaynak = { baslik: string; adres: string };
type Sonuc = { bolumler: Bolum[]; kaynaklar: Kaynak[]; sorgular: string[]; ms: number };

const YOKLAMA_MS = 1500;
const YOKLAMA_TAVANI_MS = 3 * 60 * 1000;

export function KulturAnalizi({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [brief, setBrief] = useState(tohum?.brief ?? "");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [isId, setIsId] = useState<string | null>(null);
  const [adim, setAdim] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function calistir() {
    if (brief.trim().length < 8) {
      setHata("Tasarım yönünü birkaç cümleyle yazın.");
      return;
    }
    setMesgul(true);
    setHata(null);
    setSonuc(null);
    setAdim(null);
    setIsId(null);
    try {
      const r = await fetch("/api/kultur", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Analiz başlatılamadı.");
        setMesgul(false);
        return;
      }
      // Yoklamayı aşağıdaki etki devralıyor; `mesgul` orada kapanıyor.
      setIsId(j.jobId as string);
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
      setMesgul(false);
    }
  }

  /* İptal bayrağı şart: Strict Mode etkiyi iki kez çalıştırıyor ve
     bileşen sökülünce eski döngü hâlâ state yazmaya kalkar. Yoklama
     GET olduğu için ikinci döngünün baştan başlaması zararsız. */
  useEffect(() => {
    if (!isId) return;
    let iptal = false;
    const basladi = Date.now();

    const tur = async () => {
      if (iptal) return;
      try {
        const r = await fetch(`/api/jobs/${isId}`, { cache: "no-store" });
        const j = await r.json();
        if (iptal) return;

        if (j.status === "completed") {
          const a = j.analiz;
          if (a?.metin) {
            setSonuc({
              bolumler: bolumlereAyir(a.metin),
              kaynaklar: a.kaynaklar ?? [],
              sorgular: a.sorgular ?? [],
              ms: j.meta?.ms ?? 0,
            });
          } else {
            setHata("Analiz boş döndü. Tekrar deneyin.");
          }
          setMesgul(false);
          return;
        }
        if (j.status === "failed") {
          setHata(j.error ?? "Analiz tamamlanamadı.");
          setMesgul(false);
          return;
        }
        setAdim(typeof j.step === "string" ? j.step : null);
      } catch {
        /* Ağ tökezlemesi işi bitirmez; sonraki turda tekrar denenir. */
      }
      if (Date.now() - basladi > YOKLAMA_TAVANI_MS) {
        if (!iptal) {
          setHata("Analiz beklenenden uzun sürdü. Tekrar deneyin.");
          setMesgul(false);
        }
        return;
      }
      setTimeout(tur, YOKLAMA_MS);
    };

    void tur();
    return () => {
      iptal = true;
    };
  }, [isId]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-5 px-6 pt-8 md:flex-row md:items-end md:justify-between md:px-10 md:pt-10">
        <div>
          <p className="eyebrow text-fog">Kültür analizi · Araştırma</p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl">Bu yön nereden geliyor</h1>
        </div>
        {sonuc && (
          <p className="eyebrow text-fog">
            {sonuc.kaynaklar.length} kaynak · {(sonuc.ms / 1000).toFixed(1)} sn
          </p>
        )}
      </header>

      <div className="mt-8 grid flex-1 gap-px border-t border-hair bg-hair lg:grid-cols-[340px_1fr]">
        <aside className="flex flex-col gap-6 bg-zemin px-6 py-8">
          {tohum && (
            <div>
              <p className="eyebrow text-fog">Seçilen yön</p>
              <span className="relative mt-3 block aspect-[4/5] w-full overflow-hidden bg-hair">
                <Image src={tohum.secilen} alt="" fill unoptimized sizes="320px" className="object-cover" />
              </span>
            </div>
          )}

          <Field label="Tasarım yönü" htmlFor="ka-brief">
            <Textarea
              id="ka-brief"
              rows={5}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Neyi analiz edelim?"
            />
          </Field>

          <Button variant="solid" onClick={calistir} disabled={mesgul}>
            {mesgul ? "Araştırılıyor…" : "Analiz et"}
          </Button>

          <p className="text-[13px] leading-6 text-fog">
            Analiz canlı arama sonuçlarına dayanıyor. Yorum kısmı yine de bir
            okumadır — kaynakları açıp kendiniz doğrulayın.
          </p>

          {hata && (
            <p className="border-l-2 border-vurgu pl-4 text-[15px] leading-7 text-kalem">{hata}</p>
          )}
        </aside>

        <section className="bg-zemin px-6 py-8 md:px-10">
          {!sonuc && !mesgul && (
            <p className="max-w-[52ch] text-[15px] leading-7 text-fog">
              Soldaki yönü yazıp “Analiz et”e basın. Model önce arama yapar,
              sonra bulduğu kaynaklara dayanarak yazar.
            </p>
          )}

          {mesgul && (
            <div className="flex flex-col gap-4">
              {/* İkinci deneme SESSİZ GEÇMİYOR: kullanıcı neden daha
                  uzun beklediğini bilmeli. */}
              <p className="eyebrow text-fog">
                {adim === "yeniden-araniyor"
                  ? "İlk denemede kaynak dönmedi, yeniden aranıyor"
                  : "Kaynaklar taranıyor"}
              </p>
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-4 w-full max-w-2xl animate-pulse bg-kalem/[0.06]" />
              ))}
            </div>
          )}

          {sonuc && (
            <div className="grid gap-12 xl:grid-cols-[1fr_280px]">
              <article className="flex max-w-[68ch] flex-col gap-10">
                {sonuc.bolumler.map((b) => (
                  <section key={b.etiket}>
                    <h2 className="font-display text-2xl">{b.etiket}</h2>
                    {b.govde.split(/\n{2,}/).map((p, i) => (
                      <p key={i} className="mt-4 text-[15px] leading-7 text-kalem">
                        {p.replace(/\*\*/g, "")}
                      </p>
                    ))}
                  </section>
                ))}
              </article>

              <aside className="flex flex-col gap-8">
                <div>
                  <p className="eyebrow text-fog">Kaynaklar</p>
                  {sonuc.kaynaklar.length > 0 && (
                    /* Sayıyı ÖNDE söylemek önemli: ölçümde 14 kaynağın
                       çoğu küçük mağaza ve turizm sitesiydi. İşaretsiz
                       bir listeyi kullanıcı "denetlenmiş" sanabilir. */
                    <p className="mt-3 text-[13px] leading-6 text-fog">
                      {sonuc.kaynaklar.filter((k) => guvenilirKaynakMi(k.baslik)).length}/
                      {sonuc.kaynaklar.length} kaynak tanıdığımız bir kurumdan geliyor.
                      İşaretsiz olanlar kötü demek değil, <em className="not-italic text-kalem">doğrulanmamış</em> demek.
                    </p>
                  )}
                  {sonuc.kaynaklar.length ? (
                    <ul className="mt-4 flex flex-col gap-3">
                      {sonuc.kaynaklar.map((k) => (
                        <li key={k.adres} className="border-t border-hair pt-3">
                          {/* Başlık öne çıkıyor çünkü Gemini'nin döndürdüğü
                              adres yönlendirme sarmalayıcısı — kullanıcıya
                              hiçbir şey anlatmıyor; alan adı başlıkta. */}
                          <a
                            href={k.adres}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="u-line text-[14px] leading-6 text-kalem"
                          >
                            {k.baslik}
                          </a>
                          {/* Kefil olabildiğimiz kurumlar işaretleniyor;
                              geri kalan "kötü" değil, DOĞRULANMAMIŞ. Ayrımı
                              aşağıdaki not açıklıyor. */}
                          {guvenilirKaynakMi(k.baslik) && (
                            <span className="mt-1 block text-[12px] leading-5 text-fog">
                              Kurumsal / akademik kaynak
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    /* Kaynaksız analiz sessizce kaynaklıymış gibi
                       sunulmamalı — aracın yapabileceği en zararlı şey bu. */
                    <p className="mt-4 border-l-2 border-vurgu pl-4 text-[14px] leading-6 text-kalem">
                      Bu yanıt için kaynak dönmedi. Metni doğrulanmamış bir
                      okuma olarak değerlendirin.
                    </p>
                  )}
                </div>

                {sonuc.sorgular.length > 0 && (
                  <div>
                    <p className="eyebrow text-fog">Çalıştırılan aramalar</p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {sonuc.sorgular.map((s) => (
                        <li key={s} className="text-[13px] leading-6 text-fog">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
