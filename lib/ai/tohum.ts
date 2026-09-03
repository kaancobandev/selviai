import { calismaOku, getJob } from "./jobs";
import { oturumOku } from "./session";
import { TURETILMIS_TURLER, type TuretilmisTur } from "./types";

/* ------------------------------------------------------------------
   STÜDYO TOHUMU

   Ana sayfadaki akışın çıktısını stüdyo araçlarının okuyabileceği hâle
   getirir. Sunucuda çalışır: stüdyo sayfaları sunucu bileşeni ve tohumu
   prop olarak aşağı geçiriyorlar.

   NEDEN ADRES DÖNÜYOR, BAYT DEĞİL. Kareler özel kovada duruyor ve
   `/api/kare/...` ucundan servis ediliyor; o uç oturum çerezine bakıyor.
   Tarayıcı zaten çerezi taşıdığı için adres yeterli, baytları sunucudan
   istemciye taşımak gereksiz.

   NEDEN OTURUM DOĞRULANIYOR. Kayıt oturum anahtarı altında tutuluyor
   ama işlerin kendisi kimlikle saklanıyor; kaydın işaret ettiği işin
   GERÇEKTEN bu oturuma ait olduğunu ayrıca kontrol ediyoruz. Aksi hâlde
   eski bir oturumdan kalan kayıt başkasının karesini açabilirdi.
   ------------------------------------------------------------------ */

export type StudyoTohum = {
  /** Kullanıcının yazdığı istek — araçlar başlık/ad üretmek için kullanıyor. */
  brief: string;
  /** Seçilen ilham karesi. */
  secilen: string;
  /** Dört ilham karesinin tamamı (seçilen dahil). */
  ilham: string[];
  /** Türetilmiş çıktılar; iş henüz bitmediyse eksik olabilir. */
  turetilmis: Partial<Record<TuretilmisTur, string>>;
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
      });
    }
  }

  return {
    brief: calisma.brief,
    secilen: adres(calisma.ilhamIs, calisma.secilenSira),
    ilham: kareler.map((_, i) => adres(calisma.ilhamIs, i)),
    turetilmis,
  };
}
