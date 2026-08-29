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
   ------------------------------------------------------------------ */

export type Katman = "ucretsiz" | "odeyen";

export const VARSAYILAN_KATMAN: Katman = "ucretsiz";

export function apiAnahtari(katman: Katman = VARSAYILAN_KATMAN): string | undefined {
  const ana = process.env.GEMINI_API_KEY?.trim() || undefined;
  if (katman === "odeyen") return ana;
  return process.env.GEMINI_API_KEY_UCRETSIZ?.trim() || ana;
}

/** Ücretsiz katman ayrı bir projede mi çalışıyor — teşhis ve günlük için. */
export function ayriProjedeMi(): boolean {
  const ucretsiz = process.env.GEMINI_API_KEY_UCRETSIZ?.trim();
  return Boolean(ucretsiz && ucretsiz !== process.env.GEMINI_API_KEY?.trim());
}
