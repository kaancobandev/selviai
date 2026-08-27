const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/* ------------------------------------------------------------------
   Hizmetler — bir koleksiyonun geliştirilme disiplinleri
   `phase` etiketi, hizmetin süreçteki yerini kodlar.
   ------------------------------------------------------------------ */
export type ServiceIcon =
  | "eye"
  | "collage"
  | "board"
  | "fabric"
  | "flat"
  | "book"
  | "camera"
  | "seal"
  | "tag"
  | "venn";

export type Service = {
  slug: string;
  name: string;
  /** Dikey menüde kullanılan kısa ad */
  short: string;
  phase: "Araştırma" | "Görsel" | "Malzeme" | "Üretim" | "Sunum" | "Marka" | "Analiz";
  summary: string;
  detail: string;
  icon: ServiceIcon;
  image: string;
};

export const services: Service[] = [
  {
    slug: "inspiration",
    name: "Inspiration",
    short: "Inspiration",
    phase: "Araştırma",
    summary: "Koleksiyonun çıkış noktası: referanslar, arşiv ve yön.",
    detail:
      "Sezon hedefleri ve markanın dili doğrultusunda görsel referans arşivi kurar, koleksiyonun ana fikrini tek cümleye indirir ve yönü netleştiririz.",
    icon: "eye",
    image: u("1524504388940-b1c1722653e1"),
  },
  {
    slug: "collage",
    name: "Collage",
    short: "Collage",
    phase: "Görsel",
    summary: "Görsel fikirlerin ilk fiziksel hâli.",
    detail:
      "Referansları kesip yeniden birleştirerek siluet, oran ve atmosfer denemeleri yaparız. Kolaj, koleksiyonun ilk elle tutulur taslağıdır.",
    icon: "collage",
    image: u("1605733513597-a8f8341084e6"),
  },
  {
    slug: "moodboard",
    name: "Moodboard",
    short: "Moodboard",
    phase: "Görsel",
    summary: "Renk, doku ve duygunun tek bir panoda kurulması.",
    detail:
      "Renk paleti, doku, ışık ve karakteri tek bir panoda toplarız. Moodboard, üretimden çekime kadar her kararın başvuru noktasıdır.",
    icon: "board",
    image: u("1586363104862-3a5e2ab60d99"),
  },
  {
    slug: "kumas-secimi",
    name: "Kumaş Seçimi",
    short: "Kumaş",
    phase: "Malzeme",
    summary: "Dokuya, düşüşe ve bütçeye göre kumaş kararları.",
    detail:
      "Tedarikçi havuzumuzdan kumaş kartelaları hazırlar; tuşe, düşüş, gramaj ve maliyeti koleksiyonun ihtiyacına göre dengeleriz.",
    icon: "fabric",
    image: u("1536987333706-fc9adfb10d91"),
  },
  {
    slug: "teknik-cizim",
    name: "Teknik Çizim",
    short: "Teknik Çizim",
    phase: "Üretim",
    summary: "Üretime hazır, ölçülü ve net çizimler.",
    detail:
      "Her parça için ön-arka teknik çizim, dikiş detayları, ölçü tablosu ve malzeme listesi hazırlarız. Atölyeye soru bırakmayan dosyalar.",
    icon: "flat",
    image: u("1604176354204-9268737828e4"),
  },
  {
    slug: "lookbook",
    name: "Lookbook",
    short: "Lookbook",
    phase: "Sunum",
    summary: "Koleksiyonun editoryal sunumu.",
    detail:
      "Kombin kurgusu, sıralama ve sayfa tasarımıyla koleksiyonu alıcıya ve basına anlatan dijital ve basılı lookbook üretiriz.",
    icon: "book",
    image: u("1529139574466-a303027c1d8b"),
  },
  {
    slug: "shooting",
    name: "Shooting",
    short: "Shooting",
    phase: "Sunum",
    summary: "Kampanya ve ürün çekimleri, yönetmenlik dahil.",
    detail:
      "Fotoğrafçı, stilist, model ve mekân seçiminden sanat yönetimine kadar çekimin bütününü planlar ve yönetiriz.",
    icon: "camera",
    image: u("1502920917128-1aa500764cbd"),
  },
  {
    slug: "branding",
    name: "Branding",
    short: "Branding",
    phase: "Marka",
    summary: "İsim, kimlik ve markanın görsel dili.",
    detail:
      "Marka adı, logotype, tipografi ve renk sistemini; ambalajdan sosyal medyaya tutarlı biçimde uygulanacak bir kimlik kılavuzuyla teslim ederiz.",
    icon: "seal",
    image: u("1441986300917-64674bd600d8"),
  },
  {
    slug: "etiket-tasarimi",
    name: "Etiket Tasarımı",
    short: "Etiket",
    phase: "Marka",
    summary: "Dokuma etiket, asma etiket ve bakım etiketleri.",
    detail:
      "Dokuma etiket, asma etiket, beden ve yıkama talimatı etiketlerini tasarlar; üretici teknik şartnamelerine göre baskıya hazırlarız.",
    icon: "tag",
    image: u("1523381210434-271e8be1f52b"),
  },
  {
    slug: "kultur-analizi",
    name: "Alt Kültür / Üst Kültür Bilgisi",
    short: "Kültür Analizi",
    phase: "Analiz",
    summary: "Koleksiyonu bağlama oturtan kültürel analiz.",
    detail:
      "Alt kültür kodları, sanat tarihi ve çağdaş akımlar üzerinden koleksiyonun hikâyesini temellendiririz. Neyi, neden yaptığınızı anlatan metin ve kaynakça.",
    icon: "venn",
    image: u("1521334884684-d80222895322"),
  },
];

/* ------------------------------------------------------------------
   Koleksiyon Marketi
   ------------------------------------------------------------------ */
export const collectionCategories = [
  "Tümü",
  "Hazır Giyim",
  "Couture",
  "Denim",
  "Örme",
  "Aksesuar",
] as const;

export type CollectionCategory = (typeof collectionCategories)[number];

export type Collection = {
  id: string;
  name: string;
  designer: string;
  category: Exclude<CollectionCategory, "Tümü">;
  season: string;
  pieces: number;
  price: number;
  image: string;
};

export const collections: Collection[] = [
  { id: "c01", name: "Sessiz Siluet", designer: "Elif Aydın", category: "Hazır Giyim", season: "SS26", pieces: 12, price: 48000, image: u("1515886657613-9f3515b0c78f", 1200) },
  { id: "c02", name: "Kül ve Keten", designer: "Mert Kaya", category: "Couture", season: "AW26", pieces: 8, price: 125000, image: u("1469334031218-e382a71b716b", 1200) },
  { id: "c03", name: "Birinci Bölüm", designer: "Studio Nar", category: "Hazır Giyim", season: "SS26", pieces: 16, price: 62000, image: u("1496747611176-843222e1e57c", 1200) },
  { id: "c04", name: "Işık Düşmeden", designer: "Zeynep Sel", category: "Örme", season: "AW26", pieces: 10, price: 39000, image: u("1539109136881-3be0616acf4b", 1200) },
  { id: "c05", name: "Gri Not", designer: "Atlas Atelier", category: "Denim", season: "SS26", pieces: 9, price: 27500, image: u("1512436991641-6745cdb1723f", 1200) },
  { id: "c06", name: "Beyaz Defter", designer: "Lale Demir", category: "Hazır Giyim", season: "Resort 26", pieces: 14, price: 54000, image: u("1581044777550-4cfa60707c03", 1200) },
  { id: "c07", name: "İkinci Ten", designer: "Kerem Uz", category: "Couture", season: "AW26", pieces: 6, price: 98000, image: u("1594633312681-425c7b97ccd1", 1200) },
  { id: "c08", name: "Kenar Süsü", designer: "Derya İnce", category: "Aksesuar", season: "SS26", pieces: 20, price: 18000, image: u("1487412720507-e7ab37603c6f", 1200) },
  { id: "c09", name: "Yol Üstü", designer: "Bora Taş", category: "Denim", season: "AW26", pieces: 11, price: 33000, image: u("1483985988355-763728e1935b", 1200) },
  { id: "c10", name: "Askıda Sabah", designer: "Studio Nar", category: "Hazır Giyim", season: "SS26", pieces: 18, price: 71000, image: u("1558769132-cb1aea458c5e", 1200) },
  { id: "c11", name: "Yün ve Sessizlik", designer: "Elif Aydın", category: "Örme", season: "AW26", pieces: 7, price: 42000, image: u("1445205170230-053b83016050", 1200) },
  { id: "c12", name: "Düz Dikiş", designer: "Mert Kaya", category: "Aksesuar", season: "Resort 26", pieces: 15, price: 22000, image: u("1434389677669-e08b4cac3105", 1200) },
];

/* ------------------------------------------------------------------
   Akademi
   ------------------------------------------------------------------ */
export type Lesson = {
  id: string;
  title: string;
  duration: string;
  level: "Başlangıç" | "Orta" | "İleri";
  access: "Ücretsiz" | "Program";
  image: string;
};

export const featuredLesson: Lesson = {
  id: "l00",
  title: "Uygulamaya giriş: ilk koleksiyonunuzu kurun",
  duration: "06:12",
  level: "Başlangıç",
  access: "Ücretsiz",
  image: u("1567401893414-76b7b1e5a7a5", 1800),
};

export const lessons: Lesson[] = [
  { id: "l01", title: "Moodboard oluşturma ve paylaşma", duration: "08:40", level: "Başlangıç", access: "Ücretsiz", image: u("1509631179647-0177331693ae", 1000) },
  { id: "l02", title: "Kumaş kartelası yükleme", duration: "05:21", level: "Başlangıç", access: "Program", image: u("1503342217505-b0a15ec3261c", 1000) },
  { id: "l03", title: "Teknik çizim şablonlarıyla çalışma", duration: "12:05", level: "Orta", access: "Program", image: u("1528459801416-a9e53bbf4e17", 1000) },
  { id: "l04", title: "Koleksiyonu Market'e yükleme", duration: "07:48", level: "Başlangıç", access: "Ücretsiz", image: u("1556905055-8f358a7a47b2", 1000) },
  { id: "l05", title: "Lookbook sayfa düzeni", duration: "10:33", level: "Orta", access: "Program", image: u("1520006403909-838d6b92c22e", 1000) },
  { id: "l06", title: "Etiket dosyasını baskıya hazırlama", duration: "09:17", level: "İleri", access: "Program", image: u("1558618666-fcd25c85cd64", 1000) },
];

export type Plan = {
  id: "tek" | "tam" | "mentor";
  name: string;
  price: number;
  note: string;
  features: string[];
  featured?: boolean;
};

export const plans: Plan[] = [
  {
    id: "tek",
    name: "Tek Ders",
    price: 490,
    note: "Seçtiğiniz bir derse ömür boyu erişim.",
    features: ["1 ders, sınırsız izleme", "Ders dosyaları ve şablonlar", "E-posta desteği"],
  },
  {
    id: "tam",
    name: "Tam Program",
    price: 2900,
    note: "Bütün dersler, yeni eklenenler dahil.",
    features: [
      "Tüm dersler ve gelecek güncellemeler",
      "Şablon ve kaynak kütüphanesi",
      "Topluluk erişimi",
      "Tamamlama sertifikası",
    ],
    featured: true,
  },
  {
    id: "mentor",
    name: "Program + Mentorluk",
    price: 6500,
    note: "Tam program ve 3 birebir görüşme.",
    features: [
      "Tam Program'daki her şey",
      "3 × 45 dk birebir mentorluk",
      "Koleksiyon dosyası incelemesi",
      "Öncelikli destek",
    ],
  },
];
