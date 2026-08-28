/* ------------------------------------------------------------------
   Altın set — model ölçümünün sabit girdisi (Faz 2).

   Sekiz vaka, kompozisyon motorunun zorlandığı eksenleri kasten
   geriyor: ince taş detayı, kulak/el yerleşimi, koyu ürün, farklı ten
   tonu, sert dış mekân ışığı. Girdiler Unsplash'ten sabit kimliklerle
   çekilir; set değişmediği sürece ölçümler karşılaştırılabilir kalır.

   Yeni model çıktığında MODELLER'e bir satır eklenir, set aynı kalır.
   ------------------------------------------------------------------ */

const foto = (id) =>
  `https://images.unsplash.com/photo-${id}?fm=jpg&fit=crop&w=1280&q=90`;

/** Girdi görselleri — rol atamaları göz kontrolüyle yapıldı. */
const K = {
  kadinKoyuFon: foto("1524504388940-b1c1722653e1"),
  kadinAsyali: foto("1581044777550-4cfa60707c03"),
  kadinDenim: foto("1517677129300-07b130802f46"),
  kadinBere: foto("1487412720507-e7ab37603c6f"),
  kadinPembeDuvar: foto("1503342217505-b0a15ec3261c"),
  erkekSakalli: foto("1521572267360-ee0c2909d518"),
  erkekGozluklu: foto("1600180758890-6b94519a8ba6"),
};

const U = {
  yuzukPave: foto("1587947330318-88fcd9055420"),
  yuzukHaloSiyah: foto("1605100804763-247f67b3557e"),
  kolyeKalp: foto("1588444837495-c6cfeb53f32d"),
  kolyeTasli: foto("1589128777073-263566ae5e4d"),
  kupeHalka: foto("1617038220319-276d3cfab638"),
  panco: foto("1434389677669-e08b4cac3105"),
  esofman: foto("1594633312681-425c7b97ccd1"),
  canta: foto("1605733513597-a8f8341084e6"),
};

const S = {
  studyoFon: foto("1604147706283-d7119b5b822c"),
  oturmaOdasi: foto("1618221195710-dd6b41faaea6"),
  yatakOdasi: foto("1578683010236-d716f9a3f461"),
  colGunbatimi: foto("1536987333706-fc9adfb10d91"),
  giyinmeOdasi: foto("1567401893414-76b7b1e5a7a5"),
  turuncuGradyan: foto("1617957718614-8c23f060c2d0"),
};

export const VAKALAR = [
  {
    id: "kolye-portre",
    tur: "takı",
    zorluk: "İnce zincir ve taş sayısının korunması",
    person: K.kadinKoyuFon, product: U.kolyeKalp, scene: S.studyoFon,
    crop: "portre", placement: "boyun", lighting: "studyo", aspect: "3:4",
  },
  {
    id: "kupe-profil",
    tur: "takı",
    zorluk: "Küpenin kulağa doğru oturması, çift küpe tutarlılığı",
    person: K.kadinAsyali, product: U.kupeHalka, scene: S.oturmaOdasi,
    crop: "portre", placement: "kulak", lighting: "sahne", aspect: "3:4",
  },
  {
    id: "yuzuk-el",
    tur: "takı",
    zorluk: "El ve parmak anatomisi, pavé taş sırası",
    person: K.kadinDenim, product: U.yuzukPave, scene: S.studyoFon,
    crop: "detay", placement: "el", lighting: "studyo", aspect: "1:1",
  },
  {
    id: "kolye-erkek",
    tur: "takı",
    zorluk: "Farklı ten tonu ve sakal; kimlik korunumu",
    person: K.erkekSakalli, product: U.kolyeTasli, scene: S.yatakOdasi,
    crop: "portre", placement: "boyun", lighting: "sahne", aspect: "4:5",
  },
  {
    id: "yuzuk-koyu",
    tur: "takı",
    zorluk: "Koyu ürün çekimi, karışık sahne",
    person: K.kadinKoyuFon, product: U.yuzukHaloSiyah, scene: S.giyinmeOdasi,
    crop: "detay", placement: "el", lighting: "gece", aspect: "1:1",
  },
  {
    id: "panco-ic-mekan",
    tur: "kıyafet",
    zorluk: "Örgü dokusunun ve saçak sayısının korunması",
    person: K.kadinBere, product: U.panco, scene: S.oturmaOdasi,
    crop: "yarim", placement: "govde", lighting: "sahne", aspect: "4:5",
  },
  {
    id: "esofman-studyo",
    tur: "kıyafet",
    zorluk: "Renk sadakati; turuncu fon ürünü kirletmemeli",
    person: K.kadinPembeDuvar, product: U.esofman, scene: S.turuncuGradyan,
    crop: "tam", placement: "govde", lighting: "studyo", aspect: "3:4",
  },
  {
    id: "canta-dis-mekan",
    tur: "aksesuar",
    zorluk: "Sert gün batımı ışığı; gölge yönü ve renk sıcaklığı uyumu",
    person: K.erkekGozluklu, product: U.canta, scene: S.colGunbatimi,
    crop: "yarim", placement: "bilek", lighting: "altin", aspect: "16:9",
  },
];

/* ------------------------------------------------------------------
   Modeller ve fiyatlar. Fiyatlar ai.google.dev/gemini-api/docs/pricing
   sayfasından, 2026-08-28 tarihinde alındı; milyon token başına ABD
   doları. Çıktı görseli token olarak faturalanır (1K kare ≈ 1120 token,
   2.5 Flash'ta 1290), bu yüzden gerçek maliyet yanıttaki usageMetadata
   üzerinden hesaplanır — tahmin değil, ölçüm.
   ------------------------------------------------------------------ */
export const MODELLER = [
  { ad: "gemini-3-pro-image",         etiket: "3 Pro",        girdiUsd: 2.00, metinUsd: 12, gorselUsd: 120 },
  { ad: "gemini-3.1-flash-image",     etiket: "3.1 Flash",    girdiUsd: 0.50, metinUsd: 0,  gorselUsd: 60 },
  { ad: "gemini-3.1-flash-lite-image",etiket: "3.1 Flash Lite",girdiUsd: 0.25, metinUsd: 0,  gorselUsd: 30 },
  { ad: "gemini-2.5-flash-image",     etiket: "2.5 Flash",    girdiUsd: 0.30, metinUsd: 0,  gorselUsd: 30 },
];

/** Skor kartı — planın 07. bölümündeki ölçütler. */
export const OLCUTLER = [
  { id: "urun",    ad: "Ürün sadakati",       agirlik: 3, esik: 4, zorunlu: true,  arar: "Taş sayısı, kesim, metal rengi, kazıma, logo, dikiş yeri" },
  { id: "kimlik",  ad: "Kimlik korunumu",     agirlik: 2, esik: 3, zorunlu: false, arar: "Yüzün tanınabilirliği, ten tonunun değişmemesi" },
  { id: "anatomi", ad: "Anatomi ve yerleşim", agirlik: 2, esik: 4, zorunlu: true,  arar: "El ve parmaklar, ürünün doğru noktada durması, ölçek" },
  { id: "isik",    ad: "Işık uyumu",          agirlik: 1, esik: 3, zorunlu: false, arar: "Gölge yönü, renk sıcaklığı, yansımaların tutarlılığı" },
  { id: "sahne",   ad: "Sahne bütünlüğü",     agirlik: 1, esik: 3, zorunlu: false, arar: "Kesim izleri, perspektif, arka planın bozulmaması" },
];
