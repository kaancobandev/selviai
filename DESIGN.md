# Selvi — Tasarım Sistemi ve Sayfa Yerleşimleri

MVP frontend için görsel dil, token'lar ve ekran yerleşimleri. Backend yok; tüm veri
`lib/data.ts` içinde, tüm marka ayarları `lib/site.ts` içinde.

---

## 1. Tasarım dili

**Konsept — "Terzinin masası":** Arayüz, bir atölyenin dilinden ödünç alır. Bölüm
ayraçları **dikiş çizgisi** (kesikli hairline, `.seam`), mikro başlıklar **dokuma etiket**
gibi (10px, %22 harf aralığı, büyük harf, `.eyebrow`), sürükle-bırak alanı kesikli
kenarlı bir **kumaş parçası**. Bu üç motif dışında süs yok.

**İmza öğe:** Hizmetler bölümü — bir derginin içindekiler sayfası gibi, her hizmet
büyük Bodoni ile dizilmiş, solunda 1px çizgi ikon, sağında sürecin hangi fazına ait
olduğunu söyleyen etiket; solda yapışkan, hover ile değişen siyah-beyaz görsel.

**Görsel politikası:** Tüm fotoğraflar monokrom yaşar (`.photo`). Market ve ders
kartlarında hover ile renk döner (`.photo-reveal`) — koleksiyon ancak dokunulunca
"nefes alır".

### Renk (yalnızca beş ton)

| Token     | Hex       | Kullanım                          |
|-----------|-----------|-----------------------------------|
| `ink`     | `#0b0b0b` | Metin, dolu yüzeyler, Akademi bloğu |
| `paper`   | `#ffffff` | Beyaz yüzeyler (Hizmetler, kartlar) |
| `bone`    | `#f4f2ed` | Sayfa zemini (krem)               |
| `mist`    | `#e4e1da` | Hairline, ayraçlar                |
| `ash`     | `#8b8883` | Etiketler, ikincil bilgi          |
| `smoke`   | `#56534e` | Gövde metni ikincil               |

Bölümler zeminle ritim kurar: **bone → paper → bone → ink → bone (footer)**.
Vurgu rengi yoktur; vurgu, tipografi ölçeği ve boşlukla yapılır.

### Tipografi

| Rol      | Yazı tipi     | Not |
|----------|---------------|-----|
| Display  | **Bodoni Moda** (opsz ekseni açık) | Moda dergisinin didone'u. Başlıklar, kart adları, fiyatlar. İtalik tek kelimelik vurgu için. |
| Gövde/UI | **Archivo**   | Nötr grotesk. 15px/7 gövde, 10px tracked etiketler, tabular rakamlar. |

Ölçek: Hero `17vw → 10.5rem`, sayfa başlıkları `text-6xl → 8xl`, bölüm başlıkları
`4xl → 5xl`, kart adları `xl`. Türkçe büyük **İ** Bodoni'de yuvarlak noktalıdır ve
bilinçli olarak başlıkların bir parçası sayılır (hero'da eyebrow ile boşluk buna göre).

### Hareket

- Hero: görsel 16 sn'de `scale(1.08 → 1)`; metinler kademeli yükselir (`.rise`).
- Bölümler: görünüme girince 16px yukarı kayarak belirir (`<Reveal>`).
- Akordeon: `grid-template-rows 0fr → 1fr` ile yumuşak açılış.
- Bağlantılar: çizgi soldan sağa çizilir (`.u-line`).
- `prefers-reduced-motion` tümünü kapatır.

---

## 2. Ekran yerleşimleri

### A) Anasayfa `/`

```
┌──────────────────────────────────────────────────────────────┐
│ Selvi             HİZMETLER  MARKET  AKADEMİ      GİRİŞ SEPET │  ← şeffaf, kaydırınca bone/85 + blur
│                                                              │
│                    [ tam ekran s/b görsel ]                  │
│                                                              │
│ MODA GELİŞTİRME STÜDYOSU                              KAYDIR │
│ İlhamdan                                                  ┊  │  ← dikey dikiş
│ vitrine.                                                     │
│ Moodboard'dan lookbook'a…        HİZMETLER  MARKET  AKADEMİ  │
├──────────────────────────────────────────────────────────────┤
│                         STÜDYO                               │
│        Her koleksiyon bir fikirle başlar. Biz o fikri…       │  ← tek cümle, merkez, bol boşluk
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│  STÜDYO         │ MARKET           │ AKADEMİ                 │  ← üç kapı (ürünün üç alanı)
│  Hizmetler      │ Koleksiyonlar    │ Eğitim                  │
│  ON DİSİPLİN →  │ YÜKLE, SERGİLE → │ DERSLER VE PROGRAM →    │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
├──────────────────────────────────────────────────────────────┤  (beyaz zemin)
│ HİZMETLER                 │ ◎ Inspiration      ARAŞTIRMA  +  │
│ İlk referanstan etikete.  │ ▢ Collage          GÖRSEL     +  │
│ kısa açıklama             │ ▦ Moodboard        GÖRSEL     +  │
│                           │ ≋ Kumaş Seçimi     MALZEME    +  │
│ ┌─────────────┐ (sticky)  │ 👕 Teknik Çizim    ÜRETİM     +  │
│ │ aktif hizmet│           │ 📖 Lookbook        SUNUM      +  │
│ │ s/b görsel  │           │ ◘ Shooting         SUNUM      +  │
│ │ [faz — ad]  │           │ Ⓐ Branding         MARKA      +  │
│ └─────────────┘           │ ◇ Etiket Tasarımı  MARKA      +  │
│                           │ ◯◯ Alt/Üst Kültür  ANALİZ     +  │
│                           │   └ açılınca: açıklama + TEKLİF AL → │
├──────────────────────────────────────────────────────────────┤
│ KOLEKSİYON MARKETİ                            TÜMÜNÜ GÖR →   │
│ Tasarımcıların koleksiyonları.                               │
│ ┌──────┐      ┌──────┐     ┌──────┐                          │
│ │      │      │      │     │      │   ← ortadaki kart 64px aşağıda (editoryal ritim)
│ └──────┘      │      │     └──────┘                          │
│ ad · fiyat    └──────┘     ad · fiyat                        │
│ [SATIN AL]    ad · fiyat   [SATIN AL]                        │
│ ─────────────────────────────────────────────────────────── │
│ Kendi koleksiyonunuzu yükleyin…         [KOLEKSİYON YÜKLE]   │
├──────────────────────────────────────────────────────────────┤  (siyah zemin)
│ AKADEMİ                     ┌────────────────────────────┐   │
│ Uygulamayı ustaca kullanın. │        ( ▶ )               │   │
│ kısa açıklama               │ Uygulamaya giriş…    06:12 │   │
│ [DERSLERİ GÖR] FİYATLANDIRMA└────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│ Selvi (dev)         KEŞFET      STÜDYO      TAKİP            │
│ MODA GELİŞTİRME…    …           …           …                │
│ BÜLTEN ________ ABONE OL   © 2026 · GİZLİLİK · ŞARTLAR       │
└──────────────────────────────────────────────────────────────┘
```

### B) Koleksiyon Marketi `/market`

```
│ KOLEKSİYON MARKETİ                                           │
│ Market                        12 KOLEKSİYON [KOLEKSİYON YÜKLE]│
│──────────────────────────────────────────────────────────────│ ← yapışkan filtre çubuğu
│ TÜMÜ  HAZIR GİYİM  COUTURE  DENİM  ÖRME  AKSESUAR   SIRALA ▾ │
│──────────────────────────────────────────────────────────────│
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐   4 sütun (lg) / 3 (sm) / 2 (xs)│
│ │SS26│ │    │ │    │ │    │   4:5 görsel, s/b, hover'da renk │
│ └────┘ └────┘ └────┘ └────┘                                  │
│ Ad   ₺  Ad   ₺  …                                            │
│ TASARIMCI · N PARÇA                                          │
│ [ SATIN AL ]  → tıklanınca "Sepete eklendi"                  │
```

### B2) Koleksiyon Yükle `/market/yukle`

```
│ ← MARKET                                                     │
│ Koleksiyon yükle.                                            │
│ ┌ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┐        ÖNİZLEME              │
│ ┆  Görselleri buraya bırakın  ┆        ┌──────────┐ (sticky) │
│ ┆  VEYA DOSYA SEÇİN · 12 GÖRSEL┆        │ kapak    │          │
│ └ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┘        │ görseli  │          │
│ [▫][▫][▫] küçük önizlemeler, × ile sil  └──────────┘          │
│ KOLEKSİYON ADI ______________________    Ad        ₺0        │
│ TASARIMCI ________   KATEGORİ ▾ ______    TASARIMCI           │
│ SEZON ▾ __________   PARÇA SAYISI _____                        │
│ FİYAT _____ ₺·KDV    ETİKETLER ________                        │
│ AÇIKLAMA ______________________________                        │
│ TASLAK KAYDET                              [ YAYINLA ]        │
```
Form alanları yalnızca alt çizgiden oluşur; odakta çizgi mürekkebe döner. Önizleme,
yazılanı anında yansıtır. "Yayınla" doğrulama yapar (ad, fiyat, ≥1 görsel) ve
teşekkür ekranına geçer.

### C) Akademi `/akademi`

```
│ AKADEMİ                                                      │
│ Akademi                           Uygulamanın her adımını…   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                   ( ▶ )   öne çıkan ders, 21:9           │ │
│ │ ÜCRETSİZ · BAŞLANGIÇ  Uygulamaya giriş…           06:12  │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Dersler ───────────────────────────────────────── 7 DERS    │
│ ┌────┐ ┌────┐ ┌────┐  3 sütun, 16:10, ÜCRETSİZ/PROGRAM etiketi│
│ FİYATLANDIRMA                                                │
│ Eğitime erişim.                                              │
│ ┌───────────────┬───────────────┬───────────────┐            │
│ │ TEK DERS      │ TAM PROGRAM ● │ + MENTORLUK   │  ortadaki siyah│
│ │ ₺490          │ ₺2.900        │ ₺6.500        │            │
│ │ — özellik     │ — özellik     │ — özellik     │            │
│ │ [KURSU SATIN AL]              │               │            │
│ └───────────────┴───────────────┴───────────────┘            │
```

### C2) Ödeme `/akademi/odeme?plan=tam`

```
│ ← FİYATLANDIRMA                                              │
│ Ödeme                              ┌ SİPARİŞ ÖZETİ  PLANI DEĞİŞTİR ┐
│ ── HESAP ─────────────────────     │ Tam Program                  │
│ E-POSTA ______________________     │ — özellikler                 │
│ ── FATURA BİLGİLERİ ──────────     │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ AD ________   SOYAD ________       │ Ara toplam        ₺2.417     │
│ ÜLKE ▾ ____   ŞEHİR ________       │ KDV (%20)           ₺483     │
│ ── KART BİLGİLERİ ── GÜVENLİ ÖDEME │ TOPLAM            ₺2.900     │
│ KART ÜZERİNDEKİ İSİM ________      └──────────────────────────────┘
│ KART NUMARASI •••• •••• •••• ••••                              │
│ SON KULLANMA AA/YY   CVC •••                                   │
│ ☐ Satış şartlarını … kabul ediyorum.                           │
│ [ ÖDEMEYİ TAMAMLA · ₺2.900 ]  (şartlar işaretlenene dek pasif) │
│ Bu ekran bir arayüz prototipidir; ödeme alınmaz.               │
```

### D) Hizmetler çalışma alanı `/hizmetler/*`

Footer gizlenir; header her zaman zeminli. Solda yapışkan dikey menü, sağda içerik.

```
┌ header ──────────────────────────────────────────────────────┐
├──────────┬───────────────────────────────────────────────────┤
│ HİZMETLER│ INSPIRATION · TASLAK                      5 ÖĞE   │
│          │ İlham panosu                                      │
│ — Inspir.│        ┌──────┐ ┌─────┐                           │
│ Collage  │        │ foto │ │foto │      ┌ NOT ───────┐       │
│ Moodboard│        │  ┌───┴─┴──┐  │      │ Sessizlik… │       │
│ Kumaş    │        └──┤  foto  ├──┘      └────────────┘       │
│ Teknik Ç.│           └────────┘                              │
│ Lookbook │   · · · · noktalı ızgara · · ·    ┌ PALET 01 ┐   │
│ Shooting │                                    │ ■ ■ ■    │   │
│ Branding │                                    └──────────┘   │
│ Etiket   │                                                   │
│ Kültür A.│ SÜRÜKLEYİN · ÇİFT TIKLA · DEL     [▣ T ▭▭▭ | TEMİZLE] │
│ ─────────│                                   ↑ cam efektli araç çubuğu │
│ Teklif al│                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

- **Dikey menü** (`components/services-nav.tsx`): aktif satır 1px yatay çizgi + 28px içe
  kayma + orta ağırlık; hover 8px kayma ve renk koyulaşması (500ms). Mobilde header
  altına yapışan yatay şerit.
- **Tuval** (`components/inspiration-board.tsx`): beyaz zemin, 24px aralıklı %11 mürekkep
  noktalı ızgara (`.dot-grid`). Öğeler yüzde konumlu, `--s` ile küçük ekranda ölçeklenir,
  `--xs`/`--oy` ile yatay sıkışır ve başlık altına iner.
  - Sürükleme (pointer capture), tıklayınca seçim + öne getirme, **1px seçim çerçevesi +
    4 köşe tutamacı**, seçili fotoğraf renge döner.
  - Çift tık: notu yerinde düzenle (Enter kaydeder). Delete/Backspace siler, ok tuşları
    iter (Shift ile 4×), Esc seçimi bırakır.
  - Araç çubuğu: *Görsel yükle* (dosya seçici), *Not ekle*, *Palet ekle*, *Temizle*.
    Masaüstünden dosya sürükleyip bırakınca kesikli çerçeve belirir, görseller bırakılan
    noktaya iner.
  - Boş durum: "İlhamınızı oluşturmaya başlayın. Sürükleyin veya yükleyin." +
    "Örnek panoyu geri getir".
- **Diğer hizmetler** (`app/hizmetler/[slug]/page.tsx`): solda faz etiketi, büyük serif ad,
  özet ve açıklama, "Teklif al", önceki/sonraki hizmet; sağda tam yükseklik s/b görsel.
  Çalışma alanı hazırlanıyor notu dürüstçe belirtilir.

### E) Kumaş — dijital kartela ve ölçüm laboratuvarı `/hizmetler/kumas-secimi`

Aynı dikey menü; içerik alanı üstte kütüphane, altta asimetrik iki sütun (7/5).

```
│ KUMAŞ · DİJİTAL KARTELA                 9 KUMAŞ · KARTELA (1)  ← → │
│ Kumaş kütüphanesi                                                  │
│ ┌────┐ ┏━━━━┓ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  (yatay kaydırma)│
│ │ipek│ ┃keten┃ │gab.│ │denim│ │popl│ │flan│ │pied│                 │
│ └────┘ ┗━━━━┛ └────┘ └────┘ └────┘ └────┘ └────┘                  │
│ İpek Krep  Organik Keten  Gabardin …   ad + içerik (eyebrow)      │
│ ─────────────────────────────────────────────────────────────────  │
│   0  1  2  3  4  5  6  7  8  9  (cm cetveli)   │ ÖLÇÜM LABORATUVARI │
│ 0 ┌──────────────────────────────────────┐     │ Organik Keten      │
│ 1 │ 1:1 · 10 × 7,5 cm                    │     │ %100 Organik Keten │
│ 2 │                                      │     │ ── METRAJ   ₺620/m │
│ 3 │        makro doku (tıkla: 2,4×)      │     │ EN 140 cm  UZ. [3] │
│ 4 │                                      │     │ 4,2 m² · 672 g · ₺ │
│ 5 │                                      │     │ ── FİZİKSEL ÖZELLİK│
│ 6 │                                   🔍 │     │ AĞIRLIK ──●──────  │
│ 7 └──────────────────────────────────────┘     │ ESNEKLİK ●───────  │
│   MAKRO DOKU · DÜZ DOKUMA · HAM   DESEN TEKRARI│ DÖKÜM ───────●──   │
│                                                │ [KARTELAYA EKLE] NUMUNE│
```

- **Kütüphane** (`components/fabric-lab.tsx`): 9 gerçek makro doku (ipek, keten, gabardin,
  denim, poplin, flanel, pied-de-poule, saten, kaşmir triko); kare görsel, altında ad
  (13px) ve içerik (eyebrow). Aktif kart: 3px dışarıda 1px mürekkep çerçeve + ad kalın.
  Kartelaya eklenen kartın köşesinde 6px kare işaret. Bu sayfada fotoğraflar **renkli**
  — arayüz monokrom, malzeme kendi rengiyle konuşur.
- **Makro alan**: 4:3 görsel = 10 × 7,5 cm (1:1). Üstte ve solda santimetre cetveli
  (tam cm uzun, yarım cm kısa çentik, 9px rakamlar). Tıklayınca 2,4× yakınlaşır;
  imleç konumu büyütme merkezidir; sağ altta büyüteç ikonu (+/−). Altta dokuma türü,
  renk ve desen tekrarı.
- **Ölçüm paneli**: alt çizgili alanlar — *En* (kumaşa bağlı, salt okunur) ve *İstenen
  uzunluk* (metre). Canlı hesap: alan (m²), toplam ağırlık (g/kg = alan × g/m²),
  tahmini tutar (₺/m × metre). Üç sürgü — Ağırlık (40–600 g/m²), Esneklik (%0–40),
  Döküm (Sert/Orta/Akışkan) — 1px iz, dolu kısım mürekkep, 14px yuvarlak tutamaç;
  kumaş değiştirince kumaşın değerlerine döner; "Kumaşın değerlerine dön" bağlantısı.
  Kartelaya ekle/çıkar (sayaç başlıkta) ve Numune iste.

### F) Branding — marka sistemi stüdyosu `/hizmetler/branding`

Referans mimari: Brandpad / Standards.site tarzı numaralı bölümler; solda yapışkan bölüm
başlığı + kontroller (4/12), sağda "eser gibi" önizleme (8/12). Zemin bembeyaz; ayraçlar 1px.

```
│ BRANDING · MARKA KİMLİĞİ STÜDYOSU        TASLAK · KAYDEDİLDİ  [KILAVUZU DIŞA AKTAR] │
│ Marka sistemi                                                                      │
│ MARKA ADI ______ Nar          MANİFESTO ______ Sessizliğin de bir kesimi vardır.   │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ 01                       │ ┌ x ────┐  ┌ x ────┐  ┏ x ━━━━┓                          │
│ Logo ve monogram         │ │x  NAR │  │x  (N) │  ┃x  NAR ┃ ← kılavuz + koruma alanı│
│ açıklama                 │ └───────┘  └───────┘  ┗━━━━━━━┛                          │
│ [LOGO YÜKLE] · MONOGRAM  │ Ana logo    Monogram    Negatif                          │
│ BİÇİM: Daire Kare Serbest│                                                           │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ 02                       │ Aa (dev)  Aa Bb Cc … 0123456789                          │
│ Tipografi hiyerarşisi    │ Manifesto (italik)  · teknik etiket                      │
│ DISPLAY: Bodoni/Cormorant│ Aa (grotesk) alfabe + paragraf · teknik etiket          │
│ /Cinzel  GÖVDE: Archivo/ │ ÖLÇEK: Display 96 · Başlık 32 · Alt başlık 22 · Gövde 15│
│ Karla/Hanken             │        · Etiket 10                                       │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ 03                       │ ┌ %60 ┐ ┌ %30 ┐ ┌ %10 ┐  ad · kullanım · HEX RGB Pantone│
│ Renk paleti              │ └─────┘ └─────┘ └─────┘                                  │
│ HAZIR PALETLER (4)       │ ████████████████████░░░░░░░░░▒▒▒  %60 Ana %30 İkincil %10│
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ 04                       │ [çanta] [fular] [kutu]  — canlı SVG mockup               │
│ Canlı uygulama · özet    │                                                           │
```

- **Durum tek yerde** (`components/brand-studio.tsx`): ad, manifesto, yüklenen logo,
  monogram (addan otomatik, düzenlenebilir) ve biçimi, display/gövde yazı tipi, palet.
  Tüm bölümler ve mockup'lar bu durumdan türer; CSS değişkenleri `--b-display`, `--b-body`.
- **01 Logo**: üç teknik karo (`GuideTile`): %18 içeride koruma alanı çerçevesi, kenarlara
  uzanan inşa çizgileri, italik "x" işaretleri; logotype büyük harf + %18 harf aralığı ya da
  yüklenen görsel (negatifte `invert`). Monogram daire/kare/serbest.
- **02 Tipografi**: 3 serif (Bodoni Moda, Cormorant Garamond, Cinzel) × 3 grotesk (Archivo,
  Karla, Hanken Grotesk); seçenekler kendi yazı tipinde listelenir. Dev "Aa", alfabe,
  rakamlar, manifesto italik; gövde örneği; beş satırlık ölçek tablosu (punto/satır).
  Ek yazı tipleri yalnızca bu sayfada yüklenir (`lib/brand-fonts.ts`).
- **03 Renk**: 4 preset (Kâğıt & Mürekkep, Kum & Antrasit, Kül & Adaçayı, Fildişi & Gece);
  blok'a tıklayınca yerel renk seçici, HEX alanı elle düzenlenir (3/6 hane normalize);
  RGB hesaplanır, Pantone yakın eşleşme — özel renkte "Özel · eşleşme yok". 6px dağılım
  çubuğu 60/30/10. Metin rengi parlaklığa göre (kemik/mürekkep).
- **04 Uygulama**: düz SVG mockup'lar (`components/brand-mockups.tsx`) — çanta (ana renk,
  logotype, vurgu asma etiket), fular (ikincil, monogram, vurgu kesikli kenar dikişi), kutu
  (ana, logotype kapakta, vurgu şerit, monogram). "Kılavuzu dışa aktar" prototip toast.

### G) Etiket — etiket stüdyosu `/hizmetler/etiket-tasarimi`

Üçüncü tezgâh tipi: üstte üç etiket türü sekmesi, solda **cetvelli 1:1 sahne** (7/12), sağda
**şartname paneli** (5/12); altta set özeti ve üretim şartnamesi. Tüm ölçüler milimetre
(`--mm` = px/mm; 4 / 3,4 / 2,2 px).

```
│ ETİKET · ETİKET STÜDYOSU                   3 ETİKET · ŞARTNAMEDE 1   ŞARTNAME ↓ │
│ Etiket seti                                                                      │
│ Dokuma etiket ━━━━  Asma etiket ────  Bakım etiketi ────   ← sekmeler (alt çizgi)│
│  0  1  2  3 … 13 (cm)             │ ŞARTNAME                                     │
│ 0┌──────────┐                     │ Dokuma etiket · 60 × 20 mm · Damask · Orta   │
│ 1│   NAR    │ ← dikiş/katlama     │ ── İÇERİK  Marka Ürün Beden Fiyat İçerik Menşei│
│ 2│İSTANBUL·M│    kesikli          │ ── YAPI  Boyut · Dokuma · Katlama · Zemin/İplik│
│  └──────────┘                     │ ── ADET  [500]  Tahmini birim ₺3,30  Toplam    │
│  1:1 · 60 × 20 mm   DAMASK · ORTA │ [ŞARTNAMEYE EKLE]  NUMUNE İSTE →             │
│ ──────────────────────────────────────────────────────────────────────────────── │
│ ŞARTNAME · Etiket seti                      Şartname toplamı ₺… [DIŞA AKTAR]     │
│ ┌ Dokuma ──────┐ ┌ Asma ─────────┐ ┌ Bakım ─────────┐  mini önizleme 1,6 px/mm   │
│ │ boyut/dokuma │ │ kâğıt/ip/baskı│ │ malzeme/yıkama │  spec satırları + tutar     │
```

- **Üç tür** (`lib/labels.ts`, `components/label-previews.tsx`):
  *Dokuma* — 50×15 / 60×20 / 70×25 mm, damask/tafta/saten (CSS dokuma dokusu), düz kesim /
  orta katlama / uç katlama (kesikli dikiş payı ve katlama hattı), zemin + iplik rengi
  (aynı renk seçilirse iplik otomatik kontrast), menşei satırı.
  *Asma* — 50×90 / 60×100 / 70×120, kraft/fildişi/siyah karton, köşeli/yuvarlatılmış, pamuk ip /
  saten kurdele / vakslı ip, tek renk / gofre / sıcak yaldız; delik + ip SVG, monogram, logotype,
  ürün adı italik, beden · fiyat.
  *Bakım* — 30×60 / 35×80 / 40×100, saten / pamuk bant / rPES, 30°/40° yıkama, dört sembol
  (`components/care-symbols.tsx`: ağartıcı yok, düşük ütü, kurutma yok, P), TR / TR+EN.
- **Fiyat tahmini**: tür + malzeme + boyut + işlem bazlı ₺/adet; 1.000+ %15, 2.500+ %28 kademe.
  Şartnameye eklenen türler toplamı oluşturur; "Şartnameyi dışa aktar" prototip toast.
- **Sahne** yüksekliği türe göre (7 / 14 / 12 cm), etiket sol üst köşede (cetvel boyutu okur).

### H) Shooting — çekim listesi `/hizmetler/shooting`

**PRODÜKSİYON MASASI TAMAMEN KALKTI.** Ekip, lokasyon, call sheet, gün ışığı şeridi ve prop
listesi bir önceki turda silinmişti; gerekçe ürünün kendisiydi: Selvi tam da o insanlara ve o
efora ihtiyaç kalmasın diye var. Bu turda geriye kalan da gitti — mood seçici + tearsheet
ızgarası + look–model tahtası birlikte bir iş yapmıyordu: ilk ikisi `moodboard-studio.tsx` ile
belirgin biçimde örtüşüyordu, üçüncüsü ise akışın artık üretmediği bir şeyi (look listesi)
örnek verilerle taklit ediyordu.

Yerine konan şey aracı ürünün kendi önermesine bağlıyor: **çekim organize edilmiyor,
üretiliyor.** Her satır, kullanıcının tasarladığı giysiden ÜRETİLECEK bir kare.

```
│ SHOOTING · ÇEKİM LİSTESİ                                                      3/6 çekim     │
│ <brief> — çekim listesi            ← tohum yoksa "SS26 Kampanya"                            │
│ ── Kaynak kare ─────────────────────────────────────────────────────── Siluet ───────────── │
│ ▣ Doğa ▣ Sanat ▣ Doku ▣ Mekân ▣ Moodboard ▣ Kumaş ▣ Marka ▣ Siluet·giysi   ← tek seçim      │
│ Kare oranı [4:5 ▾]     Not [bütün satırlara ekleniyor…]                                     │
│ ── Çekimler ──────────────────────────────────────────────────── 3/6 satır ──────────────── │
│ 01 ▣  Kadraj [Tam boy  ▾]  Işık [Kaynağın ışığı ▾]  Değişmez              ↑ ↓ ×             │
│ 02 ▣  Kadraj [Yarım boy▾]  Işık [Stüdyo        ▾]  5600 K                 ↑ ↓ ×             │
│ 03 ▣  Kadraj [Detay    ▾]  Işık [Altın saat    ▾]  3400 K                 ↑ ↓ ×             │
│ + Çekim ekle                                                                                │
│ [3 KARE ÜRET]   Her satır bir üretim demek.        ← sol sütun: dönen karenin küçük hâli    │
```

- **Tek uç, tek iş**: `POST /api/cekim` → `/api/jobs/:id` yoklaması (kolaj kesimiyle aynı
  döngü: iptal bayrağı, 4 dk tavan). Listenin tamamı tek işte üretiliyor; oturumda tek iş
  kilidi var, satır başına iş açmak ikinciden sonrasını 429'a düşürürdü.
- **Kaynak kare listeye ait, satıra değil**: uç tek referans alıyor (`kaynak: {isId, sira}`),
  istemci depo yolu göndermiyor — sahipliği sunucu doğruluyor (kesim ucundaki aynı desen).
  Varsayılan **siluet**: türetilen dört çıktı içinde giysiyi gösteren tek kare.
- **Yükleme yok**: `/api/compose` üç görsel şart koşuyor ve tohumda kişi fotoğrafı yok; satır
  başına dosya istemek zaten kaldırılmak istenen eforun ta kendisi. Türetme ve kesimdeki
  yerleşik desen kullanılıyor: tek referans + metin.
- **Sözlük motorun sözlüğü** (`lib/shoot.ts`): kadrajlar `CROPS`, ışıklar `LIGHTINGS`; ikinci
  bir kimlik seti tutulmuyor. Eski mood'lardan stüdyo / altın saat / gece metinleri ve
  kelvinleri korundu; "Gündüz · Doğal ışık" `LIGHTINGS` içinde karşılıksız kaldığı için
  `sahne` kendi metnini aldı ("kaynağın ışığı korunur"). Saat aralığı (`window`) silindi:
  lokasyonda çekim yapan bir ekibin bilgisiydi.
- **Sonuç satıra `eksen` ADIYLA düşüyor** ("cekim-3" → 3. satır), dizi sırasıyla değil: bir
  kare üretilemezse sonrakiler bir satır kaymasın. `url ?? dataUrl` okunuyor — depoya
  yüklenemeyen kare de üretilmiş ve parası ödenmiştir (bu yedeği okumamak kolajda gerçek bir
  hataydı). Gelmeyen satır "Gelmedi" yazıyor, sessizce boş kalmıyor.
- **Maliyet dürüst**: düğme kaç kare üretileceğini yazıyor ("3 kare üret"), tavan altı satır
  (`CEKIM_EKSENLERI`). Açılış listesi üç satır — boş liste "ne yapacağım?" doğuruyor, altı
  satır ise sormadan altı üretim demek olurdu.
- **Tohumsuz açılış**: araç yine render ediliyor, önce bir tasarım gerektiğini kendisi söylüyor
  ve ana sayfaya yolluyor; liste şimdiden kurulabiliyor, yalnız üretim düğmesi kapalı.

### I) Teknik Çizim — dijital kalıp ve çizim tuvali `/hizmetler/teknik-cizim`

Tarayıcıda çalışan vektörel çizim tezgâhı (SVG). Tuval birimi: 4 birim = 1 cm; croquis ~170 cm.

```
│ [▸ ✎ ▭ ✂ ✋ | ⌇ Üst dikiş ▾ | ⌒ | ↶ 🗑]          TEKNİK ÇİZİM · KETEN BLUZ  TASLAK · 10:52 │
│ ┊ ┊ ┊ blueprint ızgara (8 / 40 birim) ┊ ┊ ┊      ┌ KUMAŞ VE KATMANLAR ─────────── › ┐   │
│            ◯   croquis (ince, %38)                │ SEÇİM  Ön beden · 36,0 × 76,0 cm  │   │
│         ┌──┬──┐  ← parça: kumaş dolgu + dikiş     │        11 nokta · Üst dikiş · Keten│   │
│         │  │  │  ├ 36,0 cm ┤ mezura                │ KUMAŞ  ◉ ◉ ◉ ◉ (yuvarlak, sürükle) │   │
│         └──┴──┘  ▣ seçim: 1px mat mavi + çapalar   │ KATMANLAR · ÖN  ▪ Kol  ▪ Ön beden  │   │
│            ╱╲                                      │ SVG İNDİR                         │   │
│ [ÖN · ARKA · DETAY]   x 12,4 · y 38,0 cm · ipucu   └──────────────────────────────────┘   │
│                                                              [ − 95% + | SIĞDIR ]         │
```

- **Tuval** (`components/flat-sketch.tsx`, geometri `lib/geometry.ts`, croquis
  `components/croquis.tsx`): sonsuz zemin, tekerlekle imleç etrafında yakınlaştırma, El aracı /
  boşluk tuşu ile kaydırma, "Sığdır"; görünüm başına (Ön / Arka / Detay) ayrı parça ve ölçü listesi.
- **Araçlar** (cam araç çubuğu): Seç (V) — tıkla/sürükle taşı, çapaları çek; Kalem (P) — tıkla nokta,
  ilk noktaya dön kapat, Enter/çift tık bitir, Eğri anahtarı Catmull-Rom yumuşatma; Mezura (M) — iki
  nokta arası cm etiketi; Makas (C) — çizgiyle kapalı parçayı ikiye böler (Sutherland–Hodgman);
  Dikiş tipi — Düz / Üst dikiş (paralel kesikli) / Zigzag / Sürfile (dik çentikler); Geri al (Ctrl+Z),
  Sil (Delete), Esc iptal.
- **Kumaş paneli**: Kumaş sayfasındaki 9 doku yuvarlak örnek; seçili parçaya tıklayarak ya da
  tuvaldeki parçanın üstüne sürükleyip bırakarak SVG `<pattern>` dolgusu. Katman listesi: seç,
  gizle/göster, yeniden adlandır. SVG indir.
- **Stil**: bembeyaz tuval, #1a1a1a 1px konturlar (`vector-effect: non-scaling-stroke`), seçim
  için yalnızca mat mavi-gri (#6B7C93) 1px; gölge yok, cam efektli yüzen paneller.

### Diğer
- `/giris` — tek sütun, e-posta + şifre, "Giriş yap".
- `not-found` — "Sayfa bulunamadı." + iki bağlantı.
- Mobil menü — tam ekran krem katman, büyük serif bağlantılar, kademeli giriş.

---

## 3. Bileşen haritası

```
components/
  site-header.tsx     sabit üst bar; anasayfada hero üstünde açık renk, kaydırınca krem
  site-footer.tsx     büyük wordmark, üç sütun, bülten
  hero.tsx            tam ekran görsel/video + slogan (site.hero ile değişir)
  services.tsx        hizmet akordeonu + yapışkan görsel
  service-icons.tsx   10 adet 1px çizgi ikon
  collection-card.tsx market kartı (önizleme modunda da kullanılır)
  market-grid.tsx     filtre + sıralama + grid (istemci)
  upload-form.tsx     sürükle-bırak + form + canlı önizleme (istemci)
  checkout-form.tsx   ödeme formu + sipariş özeti (istemci)
  services-nav.tsx    /hizmetler dikey menüsü (masaüstü) + yatay şerit (mobil)
  inspiration-board.tsx  interaktif ilham tuvali: sürükle, seç, düzenle, yükle, boş durum
  fabric-lab.tsx      kumaş kütüphanesi + cetvelli makro doku + metraj/sürgü paneli
  brand-studio.tsx    marka sistemi: logo/monogram, tipografi, renk, canlı mockup
  brand-mockups.tsx   çanta / fular / kutu SVG mockup'ları
  label-studio.tsx    etiket tezgâhı: sekmeler, 1:1 sahne, şartname paneli, set özeti
  label-previews.tsx  dokuma / asma / bakım etiketi önizlemeleri (mm tabanlı)
  care-symbols.tsx    bakım sembolleri (1px SVG)
  shoot-desk.tsx      çekim listesi: kaynak kare, satır başına kadraj/ışık, tek işte üretim
  flat-sketch.tsx     teknik çizim tezgâhı: SVG tuval, araçlar, dikiş tipleri, kumaş dolgusu, katmanlar, görünümler
  croquis.tsx         9 baş oranlı ince çizgi manken silueti (ön/arka)
  ui/ruler.tsx        santimetre cetveli (Kumaş ve Etiket sayfalarında ortak)
  footer-gate.tsx     /hizmetler rotalarında footer'ı gizler
  ui/button.tsx       solid / ghost / light / link
  ui/field.tsx        alt çizgili Input / Select / Textarea / Checkbox
  ui/reveal.tsx       görünüme girince beliren sarmalayıcı
  ui/toast.tsx        tek satır geri bildirim
lib/
  site.ts             marka adı, nav, hero medyası
  data.ts             hizmetler, koleksiyonlar, dersler, planlar
  fabrics.ts          kumaş kütüphanesi: içerik, g/m², esneklik, döküm, en, ₺/m, desen tekrarı
  brand.ts            yazı tipi seçenekleri, renk presetleri, hex/parlaklık yardımcıları
  brand-fonts.ts      branding sayfasına özel ek Google fontları (Cormorant, Cinzel, Karla, Hanken)
  labels.ts           etiket türleri, seçenekler, varsayılanlar, tahmini fiyat
  shoot.ts            çekim listesi verisi: kadraj/ışık metinleri, satır varsayılanları, kaynak kare
  geometry.ts         2B geometri: Catmull-Rom, örnekleme, zigzag/sürfile, nokta-çokgen, çokgen bölme
  utils.ts            cn(), formatTRY()
```

## 4. Backend'e bağlarken

- `collections`, `lessons`, `plans` dizileri bir API/DB çağrısıyla değiştirilir; bileşen
  arayüzleri (`Collection`, `Lesson`, `Plan` tipleri) aynı kalır.
- `UploadForm.publish()` → çok parçalı form gönderimi; `files[]` zaten `File`
  nesnelerinden türetilir.
- `CheckoutForm` → ödeme sağlayıcısının (iyzico / Stripe) kendi bileşeni ile kart
  alanları değiştirilir; kalan düzen korunur.
- `BuyButton` → sepet durumu için global store (örn. Zustand) ve header'daki sayaç.
