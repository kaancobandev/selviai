"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { bolumlereAyir, type Bolum } from "@/lib/kultur";
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
   ------------------------------------------------------------------ */

type Kaynak = { baslik: string; adres: string };
type Sonuc = { bolumler: Bolum[]; kaynaklar: Kaynak[]; sorgular: string[]; ms: number };

export function KulturAnalizi({ tohum }: { tohum?: StudyoTohum | null } = {}) {
  const [brief, setBrief] = useState(tohum?.brief ?? "");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
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
    try {
      const r = await fetch("/api/kultur", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const j = await r.json();
      if (!r.ok) {
        setHata(j.error ?? "Analiz tamamlanamadı.");
        return;
      }
      setSonuc({
        bolumler: bolumlereAyir(j.metin ?? ""),
        kaynaklar: j.kaynaklar ?? [],
        sorgular: j.aramaSorgulari ?? [],
        ms: j.ms ?? 0,
      });
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      setMesgul(false);
    }
  }

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
              <p className="eyebrow text-fog">Kaynaklar taranıyor</p>
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
