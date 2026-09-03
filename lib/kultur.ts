/* ------------------------------------------------------------------
   KÜLTÜR ANALİZİ — kaynak yönlendirmesi ve prompt.

   KÜRASYON LİSTESİ NEDEN "KAYNAK" DEĞİL "YANLILIK".

   İlk akla gelen tasarım şuydu: kapsamlı bir link dosyası tutup her
   soruda modele verelim. İki sebeple böyle yapılmadı.

   1. Prompt'a link yazmak modele o sayfayı AÇTIRMAZ. Model yalnız URL
      metnini görür ve içeriğini hafızasından uydurur — sonuç kaynaklı
      GÖRÜNEN ama kaynaksız bir metin olur; bu, hiç kaynak vermemekten
      kötüdür çünkü sahte güven üretir. Gerçekten açması için
      `url_context` aracı gerekir.
   2. O araç bile istek başına EN ÇOK 20 URL alıyor ve yalnız herkese
      açık sayfaları okuyabiliyor. Kapsamlı bir liste yüzlerce link
      olacağı için her soruda ilgili 20'yi SEÇMEK gerekir — ki bu zaten
      aramanın çözdüğü problem.

   Bu yüzden liste, aramanın YERİNE değil, aramanın YANINDA duruyor:
   modele "şu tür kaynakları öncele, şunlara güvenme" diye söylüyoruz.
   Ev görüşü buradan geliyor; kapsama işini arama yapıyor.

   LİSTE BÜYÜTÜLMEK İÇİN VAR. Aşağısı başlangıç; kurum ve yayın ekledikçe
   analiz ev görüşüne yaklaşır.
   ------------------------------------------------------------------ */

/** Öncelenecek kaynak türleri — modele yönlendirme olarak veriliyor. */
export const ONCELIKLI_KAYNAKLAR = [
  "üniversite ve hakemli dergi arşivleri (DergiPark, JSTOR, akademik yayınlar)",
  "müze ve koleksiyon arşivleri (V&A, The Met Costume Institute, MoMu, Sakıp Sabancı Müzesi)",
  "kurumsal moda arşivleri ve marka tarihçeleri (birincil kaynak olduğunda)",
  "kültürel miras kurumları ve devlet arşivleri",
  "yerleşik moda gazeteciliği (Vogue Business, BoF, Showstudio, 032c, Dazed)",
] as const;

/** Kaçınılacaklar — model bunları kaynak saymamalı. */
export const ZAYIF_KAYNAKLAR = [
  "içerik çiftliği blogları ve SEO amaçlı 'trend' listeleri",
  "alışveriş sitelerinin kategori sayfaları",
  "kaynak göstermeyen Pinterest/Instagram derlemeleri",
  "yapay zekâ tarafından üretilmiş özet siteleri",
] as const;

/**
 * Analiz prompt'u.
 *
 * ÜÇ BÖLÜM İSTENİYOR ve sıra önemli: önce ne GÖRÜLDÜĞÜ (betimleme),
 * sonra nereden BESLENDİĞİ (iddia), en sonda DİKKAT (kültürel köken,
 * temellük riski). Üçüncü bölüm isteğe bağlı değil — bir tasarım
 * yönünün kültürel kökenini konuşup riskini konuşmamak, aracın en
 * sorumsuz hâli olurdu.
 *
 * Model AÇIKÇA uyarılıyor: emin olmadığında emin olmadığını yazsın.
 * İddialı çıktı seçildi, ama iddia ile spekülasyonun ayrımı korunmalı.
 */
export function buildKulturPrompt(brief: string): string {
  return [
    "Bir moda tasarım yönünün kültürel arka planını analiz ediyorsun.",
    "Türkçe yaz. Okuyucu profesyonel bir tasarımcı; giriş cümlesi ve özet kurma.",
    "",
    "TASARIM YÖNÜ",
    `  ${brief.trim().slice(0, 700)}`,
    "",
    /* ÖZGÜLLÜK İSTEMEK, "ARA" DEMEKTEN ÇOK DAHA İYİ ÇALIŞIYOR.
       Ölçüldü: yalnız "aramadan yanıtlama" diyen biçim KARARSIZ — aynı
       istek bir koşumda hiç arama yapmadan (groundingMetadata: null),
       başka koşumda 2 sorgu/5 kaynakla döndü. Doğrulanabilir çıpa
       isteyen biçim ise 5 sorgu/12 kaynak üretti ve sorgular somuttu
       (Jacquemus SS2021, Armani Guggenheim 2000, Lemaire SS2021).
       Sebep anlaşılır: "keten ceket, toprak tonları" tarifini model
       kendinden emin biliyor ve aramaya ihtiyaç duymuyor; ad, yıl ve
       arşiv kaydı istenince hafıza yetmiyor.

       `toolConfig: { functionCallingConfig: { mode: "ANY" } }` DENENDİ
       ve BOZDU: 112 saniye, sıfır arama, sıfır metin. O ayar özel
       fonksiyon bildirimleri için; yerleşik arama aracıyla çakışıyor. */
    "ARAMA ZORUNLU",
    "  Bu konuyu aramadan yanıtlama.",
    "  Analizde EN AZ ÜÇ DOĞRULANABİLİR ÇIPA bulunmalı: adıyla anılan bir",
    "  tasarımcı ya da moda evi, bir koleksiyon ve yılı, ya da bir sergi",
    "  veya arşiv kaydı. Bunları hafızandan yazma — aramayla doğrula.",
    "  Doğrulayamadığın çıpayı hiç yazma.",
    `  Öncele: ${ONCELIKLI_KAYNAKLAR.join("; ")}.`,
    `  Kaynak sayma: ${ZAYIF_KAYNAKLAR.join("; ")}.`,
    "  Bulguların bu kaynaklarla çelişiyorsa çelişkiyi açıkça yaz.",
    "",
    "YAZACAKLARIN — tam olarak bu üç başlık, bu sırayla:",
    "",
    "## Ne görülüyor",
    "  Yöndeki somut biçim, malzeme ve stil işaretlerini betimle. Yorum yok.",
    "",
    "## Nereden besleniyor",
    "  Bu işaretlerin hangi dönem, sahne, altkültür ya da coğrafyayla",
    "  ilişkili olduğunu açıkla. Somut ol: yıl, yer, akım adı ver.",
    "  Emin olmadığın bir bağlantıyı 'olası' diye işaretle; uydurma.",
    "",
    "## Dikkat",
    "  Kültürel köken, temellük riski, kutsal ya da törensel anlam taşıyan",
    "  öğeler, yanlış atıf riski. Sorun yoksa bunu da yaz — boş bırakma.",
    "",
    "BİÇİM",
    "  Her başlık altında 2-4 kısa paragraf. Madde işareti kullanma.",
    "  Kaynakça YAZMA: kaynaklar arayüzde ayrıca gösteriliyor.",
    "  Tasarımcıya ne yapması gerektiğini söyleme; bu bir analiz, brief değil.",
  ].join("\n");
}

/* ------------------------------------------------------------------
   KAYNAK KEFALETİ — KARA LİSTE DEĞİL, BEYAZ LİSTE.

   Prompt'taki "şunları kaynak sayma" yönlendirmesi TAVSİYE, kural değil:
   ölçümde model yine de perakende ve sosyal medya adresleri döndürdü,
   hepsi akademik arşivlerle aynı ağırlıkta listeleniyordu.

   ÖNCE KARA LİSTE DENENDİ VE İŞE YARAMADI. facebook/pinterest/amazon
   gibi tanınmış adresler yazıldı; ikinci ölçümde 14 kaynağın HİÇBİRİ
   listeye düşmedi çünkü zayıf kaynaklar tanınmış platformlar değil,
   uzun kuyruktu: representclo.com, endclothing.com, panacomp.net —
   küçük mağazalar ve turizm siteleri. Sonuç, olmamasından kötüydü:
   işaretsiz bir liste "hepsi denetlendi ve temiz" demek oluyordu.

   Bu yüzden yön çevrildi. Kefil OLABİLDİKLERİMİZ işaretleniyor; geri
   kalan işaretsiz kalıyor ve arayüz bunun ne demek olduğunu açıkça
   yazıyor: "doğrulanmadı", "kötü" değil. Beyaz liste zaten yukarıdaki
   ONCELIKLI_KAYNAKLAR'ın makine okunur hâli — iki yerde iki farklı
   ölçüt olmasın.

   Liste büyütülmek için var.
   ------------------------------------------------------------------ */
const GUCLU_SONEKLER = [".edu", ".ac.uk", ".gov", ".museum", ".edu.tr", ".ac.jp"];

const GUCLU_ALANLAR = [
  // Akademik arşiv ve dizinler
  "dergipark.org.tr",
  "jstor.org",
  "academia.edu",
  "researchgate.net",
  // Müze ve koleksiyon arşivleri
  "vam.ac.uk",
  "metmuseum.org",
  "momu.be",
  "moma.org",
  "sakipsabancimuzesi.org",
  "europeana.eu",
  "smithsonianmag.com",
  // Yerleşik moda gazeteciliği
  "voguebusiness.com",
  "businessoffashion.com",
  "showstudio.com",
  "032c.com",
  "dazeddigital.com",
  "ft.com",
  "nytimes.com",
  "theguardian.com",
  "latimes.com",
  "washingtonpost.com",
  "bbc.co.uk",
  "bbc.com",
  "reuters.com",
  "apnews.com",
  "economist.com",
];

/**
 * Kaynağın kefil olunabilir bir kurumdan gelip gelmediği.
 *
 * Gemini'nin döndürdüğü `adres` bir yönlendirme sarmalayıcısı ve gerçek
 * alan adı BAŞLIKTA duruyor; o yüzden kontrol başlık üzerinden.
 * Alt alan adları da sayılıyor ("collections.vam.ac.uk").
 */
export function guvenilirKaynakMi(baslik: string): boolean {
  const ad = baslik.trim().toLowerCase().replace(/^www\./, "");
  if (GUCLU_SONEKLER.some((s) => ad === s.slice(1) || ad.endsWith(s))) return true;
  return GUCLU_ALANLAR.some((z) => ad === z || ad.endsWith(`.${z}`));
}

/** Analizin üç bölümü — arayüz metni bunlara göre ayırıyor. */
export const BOLUMLER = [
  { anahtar: "Ne görülüyor", etiket: "Ne görülüyor" },
  { anahtar: "Nereden besleniyor", etiket: "Nereden besleniyor" },
  { anahtar: "Dikkat", etiket: "Dikkat" },
] as const;

export type Bolum = { etiket: string; govde: string };

/**
 * Modelin markdown başlıklarını bölümlere ayırır.
 *
 * Başlık gelmezse metnin tamamı TEK bölüm olarak dönüyor — bölümleme
 * uğruna metni kaybetmek en kötü sonuç olurdu.
 */
export function bolumlereAyir(metin: string): Bolum[] {
  const satirlar = metin.split(/\r?\n/);
  const bolumler: Bolum[] = [];
  let aktif: Bolum | null = null;

  for (const satir of satirlar) {
    const baslik = satir.match(/^\s{0,3}#{1,4}\s+(.+?)\s*$/);
    if (baslik) {
      if (aktif) bolumler.push(aktif);
      aktif = { etiket: baslik[1].replace(/\*+/g, "").trim(), govde: "" };
      continue;
    }
    if (aktif) aktif.govde += (aktif.govde ? "\n" : "") + satir;
  }
  if (aktif) bolumler.push(aktif);

  const temiz = bolumler
    .map((b) => ({ ...b, govde: b.govde.trim() }))
    .filter((b) => b.govde);
  return temiz.length ? temiz : [{ etiket: "Analiz", govde: metin.trim() }];
}
