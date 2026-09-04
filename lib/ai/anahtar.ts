/* ------------------------------------------------------------------
   Hangi Gemini anahtarı kullanılacak.

   Ücretsiz deneme ve ödeyen üretim AYRI Google Cloud projelerinde
   çalışır. Sebep tek bir cümlede: Gemini'nin hız sınırı PROJE bazlı,
   anahtar bazlı değil. Tek projede kalsaydık, ücretsiz denemeden gelen
   bir sel ödeyen müşterinin üretimini de 429'a sokardı.

   İkinci kazanç: her projenin kendi harcama tavanı var (Spend Cap).
   Ücretsiz taraftaki kötüye kullanım orada durur, ödeyen taraf
   çalışmayı sürdürür.

   Ücretsiz anahtar tanımlı değilse ana anahtara düşülür — kurulum
   yarım kalsa bile üretim durmasın.

   AMA BU GERİ DÜŞÜŞ ARTIK SESSİZ DEĞİL. Bugüne kadar öyleydi ve
   tehlikeliydi: ayrı proje kurulmamışsa ya da bir dağıtımda değişken
   tanımlı değilse, bütün anonim üretim doğrudan ana faturaya yazılıyor
   ve ayrı harcama tavanı diye bir fren kalmıyor. Kimliksiz üretim
   yapan bir üründe bu, kötüye kullanımın tavanını kaldırmak demek.
   `ayriProjedeMi()` bu durumu tespit edebiliyordu ama HİÇBİR YERDEN
   ÇAĞRILMIYORDU. Artık ilk ücretsiz üretimde bir kez uyarı basılıyor.
   ------------------------------------------------------------------ */

export type Katman = "ucretsiz" | "odeyen";

export const VARSAYILAN_KATMAN: Katman = "ucretsiz";

/* Uyarı süreç başına BİR KEZ: her üretimde basmak günlüğü doldurur ve
   gürültü, uyarıyı görünmez yapar. */
let uyarildi = false;

export function apiAnahtari(katman: Katman = VARSAYILAN_KATMAN): string | undefined {
  const ana = process.env.GEMINI_API_KEY?.trim() || undefined;
  if (katman === "odeyen") return ana;

  const ucretsiz = process.env.GEMINI_API_KEY_UCRETSIZ?.trim();
  if (!ucretsiz && !uyarildi) {
    uyarildi = true;
    console.warn(
      "UYARI: GEMINI_API_KEY_UCRETSIZ tanımlı değil. Anonim üretim ANA " +
        "anahtarla ve ana faturayla çalışıyor; ücretsiz katmanın ayrı " +
        "harcama tavanı devrede değil.",
    );
  }
  return ucretsiz || ana;
}

/** Ücretsiz katman ayrı bir projede mi çalışıyor — teşhis ve günlük için. */
export function ayriProjedeMi(): boolean {
  const ucretsiz = process.env.GEMINI_API_KEY_UCRETSIZ?.trim();
  return Boolean(ucretsiz && ucretsiz !== process.env.GEMINI_API_KEY?.trim());
}
