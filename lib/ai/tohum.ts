import { calismaOku, getJob } from "./jobs";
import { oturumOku } from "./session";
import { TURETILMIS_TURLER, type TuretilmisTur } from "./types";

/* ------------------------------------------------------------------
   STÜDYO TOHUMU

   Ana sayfadaki akışın çıktısını stüdyo araçlarının okuyabileceği hâle
   getirir. Sunucuda çalışır: stüdyo sayfaları sunucu bileşeni ve tohumu
   prop olarak aşağı geçiriyorlar.

   NEDEN ADRES DÖNÜYOR, BAYT DEĞİL. Kareler özel kovada duruyor ve
   `/api/kare/...` ucundan servis ediliyor. Baytları sunucudan istemciye
   taşımak gereksiz; adres yeterli.

   DİKKAT — O UÇ OTURUM KONTROLÜ YAPMIYOR. Burada eskiden "o uç oturum
   çerezine bakıyor" yazıyordu ve YANLIŞTI: ne `/api/kare/[id]` ne de
   `/api/kare/[id]/[k]` çerez okuyor (yalnız `DELETE` okuyor). Bugünkü
   koruma, iş kimliğinin tahmin edilemez bir UUID olması — yani
   "listelenmemiş bağlantı" düzeyinde. `/api/kare/[id]/route.ts` bunu
   zaten biliyor ve oturum kontrolünü Faz 4'e bırakmış.

   Yanlış güvenlik iddiası yorumsuzluktan kötüdür; sonraki okuyan ona
   dayanıp gerçekten gizli veri koyabilir. Kesim ucu (`/api/kesim`) bu
   yüzden kendi kontrolünü kendi yapıyor: kare kesmek üretim tetiklediği
   için orada sahiplik AYRICA doğrulanıyor.

   NEDEN OTURUM DOĞRULANIYOR. Kayıt oturum anahtarı altında tutuluyor
   ama işlerin kendisi kimlikle saklanıyor; kaydın işaret ettiği işin
   GERÇEKTEN bu oturuma ait olduğunu ayrıca kontrol ediyoruz. Aksi hâlde
   eski bir oturumdan kalan kayıt başkasının karesini açabilirdi.
   ------------------------------------------------------------------ */

/**
 * Bir karenin KİMLİĞİ — adresi değil.
 *
 * Kolaj kesimi "şu adresi kes" diyemez: `/api/kare/...` adresi yalnız
 * tarayıcı için anlamlı, sunucu kovadaki yolu iş kaydından çözüyor ve
 * o sırada karenin bu oturuma ait olduğunu doğruluyor. Adresi ayrıştırıp
 * kimliğe geri çevirmek de mümkündü ama kırılgan: adres biçimi bizim
 * iç meselemiz, iki yerde bilinmesi gerekmesin.
 */
export type TohumKare = {
  url: string;
  isId: string;
  sira: number;
  etiket: string;
};

export type StudyoTohum = {
  /** Kullanıcının yazdığı istek — araçlar başlık/ad üretmek için kullanıyor. */
  brief: string;
  /** Seçilen ilham karesi. */
  secilen: string;
  /** Dört ilham karesinin tamamı (seçilen dahil). */
  ilham: string[];
  /** Türetilmiş çıktılar; iş henüz bitmediyse eksik olabilir. */
  turetilmis: Partial<Record<TuretilmisTur, string>>;
  /** Her karenin kimliği — kesim gibi sunucuya kare gösteren araçlar için. */
  kareler: TohumKare[];
};

export async function tohumOku(): Promise<StudyoTohum | null> {
  const oturum = await oturumOku();
  if (!oturum) return null;

  const calisma = await calismaOku(oturum);
  if (!calisma) return null;

  const ilhamIs = await getJob(calisma.ilhamIs);
  if (!ilhamIs || ilhamIs.sessionId !== oturum) return null;

  const kareler = ilhamIs.kareler ?? [];
  const secilenKare = kareler[calisma.secilenSira];
  if (!secilenKare) return null;

  const adres = (isId: string, sira: number) => `/api/kare/${isId}/${sira}`;

  const kimlikler: TohumKare[] = kareler.map((k, i) => ({
    url: adres(calisma.ilhamIs, i),
    isId: calisma.ilhamIs,
    sira: i,
    etiket: k.eksen,
  }));

  const turetilmis: Partial<Record<TuretilmisTur, string>> = {};
  if (calisma.turetIs) {
    const turetIs = await getJob(calisma.turetIs);
    /* Oturum eşleşmesi burada da aranıyor: iki iş ayrı kayıtlar ve
       birinin doğrulanması ötekini doğrulamıyor. */
    if (turetIs && turetIs.sessionId === oturum) {
      (turetIs.kareler ?? []).forEach((k, i) => {
        if ((TURETILMIS_TURLER as readonly string[]).includes(k.eksen)) {
          turetilmis[k.eksen as TuretilmisTur] = adres(calisma.turetIs!, i);
        }
        kimlikler.push({
          url: adres(calisma.turetIs!, i),
          isId: calisma.turetIs!,
          sira: i,
          etiket: k.eksen,
        });
      });
    }
  }

  return {
    brief: calisma.brief,
    secilen: adres(calisma.ilhamIs, calisma.secilenSira),
    ilham: kareler.map((_, i) => adres(calisma.ilhamIs, i)),
    turetilmis,
    kareler: kimlikler,
  };
}
