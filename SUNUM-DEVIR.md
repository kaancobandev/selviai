# Selvi — Sunum Hazırlama Devir Belgesi

**Hazırlandı:** 31 Ağustos 2026 · **Kaynak:** kod tabanı taraması (8 ajan), yayınlanmış
dört artifact'in tam metni, canlı DNS/HTTP doğrulaması, git geçmişi.

Bu belge, bu proje için **yeni bir sunum hazırlayacak oturum** içindir. Amacı, sunumu
hazırlayanın hiçbir şeyi yeniden keşfetmek zorunda kalmaması ve **kanıtlanmamış bir cümle
kurmaması**. Her sayının yanında kaynağı var.

**Önce şu iki bölümü oku:** [Yasaklı iddialar](#0-yasakli-iddialar--sunuma-girmemesi-gerekenler)
ve [Gerçek vs vitrin](#2-urun--ne-gercekten-calisiyor-ne-vitrin). Sunumun güvenilirliği
bu ikisinde duruyor.

---

## 0. YASAKLI İDDİALAR — sunuma girmemesi gerekenler

### 0.1 Bir kez denetlendi ve kasten elendi — geri ekleme

| İddia | Neden elendi |
|---|---|
| "Markalar cirosunun %5–8'ini görsele harcıyor (McKinsey)" | Kaynaksız, uydurma atıf |
| Küresel "AI görsel üretim pazarı" büyüklüğü | 2025 tahminleri kaynaklar arasında **7 kat** çelişiyor |
| Photoroom / Claid / ZMO fiyatları | Resmî fiyat sayfaları okunamadı, üçüncü taraf rakamları çelişkili |
| iyzico komisyon oranı | Kaynaklar arası çelişkili — sayı verme |
| Trendyol satıcı sayısı | Yalnız basın bülteni. Kullanılacaksa "şirket beyanı" etiketiyle |
| Botika'nın kredi adetleri | Tutmuyor; yalnız aylık ücreti ve kendi hız beyanı kullanıldı |

Hepsi bir denetimden geçip çıkarıldı. Geri eklemek sunumun güvenilirliğini bozar.

### 0.2 Kod taramasının ortaya çıkardığı YENİ yasaklar

Bunlar mevcut sunumda yok ama yeni bir sunumda kolayca yazılabilecek yanlışlar:

**❌ "4 günde geliştirildi."** Git geçmişi 27–30 Ağustos gösteriyor ama bu bir yanılsama:
çalışma ağacındaki dosya tarihleri **22 Ağustos**'a kadar gidiyor (`app/globals.css`
22 Ağu 23:37, `components/hero.tsx` 22 Ağu 13:54, `lib/data.ts` 22 Ağu 22:34) ve
23 Ağustos tarihli bir `out/` klasörü duruyor. MVP arayüz 22–27 Ağustos arası git dışında
yazılmış, 27 Ağustos'ta tek commit'te içeri alınmış.
**Doğru cümle:** "Kompozisyon motoru 27–30 Ağustos arası dört günde üretime taşındı."

**❌ "Biz künye/filigran ekliyoruz."** C2PA manifestosunu **Google** imzalıyor, Selvi'nin
kodunda tek satır metadata yazımı yok. **Doğru cümle:** "Google'ın imzaladığı C2PA içerik
kimliği kareyle birlikte geliyor, biz onu bozmadan teslim ediyoruz."
Ayrıca: galeride gösterilen küçültülmüş sürümü Next görsel iyileştiricisi yeniden
kodluyor ve manifestoyu **siliyor**; yalnız "Görseli indir" ham baytlara gittiği için
indirilen dosyada künye korunuyor.

**❌ "Her kare kalite kontrolünden geçer."** Hakem çökerse üretim engellenmeden devam
eder ve kare denetlenmeden kullanıcıya gider (`kabul = null`). Ayrıca
`COMPOSE_QUALITY_GATE=0` ile **veya** `COMPOSE_ESIK_URUN=0` ile tamamen kapatılabilir.
Kapı zorunlu bağımlılık değil, isteğe bağlı bir iyileştirmedir.

**❌ "%88 / %100 kabul oranı üretim kapısının sonucudur."** Bu oranlar **ölçüm eşiğiyle**
(ürün ≥ 4 **ve anatomi ≥ 4**) hesaplandı. Üretimdeki kapı **anatomi ≥ 3** ile çalışıyor —
daha gevşek. Slaytta bu not şart.

**❌ "Hesap sistemi var" / "kullanıcıları ölçüyoruz."** Kimlik doğrulama yok
(`/giris` boş kabuk, submit'te sadece toast). Telemetri sıfır — analytics, hata izleme,
olay takibi hiç yok (GA, Plausible, PostHog, Sentry, Mixpanel, Segment: 0 eşleşme).

**❌ "Ödeme alıyoruz."** Hiçbir yerde ödeme alınmıyor. Akademi ödeme ekranı tam bir kart
formu gösterir ama submit hiçbir ağ isteği yapmaz — ekranın kendi disclaimer'ı bunu yazıyor.

**❌ "Supabase SDK kullanıyoruz."** `@supabase/ssr` ve `@supabase/supabase-js` kurulu ama
**kodda hiç kullanılmıyor** (grep: tek eşleşme bir yorum satırı). Erişim ham fetch/REST ile.

**❌ "Migration altyapımız var."** Şema tek bir elle SQL Editor'e yapıştırılan dosya.
`supabase/` altında ne `config.toml` ne `migrations/` var.

**⚠️ Ölçüm toplam gideri — iki farklı sayı dolaşıyor.** Yayınlanmış Model Kilidi raporu
**4,43 $** diyor; depodaki `scripts/olcum/cikti/rapor.json` satırlarının toplamı
**2,157 $** (doğruladım). Muhtemel açıklama: 4,43 $ prompt düzeltmesi **öncesi ve sonrası
iki koşunun** toplamı, rapor.json ise yalnız son koşu. Sunumda kullanılacaksa hangisinin
kastedildiği netleştirilmeli. Güvenli cümle: **"Tüm model karşılaştırması iki dolara mal
oldu"** — bu son koşu için birebir doğru ve en ikna edici hali.

---

## 1. Bir bakışta

| | |
|---|---|
| **Ürün** | Selvi — üç fotoğraftan (kişi + ürün + sahne) tek editoryal moda karesi üreten AI stüdyosu |
| **Canlı** | https://selviai.com — doğrulandı (HTTP 200, ~1,3 sn), `www` → 301 |
| **Netlify sitesi** | `selviaiatolye.netlify.app` · IP 63.176.8.218 / 35.157.26.135 (AWS Frankfurt) |
| **Depo** | `kaancobandev/selviai` · üretim dalı `release`, geliştirme `main` |
| **Marka adı** | **Selvi** (kesin). "Atölye" yalnız `.claude/launch.json` dev adı ve README örnek commit'inde kalıntı |
| **Ekip** | Kaan Çoban (teknik), Hayat Yaylakcıoğlu (pazarlama) — kurucu ortaklar |
| **Aşama** | Ürün canlı, **gelir öncesi**. Faz 0–3 bitti, Faz 4 (hesap/kredi/moderasyon) başlamadı |
| **Talep** | $250.000 tohum, 18 ay pist |
| **Yığın** | Next.js 16.3.2 · React 19.2.8 · Tailwind v4 · TypeScript 5 · Netlify (OpenNext) · Supabase (Frankfurt) · Gemini |
| **Yerel dev** | `npm run dev`, port **3311** (README'deki 3000 yanlış) |

**Depo boyutu:** 29 commit, 22.164 ekleme / 721 silme, 107 izlenen dosya,
12.649 satır kod, 33 bileşen, 16 sayfa rotası, `lib/ai` altında 11 modül.
İlk commit tek başına 85 dosya / 17.957 satır (hacmin %81'i).

---

## 2. ÜRÜN — ne gerçekten çalışıyor, ne vitrin

Sunumun kurması gereken ayrım **"çalışıyor / çalışmıyor" değil**, üç katmanlı:

### 🟢 Katman 1 — Canlı AI üretimi + kalıcı depolama (1 ekran)

`/hizmetler/kompozisyon` — ürünün tek gerçek üretim yapan parçası. Gemini ile üretir,
ikinci modelle puanlatır, gerekirse yükseltir, Supabase'e kalıcı yazar.
`/hizmetler/kompozisyon/galeri` — anonim oturum çereziyle kapsamlanmış, gerçek silme yapar
(hem depo dosyası hem tablo satırı gider).

### 🟡 Katman 2 — Gerçek etkileşimli ama oturum ömürlü tasarım tezgâhları (**6 ekran**)

Bunlar boş vitrin **değil** — çalışan editörler. Ama hiçbiri sunucuya yazmıyor,
hiçbiri kalıcı değil (depo genelinde tek bir `localStorage` kullanımı bile yok).

| Ekran | Ne yapıyor | Çıktı |
|---|---|---|
| **Teknik çizim** (`flat-sketch`) | 920 satırlık gerçek vektör editörü: 5 araç, 4 dikiş tipi, geri alma, Catmull-Rom eğri, makasla parça bölme (Sutherland–Hodgman) | **SVG indirir** — tek gerçek dosya üreten araç |
| **Etiket stüdyosu** | 3 etiket türü, 1:1 cetvelli mm ölçekli sahne, adet kademesine göre gerçek fiyat hesabı | ❌ "PDF" düğmesi sadece toast |
| **Marka stüdyosu** | Canlı logo/tipografi/renk, WCAG parlaklıkla otomatik metin rengi, 3 canlı SVG mockup | ❌ "Kılavuz" düğmesi sadece toast |
| **Kumaş laboratuvarı** | 9 kumaş, cetvelli makro doku, metraj/gram/maliyet hesabı | Yok |
| **İlham panosu** | Sürükle-bırak tuval, görsel/not/palet | Yok |
| **Shooting masası** | 6 rol, 4 ışık senaryosu, 8 look, 15 dilimlik call sheet | ❌ "Gönder"/"PDF" sahte |

Diğer **4 hizmet** (collage, moodboard, lookbook, kültür analizi) yalnız tanıtım ekranı —
ekranda açıkça "Bu hizmetin çalışma alanı hazırlanıyor" yazıyor.

### 🔴 Katman 3 — Tamamen sahte ticaret akışı

- **Market:** 12 koleksiyon sabit kodlu (Unsplash görselleri, **uydurma tasarımcı adları**:
  Elif Aydın, Studio Nar, Atlas Atelier). "Satın al" 2 saniyelik animasyon. Sepet sayacı sabit "(0)" metni.
- **Akademi:** 7 ders sabit, **video oynatıcı yok** (play halkaları dekoratif SVG).
  Planlar: Tek Ders ₺490 · Tam Program ₺2.900 · Program + Mentorluk ₺6.500.
- **Ödeme:** Tam kart formu görüntüsü, %20 KDV ayrıştırması — ama submit hiçbir ağ isteği yapmıyor.
- **Giriş:** Gerçek kimlik doğrulama yok.
- **Bülten:** Sahte, e-posta hiçbir yere gitmiyor.

> **Kritik konumlandırma çelişkisi (sunumda çözülmeli):** Site bir **ajans** gibi konuşuyor
> (hizmet metinleri "hazırlarız", "teslim ederiz", 7 ayrı yerde "Teklif al" mailto CTA'sı),
> ama kompozisyon stüdyosu self-servis **SaaS**. Sunum hangi iş modelini savunduğunu seçmeli.

> **Ürün fiilen TAKI ve küçük aksesuar markalarına ayarlanmış.** Yerleşim seçenekleri
> boyun/kulak/bilek/el/gövde — beşin dördü takı takma noktası. Prompt'un ürün sadakati
> talimatı taş sayısı, kesim, metal rengi, kazıma sayıyor. Altın setin 8 vakasının **5'i takı**.
> Bu bir zaaf değil, **satılabilir bir odak** — "moda görseli üretimi" diye genellemek
> ürünün en güçlü tarafını kaybettiriyor.

---

## 3. NASIL ÇALIŞIYOR — kompozisyon hattı

### Uçtan uca akış (7 adım, 3 süreç)

1. **Tarayıcı:** görsel seçilir seçilmez 1280 px'e küçültülür (JPEG q0.9) ve
   `POST /api/yukleme` ile alınan imzalı adrese PUT edilir — *üretim anına bırakılmaz*.
2. **`POST /api/compose`:** parametreleri doğrular, oturum çerezini alır, iş kaydını
   `queued` olarak Netlify Blobs'a yazar.
3. **HMAC imzalı POST** ile `/.netlify/functions/compose-background` tetiklenir,
   istemciye `202 {jobId}` döner.
4. Arka plan fonksiyonu imzayı doğrulayıp `runJob(id)` çağırır.
5. **`runJob`:** depo yollarını baytlara çözer, model zincirini döner, her denemeyi hakeme sokar.
6. Girdiler **silinir**, kazanan kare Supabase Storage + `compositions` tablosuna yazılır.
7. İstemci 2 sn'de bir `GET /api/jobs/:id` yoklar; bitince `/api/kare/:id`'den çeker.

**Neden arka plan fonksiyonu:** Netlify'ın senkron fonksiyonları **10 saniyede** kesiliyor,
üretim 10–40 saniye sürüyor. Arka plan fonksiyonunun sınırı 15 dakika.

### Model zinciri — üç ayrı model

| Rol | Model | Ne yapıyor |
|---|---|---|
| **Birincil üretim** | `gemini-3.1-flash-image` | Kompozisyonu üretir |
| **Yükseltme** | `gemini-3-pro-image` | Kapıdan geçemeyen kare için ikinci deneme |
| **Hakem** | `gemini-3.1-flash-lite` | Görsel **okuyan** (üretmeyen) model; maliyeti üretimin ~%1'i |

Hepsi SDK yerine **doğrudan REST** ile çağrılıyor (Netlify paketleme sorunu, ucuz soğuk
başlangıç, `AbortController` ile gerçek iptal).

**Kademeli yeniden deneme:** İki basamak, **değişen tek şey model**. Prompt, görseller ve
parametreler aynen aynı kalır; onarım/düzeltme geçişi yok.

### Kabul kapısı — ürünün en ayırt edici teknik parçası

Hakem dört görseli tek çağrıda alır (üç referans + üretilen kare), `temperature 0` ve katı
JSON şemasıyla beş ölçütü 0–5 puanlar. Rubrik kasten sert: *"Be harsh. This gate exists to
stop bad frames reaching a paying customer."*

| Ölçüt | Ağırlık | Eşik | Zorunlu? |
|---|---|---|---|
| Ürün sadakati | ×3 | 4 | ✅ |
| Kimlik korunumu | ×2 | 3 | — |
| Anatomi ve yerleşim | ×2 | **3** (üretimde) | ✅ |
| Işık uyumu | ×1 | 3 | — |
| Sahne bütünlüğü | ×1 | 3 | — |

**Kapı BAŞARISIZLIK değil YÜKSELTME tetikler** — kullanıcı her hâlükârda en iyi kareyi
görür; eşiği geçemediyse arayüz bunu dürüstçe söyler ("Bu kare iç kalite eşiğimizi geçemedi").

> **İnce ayrıntı:** Detay kadrajında yüz görünmediği için `kimlik` null'a çevriliyor ve
> ağırlığıyla birlikte paydadan düşüyor — toplam ağırlık 9 yerine **7**. Yani "detay"
> vakalarının ağırlıklı ortalaması diğerleriyle birebir aynı ölçeği kullanmıyor.

### Prompt mühendisliği

Şablon **İngilizce** (modeller bu dilde daha tutarlı), arayüzün tamamı Türkçe.
Üç görsel sabit sırayla gider (Gemini'de "referans tipi" alanı olmadığı için roller
metinle tanımlanır). Yasaklar listesi görev tanımı kadar uzun: ürünü yeniden tasarlama /
basitleştirme / "güzelleştirme" yok, yüz ve ten rengi değiştirilemez, ek takı/logo/filigran
yok, tam olarak iki el ve beşer parmak, özne-arka plan arasında kesik kenar yok.

---

## 4. ÖLÇÜLMÜŞ SAYILAR

### 4.1 Model kilidi — 8 vakalık altın set, 4 model, 32 üretim

Ölçüm 28 Ağustos 2026. Prompt sürümü `85823ef4`, çıktı 1K.
**Kabul burada = ürün ≥ 4 VE anatomi ≥ 4** (üretim kapısından daha katı).

| Model | Kabul | Ağırlıklı | p50 | p95 | Kare başı | Kabul başı | Toplam |
|---|---|---|---|---|---|---|---|
| 3.1 Flash Lite | %87,5 (7/8) | 4,08 | 4.571 ms | 5.080 ms | 0,03454 $ | **0,03947 $** | 0,27631 $ |
| **3.1 Flash** ← birincil | %87,5 (7/8) | 4,48 | 11.592 ms | 13.417 ms | 0,05938 $ | **0,06787 $** | 0,47507 $ |
| 2.5 Flash ← kullanılmıyor | %50 (4/8) | 3,93 | 13.658 ms | 16.235 ms | 0,03421 $ | 0,06843 $ | 0,27370 $ |
| **3 Pro** ← yükseltme | %100 (8/8) | 4,97 | 17.480 ms | 19.494 ms | 0,14150 $ | **0,14150 $** | 1,13203 $ |

**Toplam ölçüm gideri: 2,157 $** — tüm model karşılaştırması iki dolara mal oldu.

> ⚠️ **Dört farklı "kare başına maliyet" dolaşıyor.** Tek yetkili sayı seç ve tanımını yaz:
> `0,05938 $` = ölçülen kare başı · `0,06787 $` = ölçülen kabul başı ·
> `0,069 $` = kuru koşu **tahmini** (ölçüm değil) · `~0,13 $` = kapı dahil (README).

**Sıralama neden kabul başına maliyete göre:** Başarısız üretimler de faturalanıyor ve
paya giriyor. 2.5 Flash'ın kare başı maliyeti en ucuz ama kabul oranı yarıya düştüğü için
kabul başına maliyeti 3.1 Flash'la neredeyse aynı.

**Lite neden birincil değil:** Kâğıt üzerinde en ucuz kabul maliyeti onda, ama düşürdüğü
kare *çirkin* düşüyor — çantayı bileğe kaynatıyor, bir vakada modelin gömleğini çıkarıyor.
Ağırlıklı ortalamadaki 0,40 puanlık fark tam olarak bu.

### 4.2 SUNUMUN EN İYİ HİKÂYESİ — sorun model değil, promptmuş

İlk koşuda düşen karelerin çoğu aynı sebepten düşüyordu: **detay kırpması istendiğinde
iki model de normal portre üretiyordu.** Kırpma yönergesi promptun ortasında tek bir yan
cümleydi. Sayıyla yeniden yazıldı — *"ürün karenin en az üçte birini doldurmalı, gövdenin
kalanı kırpılmalı"* — ve kısıtlar listesinde tekrarlandı.

| Model | önce | sonra |
|---|---|---|
| 3 Pro | %100 | %100 |
| **3.1 Flash** | **%63** | **%88** |
| **3.1 Flash Lite** | **%50** | **%88** |
| 2.5 Flash | %25 | %50 |

**Tek metin değişikliği, iki modelin kabul oranını 25–38 puan taşıdı.** Slaytta gösterilecek
somut kanıt: `lib/ai/prompt.ts:23-27`.

### 4.3 Eşik tahminle seçilmedi — 30 kare elle puanlandı

| Eşik (ürün/anatomi) | İnsanla uyum | Yanlış kabul | Yanlış ret |
|---|---|---|---|
| 4 / 4 | %60 (18/30) | 1 | 11 |
| **4 / 3 ← seçilen** | **%73 (22/30)** | **1** | **7** |
| 4 / 2 | %83 (25/30) | 3 | 2 |

4/2 en yüksek uyumu veriyor ama yanlış kabulü üçe katlıyor — kapının varlık sebebi tam
olarak onu engellemek. *Yanlış ret bir yeniden deneme, yanlış kabul bir müşteri.*

**Hakem-insan sapması:** ürün sadakati 0,67 (eğilim 0,00 — kalibre) · kimlik 0,68 (+0,50) ·
**anatomi 1,13 (−0,80 — belirgin sert)** · ışık 0,97 · sahne 1,00.

**Doğrulama kendi hatasını buldu:** İlk okuma "hakem fazla katı" idi. Tam çözünürlükte
bakınca tersi çıktı — parmak eklemleri gerçekten bozuktu. Skor kartı 460 piksellik kıyas
sayfalarından dolduruldu; hakem tam çözünürlükten bakıyor. **Yani kabul oranları bir miktar
iyimser.** Model sıralaması değişmiyor (hata dört modele eşit dağılmış).

### 4.4 Kapının bedeli — gecikme tarafı sunumda eksik anlatılıyor

Hakem çağrısının kendi ölçülmüş gecikmesi (30 çağrı): min 5.011 ms · **p50 9.542 ms** ·
p95 16.891 ms · maks 18.237 ms · ortalama 10.156 ms.

Birincil model p50'si 11.592 ms olduğuna göre **kapı tipik durumda bile süreyi yaklaşık
ikiye katlıyor: 11,6 sn → ~21 sn.** Dürüst ve etkileyici cümle:
*"Kalite kapısı bedava değil, süreyi ikiye katlıyor — yine de 20 saniye, bir çekim günü değil."*

Maliyet tarafı: kare başına ~0,059 $ yerine ~0,13 $; kötü durumda gecikme ~40 sn.

### 4.5 Bu sayılara ne kadar güvenilir — gizlenmemeli

- **n = 8, tek koşu.** %88 ile %100 arasındaki fark **tek bir karedir**.
- Puanlama gözle ve tek kişi tarafından yapıldı; anatomide yumuşak çıktı → oranlar iyimser.
- **Koşular arası oynaklık gerçek:** aynı girdi bir koşuda `IMAGE_SAFETY` filtresine takıldı,
  diğerinde takılmadı. ±1 kare oynayabilir.
- Girdiler **stok fotoğraf** (Unsplash), kendi ürün çekimleri değil.
- İki üretim başarısızlığı farklı sebeplerden: 3.1 Flash/kolye-portre → `IMAGE_SAFETY`
  (15.828 ms sonra); 2.5 Flash/canta-dis-mekan → `NO_IMAGE` (1.605 ms'de, hiç denemedi).

### 4.6 ÇIKTI ÇÖZÜNÜRLÜĞÜ — sunumda kritik, hiçbir yerde yazmıyor

`COMPOSE_IMAGE_SIZE='1K'` gerçekte ne üretiyor (30 kareden okundu):

| En-boy | Piksel |
|---|---|
| 4:5 | 896 × 1200 |
| 3:4 | 928 × 1152 |
| 1:1 | 1024 × 1024 |
| 16:9 | 1376 × 768 |

**Sonuç:** 896×1200, Instagram'ın önerdiği 1080×1350'in **altında** — platform yükselterek
bozar. Trendyol/Zalando gibi e-ticaret standartları (1200×1800+) karşılanmıyor. 300 dpi
baskıda kare ancak 7,6 × 10,2 cm. **Bugünkü çıktı sosyal medya ve katalog önizlemesi için
yeterli, ürün sayfası ana görseli ve baskı için değil.** `COMPOSE_IMAGE_SIZE` ile 2K'ya
çıkılabilir (kodda doğrulanmadı, maliyet artar) — bu bir **yol haritası maddesi** olarak sunulabilir.

---

## 5. İŞ MODELİ — onaylı rakamlar

> Bu bölümdeki her sayı kullanıcı tarafından onaylandı ve yayınlanmış sunumda duruyor.
> **48,25 ₺/$ kuru ile.**

### Aylık planlar

| Plan | Kredi | Kredi fiyatı | Maliyetimiz | Marj |
|---|---|---|---|---|
| ₺699 Normal | 70 | ₺9,99 | $2,80 | %81 |
| ₺2.199 Pro | 260 | ₺8,46 | $10,40 | %77 |
| ₺5.999 Enterprise | 850 | ₺7,06 | $34,00 | %73 |

### Kredi neye harcanıyor

| İşlem | Kredi | Bize maliyeti | Kredi başına |
|---|---|---|---|
| Hızlı kare | 1 | $0,0395 | $0,0395 |
| Kalite kapılı kare | 2 | $0,0767 | $0,0384 |
| Teknik çizim → render | 4 | $0,1415 | $0,0354 |

Kapı bir kareyi yükselttiğinde **müşteriye ek kredi yazılmıyor** — yükseltmenin maliyeti
bizde kalıyor. Kredi başına maliyet üç işlemde de $0,04'ün altında.

**%76** harmanlanmış brüt marj (50/35/15) · **%71** yükseltme oranı iki katına çıksa bile
en dar marj · **₺14–20** kalite kapılı kare fiyatı (stüdyoda aynı kare ₺499–999) ·
**25–70×** birim maliyet avantajı.

### Talep ve başabaş

**$250.000 tohum, 18 ay pist, 25 gider kalemi.**
Ekip $128.000 (%51,2) · Pazarlama/satış $37.000 (%14,8) · Model/altyapı $33.000 (%13,2) ·
Şirketleşme/hukuk $29.000 (%11,6) · Ürün geliştirme $23.000 (%9,2).

Başabaş **263–328 abone** (abone başına aylık brüt kâr $31,70–39,57; 18. ay sonrası aylık
sabit gider $10.389).

| | Temkinli | Hedef |
|---|---|---|
| Plan dağılımı | 50/35/15 | 40/35/25 |
| Ortalama abonelik | ₺2.019 | ₺2.549 |
| 1./2./3. yıl abone | 150 · 450 · 1.080 | 240 · 720 · 1.730 |
| Aylık başabaş | 20. ay | 16. ay |
| Sermayenin geri kazanılması | 36. ay | 25. ay |
| 3. yıl gelir | ₺26,2 mn | ₺52,9 mn |

> ⚠️ **Kredi/kota altyapısı kodda YOK.** Yukarıdaki modelin tamamı planlanmış, yazılmamış.
> Bugün tek koruma "aynı oturumda tek iş" (429) ve 2 dakikalık bekçi eşiği.
> Ayrıca `compositions` tablosunda **token/maliyet kolonu yok** ve üretim yolu yanıttaki
> `usageMetadata`'yı hiç okumuyor — kredi sistemi için önce bu ölçüm üretime taşınmalı.

---

## 6. PAZAR VE RAKİPLER

### Pazar verileri (hepsi kaynaklı — kaynak satırıyla birlikte kullan)

| Veri | Kaynak |
|---|---|
| ₺4,57 trilyon 2025 e-ticaret hacmi, +%52,2, GSYH'nin %6,9'u | Ticaret Bakanlığı ETBİS 2025 |
| **₺428,7 milyar** giyim/ayakkabı/aksesuar — 1 numaralı kategori (elektronik ₺304 mlr) | ETBİS 2025 |
| 634.611 e-ticaret işletmesi, **%75'i şahıs işletmesi** | ETBİS 2025 |
| %83,4 — YZ kullanan işletmelerin görsel/metin için kullananları | ETBİS, 781 işletmelik anket |
| %62,8 — YZ benimsemesini kısıtlayan finansman yetersizliği | Ticaret Bakanlığı |
| **%21,6** giyimde iptal-iade oranı (sektörlerin en yükseği) | Ticaret Bakanlığı |
| %11 iadelerin görselle uyuşmazlıktan payı · %63 görseli ilk çözüm sayan · %45 maliyeti aşamayan | Coresight Research, 190 marka |
| 102.000 Hepsiburada aktif satıcısı | Hepsiburada FY2025 **SEC bildirimi** (güvenli) |
| Stüdyo çekimi ₺499–999/ürün, asgari 15–40 ürün → ilk fatura ₺16.500–32.500 | studyofotopark.com, fotometrik360.com, armut.com |
| Katalog mankeni ortalama aylık ₺53.200 | — |

**Pazar büyüklüğü (aşağıdan yukarı, ₺2.019 ortalama abonelik):**
TAM ₺15,4 mlr · SAM ₺2,62 mlr (~108.000 giyim satıcısı — **bizim tahminimiz**) ·
SOM ₺26,2 mn (SAM'in %1'i, 3. yıl). Bakanlık kategori bazında işletme sayısı yayımlamıyor.

### Rakipler (her rakam yayıncının kendi fiyat sayfasından)

| Oyuncu | Model | Giriş | Hız | Kalite kapısı | TR |
|---|---|---|---|---|---|
| **Selvi** | Kredi aboneliği | ₺699 · $14,49 | 12 sn medyan | **Var** | Türkçe · TL |
| Lunaar Vision | Tek seferlik kredi | $15 ind. · $25 liste | — | Yok | Türkçe · TL |
| Botika | Abonelik | $33/ay | "~15 dakika" | İnsan · 1–4 gün | Yok |
| Pebblely | Abonelik | $9/ay · 30 görsel | — | Yok | Yok |
| Flair.ai | Abonelik | $8/ay | "öncelikli render" | Yok | Yok |
| Mokker.ai | Abonelik | $13/ay · 500 görsel | — | Yok | Yok |
| The New Black | Kredi aboneliği | $15/ay · 200 kredi | — | Yok | Yok |
| Resleeve.ai | Bakiye aboneliği | $19/ay | — | Yok | Yok |
| Deep Agency | — | Kapalı beta | — | — | Yok |

**En ucuz olduğumuzu iddia etmiyoruz** — Pebblely ve Flair daha ucuz. Ayrışma: otomatik
kalite kapısı + yerel konum. Rakip fonlaması: Photoroom $64 mn, Botika $8 mn, Veesual $7,5 mn.
Çıkış kanıtı: Lalaland → Browzwear (Tem 2025).

### 🎯 Örtük rakip repoda hazır duruyor — en güçlü tek karşılaştırma

`lib/shoot.ts`, kompozisyon motorunun yerine geçtiği şeyi tam ayrıntısıyla modelliyor:
SS26 kampanyası, 14 Eylül 2026, Cihangir/İstanbul, **call 07:00 – wrap 19:30 (12,5 saat)**,
6 rol (2–3 adayla), 8 look, 8 kalemlik prop listesi, 15 dilimlik call sheet, hava durumu
ve altın saat pencereleri.

**Slayt önerisi:** SOLDA bu call sheet, SAĞDA kompozisyon stüdyosunun üç slotu ve
"11,6 sn / 0,068 $" künyesi. Depo hem karşılaştırılan şey hem karşılaştırmanın kendisi.
*(Not: `shoot.ts`'te günlük ücret/bütçe verisi YOK — bir çekim maliyeti söylenecekse
dışarıdan getirilmeli.)*

---

## 7. YOL HARİTASI — Faz 4 (hesap, kredi, moderasyon)

Araştırma 29 Ağustos 2026'da yapıldı (11 ajan, 1,15M token). **Gerçekçi takvim 2 ay.**
Dokuz dilim; 8'i dağıtım gerektiriyor. Numaralar süs değil, **katı bağımlılık sırası**.

| # | Dilim | Dağıtım | Özü |
|---|---|---|---|
| **0** | Panel kalkanı | **0** | Ayrı GCP projesi + Spend Cap (75 $ / 300 $), üretim dalı `release`, özel SMTP, `abuse@` |
| **1** | Kota altyapısı + uç yetkileri | 1 | Postgres kota sayaçları, atomik `kota_dene()`, oturum kapsamı, yetim girdi süpürgesi |
| **2** | Turnstile + kenar sınırı + ücretsiz katman | 1 | Turnstile yalnız `/api/compose`'da; ücretsiz üretim flash-lite'a iner; KVKK metinleri |
| **3** | İş kayıtları Blobs → Postgres | 1 | İyimser kilit; **ödemenin gizli önkoşulu** |
| **4** | Kimlik: e-posta OTP | 1 + önizleme | Şifre yok; `session_id → user_id` devri |
| **5** | Kredi defteri — para olmadan | 1 | Parti/lot, FIFO, rezervasyon; krediler elle SQL ile |
| **6** | Ticari zemin: sözleşme, ETBİS, sanal POS | 1 küçük | **Gerçek kritik yol bu — kod değil evrak** |
| **7** | Ödeme: iyzico, 3DS, webhook | 1 | Tek Postgres fonksiyonu; kuruş cinsinden bigint |
| **8** | Mutabakat — Netlify'da değil Supabase'de | 1 + SQL | `pg_cron`; kurtarma mekanizması kurtaracağı olayla ölmemeli |

### Kırmızı takımın bulduğu saldırı yolları

| Yol | Bize etkisi | Kapatan |
|---|---|---|
| Depoyu doldur (`/api/yukleme` kotasız) | 1 GB dakikalar içinde dolar, ürün **sessizce bozulur** | Dilim 1 |
| Netlify kredisini yak | ~1,5M istek 300 kredilik tavanı doldurur, site **durur** | Dilim 0 |
| Egress'i tüket | 5 GB Supabase + ~100 Netlify kredisi | Dilim 1 |
| Ücretsiz denemeyi öldür | Günde ~0,02 $'a büyüme hunisi kapanır | Dilim 2 |
| Kapıyı reddettir | Kare maliyeti ikiye katlanır | Dilim 2 |
| **Rıza dışı içerik** | **Yer sağlayıcı sorumluluğu — para riskinden büyük** | Dilim 2 |

> **Turnstile ekonomik bir savunma değil.** Çözücü servisler jeton başına 0,0004–0,0029 $
> alıyor, bizim ücretsiz karemiz 0,13 $ — saldırgan kaldıracı **45–300 kat**. Turnstile'ın
> işi curl döngüsünü kesmek. Ekonomik freni kota + global tavan + Google harcama tavanı taşımalı.

### İlk sürümden kasten çıkarılanlar

Şifreli giriş · Turnstile jetonuna bağlı sayaç · Kredi devri/hediye (6493 sayılı Kanun) ·
Netlify cron'uyla mutabakat · AB/yurtdışı satış · Abonelik/otomatik yenileme ·
Merchant-of-record · Tarayıcı parmak izi · Kupon/indirim/çoklu para birimi ·
Kendi kodunla e-Arşiv · Self-servis iade · Arayüz cilası

---

## 8. ALTYAPI, VERİ VE GÜVENLİK DURUMU

### Veri katmanı

- **Tek tablo:** `public.compositions`, **19 kolon** (18 + sonradan ALTER ile `session_id`).
- **İki indeks:** `(user_id, created_at desc)` ve `(session_id, created_at desc)`.
  İkincisi bugünkü galeri sorgusunu besliyor, birincisi Faz 4 için bekliyor.
- **İki RLS politikası** var ama **bugün hiçbir şeyi filtrelemiyor** — sunucu `service_role`
  ile yazıp RLS'i atlıyor, `user_id` her kayıtta null. Gerçek izolasyon uygulama katmanında.
- **İki storage kovası** (`compositions`, `inputs`), ikisi de `public=false`,
  dosya başına **2 MiB**, mime beyaz listesi (jpeg/png/webp).
- `anon` rolüne **kasten hiçbir yetki verilmemiş**.
- ⚠️ `service_role` RLS'i atlar ama **tablo yetkilerini atlamaz** — yeni tabloda `grant`
  unutulursa "permission denied" gelir (77cb871 bunu düzeltti).

### Kritik sayılar

| | |
|---|---|
| Netlify senkron / arka plan sınırı | 10 sn / 15 dk |
| `/api/compose` maxDuration | 60 sn |
| Model çağrısı / hakem zaman aşımı | 120 sn / 45 sn |
| Kalp atışı / ölü iş eşiği | 10 sn / 90 sn |
| Açık iş bekçi eşiği | 2 dakika |
| Gövde tavanı / gerçek bayt tavanı | 4 MiB (**fiilen ölü**) / **6 MiB** (aktif) |
| İstemci küçültme | 1280 px, JPEG q0.9 |
| Yoklama aralığı / toplam | 2.000 ms / 5 dakika |
| Galeri listeleme | 60 kayıt |
| Oturum çerezi | `selvi_oturum`, httpOnly, sameSite lax, 1 yıl |
| Depo yolu öneki | HMAC-SHA256'nın ilk 32 hex karakteri |
| Supabase ücretsiz kapasite | 1 GB ≈ **~1.700 kare** (ortalama 609 KB) |
| Üretim bağımlılığı | **6 paket** (ikisi kullanılmıyor) |

### Kodda gerçekten uygulanmış gizlilik/maliyet savunmaları

1. Girdi görselleri **üretim biter bitmez siliniyor**.
2. Üretilen kare özel kovada, imzalı URL yerine kendi `/api/kare` ucumuzdan servis ediliyor
   (bağlantı süresi dolmaz, yetki tek yerde, yüz fotoğrafı herkese açık adreste durmaz).
3. Galeri anonim httpOnly çerezle kapsamlanıyor; depo yolu **ham çerez değil** ondan
   türetilmiş 32 karakterlik özet.
4. İstemciden gelen depo yolu **iki kez** doğrulanıyor (biçim + oturum öneki).
5. Arka plan fonksiyonu **HMAC imzasıyla** korunuyor, imzasız çağrı sessizce yok sayılıyor.
6. Hakemin kişi hakkındaki gerekçesi `JobView`'dan kasten çıkarılıyor.
7. Aynı oturumda süren iş varken ikincisi **429**.
8. Ücretsiz üretim ayrı Google projesinin anahtarıyla (hız sınırı **proje bazlı**).

### ⚠️ Açık boşluklar — sunumda "tam güvenli" denmemeli

- **`/api/kare/:id` GET oturum kontrolü YAPMAZ** — kimliği bilen herkes kareyi görüntüleyebilir.
  Bilinçli taviz (Next görsel iyileştiricisi çerezi taşımıyor); savunma UUID'nin 122 bitlik
  entropisi ve listeleme ucunun olmaması. **Yüz fotoğrafı içeren çıktılar için bu söylenmeli.**
- **HMAC imzası yeniden oynatmayı (replay) engellemiyor** — kodda açıkça not edilmiş.
  Çözüm iş kaydı Postgres'e taşınınca gelecek (Dilim 3).
- **Öksüz girdi birikimi:** kullanıcı yükleyip üretmeden çıkarsa dosyalar `inputs`'ta kalıyor.
  Süpürme işi yazılmadı.
- **Saklama süresi (retention) kuralı YOK.** Çıktılar süresiz duruyor.
- **`GEMINI_API_KEY_UCRETSIZ` tanımsızsa sessizce ana anahtara düşülüyor** ve hız sınırı
  yalıtımı **hiç uyarı vermeden** kayboluyor. Aynı şekilde Supabase değişkenleri boşsa
  depolama sessizce devre dışı kalıyor.
- **Bugün üretimin TAMAMI "ücretsiz" katmanda** çalışıyor; "odeyen" katmanı kodda tanımlı
  ama hiç kullanılmıyor.
- **Netlify güvenlik başlığı yok** — `netlify.toml` 13 satır, `[[headers]]` ve `[[redirects]]`
  blokları yok. CSP, HSTS, X-Frame-Options, Referrer-Policy hiçbiri tanımlı değil.
- **Test yok, CI yok.** Kalite güvencesi tamamen `scripts/olcum/` ve 30 etiketli kareye dayanıyor.
- **Tek sağlayıcı bağımlılığı:** Google Generative Language API. Yedek yol yok.

### 🔴 KVKK — sunumda en büyük yasal boşluk

Kompozisyon akışında **tek bir rıza kutusu yok.** Yüz fotoğrafı yükleyen kullanıcıya
gösterilen tek şey pasif bir cümle: *"Yüklediğiniz kişi fotoğrafı için izniniz olmalıdır."*
Açık rıza alınmıyor, aydınlatma metni yok, Google'a (yurt dışı) aktarım hiçbir yerde
beyan edilmiyor, saklama süresi kuralı yok. Footer'daki "Gizlilik" ve "Şartlar" bağlantıları
`/#` adresine gidiyor.

**Dürüst ayrım:** *"Teknik önlemler alınmış, hukuki katman yazılmamış."*
Faz 4 araştırması not ediyor: yüz fotoğrafının KVKK'daki niteliği belirsiz, iki araştırma
alanı zıt sonuca vardı; güvenli oynama sözleşmenin ifası dayanağı + özel nitelikli veri
işleniyormuş gibi ayrıntılı aydınlatma metni. **Metin yayımlanmadan hukukçuya teyit ettirilmeli.**

### C2PA — kutudan çıkan bir avantaj

Üretilen JPEG'in içinde **6.952 baytlık APP11/JUMBF C2PA manifestosu** var:
`c2pa.created` → *"Created by Google Generative AI"*, `digitalSourceType = trainedAlgorithmicMedia`,
`c2pa.edited` → *"Applied imperceptible SynthID watermark"*, ve **üç adet ingredient kaydı**
(üç girdi görseli köken zincirine işlenmiş). İmza zinciri: Google LLC / Google C2PA Media
Services 1P ICA G3 / Google C2PA Root CA G3.

**Sunum değeri:** sentetik içerik şeffaflığı (AB YZ Yasası Md. 50 tipi yükümlülükler,
platform etiketleme politikaları) ek geliştirme gerektirmeden karşılanıyor.
**Uyarı:** galerideki küçültülmüş sürüm iyileştiriciden geçtiği için manifestoyu kaybediyor;
yalnız "Görseli indir" ham baytlara gidiyor.

---

## 9. TASARIM SİSTEMİ — sunumun görsel dili

Felsefe (DESIGN.md): **"Terzinin masası."** *"Bölüm ayraçları dikiş çizgisi, mikro başlıklar
dokuma etiket gibi, sürükle-bırak alanı kesikli kenarlı bir kumaş parçası.
**Bu üç motif dışında süs yok.**"*

### Palet — altı token, vurgu rengi YOK

| Token | HEX | Rol |
|---|---|---|
| `ink` | `#0b0b0b` | Metin, dolu yüzeyler |
| `paper` | `#ffffff` | Beyaz yüzeyler |
| `bone` | `#f4f2ed` | Sayfa zemini (krem) |
| `mist` | `#e4e1da` | Hairline, ayraçlar |
| `ash` | `#8b8883` | Etiketler, ikincil bilgi |
| `smoke` | `#56534e` | Gövde metni ikincil |

**Vurgu rengi bilinçli olarak yok** — hiyerarşi tipografi ölçeği ve boşlukla kuruluyor.
Bölüm ritmi: `bone → paper → bone → ink → bone`.

### Tipografi

**Bodoni Moda** (display, `opsz` ekseni açık, italik yalnız tek kelimelik vurgu için) +
**Archivo** (gövde/arayüz). `font-feature-settings: "kern","liga","tnum"` — **tabular
rakamlar global açık**.

Ölçek: Hero 17vw → 10.5rem (leading 0.9) · Footer wordmark 17vw → 8.5rem ·
Header logotype 22px · Gövde 15px/leading-7 · Notlar 11px · Eyebrow 10px.
Branding sayfasının resmî tablosu: Display 96 · Başlık 32 · Alt başlık 22 · Gövde 15 · Etiket 10.

> **Türkçe büyük İ bilinçli bir tasarım kararı:** Bodoni'de yuvarlak noktalı ve başlıkların
> parçası sayılıyor; hero'daki eyebrow–h1 boşluğu buna göre ayarlanmış.
> Sunumda *"yerelleştirme sonradan değil, tipografik karar olarak yapıldı"* diye anlatılabilir.

### Birebir kopyalanabilir token bloğu

```css
:root{--ink:#0b0b0b;--paper:#ffffff;--bone:#f4f2ed;--mist:#e4e1da;--ash:#8b8883;--smoke:#56534e;
--ease-out-expo:cubic-bezier(0.16,1,0.3,1);--ease-out-quart:cubic-bezier(0.25,1,0.5,1);
--ease-in-out-quart:cubic-bezier(0.76,0,0.24,1);
--font-display:'Bodoni Moda','Bodoni MT','Didot',Georgia,serif;
--font-sans:'Archivo',ui-sans-serif,system-ui,sans-serif}
body{background:var(--bone);color:var(--ink);font-family:var(--font-sans);
font-feature-settings:'kern','liga','tnum';text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
::selection{background:var(--ink);color:var(--bone)}
:focus-visible{outline:1px solid var(--ink);outline-offset:4px}
.eyebrow{font-family:var(--font-sans);font-size:.625rem;line-height:1;letter-spacing:.22em;
text-transform:uppercase;font-weight:500}
.seam{height:1px;width:100%;background-image:repeating-linear-gradient(90deg,currentColor 0 3px,transparent 3px 7px);opacity:.55}
.seam-y{width:1px;background-image:repeating-linear-gradient(180deg,currentColor 0 3px,transparent 3px 7px);opacity:.55}
.u-line{background-image:linear-gradient(currentColor,currentColor);background-size:0% 1px;
background-repeat:no-repeat;background-position:0 100%;padding-bottom:2px;
transition:background-size .6s var(--ease-out-expo)}
.u-line:hover,.u-line[data-active='true']{background-size:100% 1px}
.photo{filter:grayscale(100%)}
.photo-reveal{filter:grayscale(100%);transition:filter 1.2s var(--ease-out-quart),transform 1.4s var(--ease-out-expo)}
.group:hover .photo-reveal{filter:grayscale(0%)}
.dot-grid{background-color:var(--paper);background-image:radial-gradient(circle at 1px 1px,
color-mix(in srgb,var(--ink) 11%,transparent) 1px,transparent 1.5px);
background-size:24px 24px;background-position:12px 12px}
```

Google Fonts:
`https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Archivo:wght@100..900&display=swap`

**Slayt kuralları:** köşeler **keskin** (border-radius yok) · tüm ayraçlar 1px · gölge yok ·
fotoğraflar `grayscale(100%)` · **vurgu rengi yok** · zemin ritmi bone→paper→bone→ink→bone ·
buton yüksekliği 48/56px, etiketi eyebrow stilinde · rakamlar tabular.

**Motiflerin gerçek yoğunluğu** (abartmamak için): `eyebrow` 226 kullanım · `u-line` 60 ·
`font-display` 73 · `tabular-nums` 58 · `seam` **yalnız 6** · `photo-reveal` 5 ·
`dot-grid` 1 · `notch` **0 (ölü token)**.

---

## 10. MEVCUT SUNUMLAR VE RAPORLAR

Dördü de yayınlanmış artifact. **Güncelleme gerekirse aynı URL'i `url` parametresiyle geç**,
yoksa ayrı artifact oluşur.

| Belge | Adres | İçerik |
|---|---|---|
| **Selvi Atölye Sunumu** (TR) | `claude.ai/code/artifact/7ef3b80b-fcdc-4637-836a-fe5eef4058ba` | **18 slayt**. Projenin kendi paleti + tek vurgu `--lila #6e51a0`. **Bağlantıya sahip herkese açık** |
| **Selvi Data Room** (EN) | `claude.ai/code/artifact/bbd7b83e-4f48-4aa6-8b9b-67b452f2180b` | **18 slayt**, TR'nin birebir aynası. Koyu zemin, Instrument Serif/Sans + Martian Mono, lila vurgu. Özel |
| **Model Kilidi** | `claude.ai/code/artifact/3ff06b84-448f-4855-afd7-9bd406ce494a` | Ölçüm raporu — tüm model tabloları, eşik seçimi, güven sınırları |
| **Faz 4 Yol Haritası** | `claude.ai/code/artifact/bbefb694-1a8c-419e-8a0c-328e9687be48` | Dokuz dilim, kırmızı takım, kapsam kesintileri |

**Sunumların slayt sırası (ikisinde de aynı):** Kapak → Problem → Konsept/ürün/genişleme →
Müşteri konumu → Gelir modeli → Farklılaşma → Sektör görünümü → İhtiyaç + pazar büyüklüğü →
Doğrudan rakipler → Dolaylı rakipler → SWOT/VRIO → PESTLE → Porter → Teknik tanım →
Kullanılan YZ → Talep ve gider planı → Yatırımın geri dönüşü → Kapanış.

---

## 11. DEMO REHBERİ

### ⚠️ Demo riskleri — önceden bilinmeli

1. **Kompozisyon stüdyosunda hazır örnek görsel YOK.** Sunumu yapan üç fotoğrafı
   (kişi, ürün, sahne) kendisi getirmek zorunda. Önceden masaüstüne koy.
2. **Ürünün tek çalışan özelliği anasayfadan HİÇ linklenmiyor.** "kompozisyon" kelimesi
   `app/page.tsx`, `hero.tsx`, `site-header.tsx`, `site-footer.tsx`'te **sıfır kez** geçiyor.
   Tek giriş: `/hizmetler` → sol raydaki "Stüdyo" başlığı. Demoda doğrudan
   `/hizmetler/kompozisyon` adresine git.
3. **Aynı oturumda ard arda iki demo yapılamaz** — ikincisi 429 alır.
4. **Şeffaf PNG kullanma.** `downscale()` her girdiyi koşulsuz JPEG'e çeviriyor ve tuvale
   beyaz dolgu atmıyor → şeffaf pikseller **siyaha düşüyor**. Takı markalarının şeffaf
   zeminli PNG kesitleri modele siyah zeminle gidiyor.
5. **Süre:** üretim 10–40 sn + hakem ~9,5 sn. Kapı devredeyse tipik ~21 sn.
6. **Ölçüm görselleri git'te YOK.** `scripts/olcum/cikti/` 75 MB, `girdi/` 4,1 MB —
   `.gitignore`'da. Git'te yalnız `hakem.json`, `rapor.json`, `sonuclar.jsonl`.
   **Başka makinede sunum hazırlanacaksa bu dosyalar yok.**

### Alınacak ekran görüntüleri — somut liste

1. `scripts/olcum/cikti/kiyas/kolye-portre.html` — üstte üç girdi, altta dört model yan yana,
   gerçek gecikmelerle. **Ana "ne yapıyor" slaydı.**
2. `.../kiyas/canta-dis-mekan.html` — dördüncü kutu kırmızı zeminde `NO_IMAGE`.
   **"Başarısızlığı da ölçüyoruz" slaydı.**
3. `.../kiyas/yuzuk-el.html` — el/parmak anatomisi, hakemin en çok reddettiği eksen.
4. Kompozisyon stüdyosu boş hali (üç slot + "Üç görsel yükleyin").
5. Üretim paneli: "Kompozisyon kuruluyor — N sn · genelde 10–40 sn".
6. Sonuç künyesi: "3.1-flash-image · 11,6 sn · 2. deneme" — **kademeli yükseltmenin görünür
   olduğu tek yer.**
7. Eşiği geçemeyen kare uyarısı: "Bu kare iç kalite eşiğimizi geçemedi" — **dürüstlük slaydı.**
8. Galeri: kare sayısı + toplam MB başlığı, "Eşiğin altında" rozetli kart, iki adımlı Sil.
9. Teknik çizim tuvali (tek SVG çıktı üreten araç).

*Kıyas HTML'leri 2,6–7,4 MB ve görseller data URI — sunuma dosya olarak değil ekran
görüntüsü olarak koy.*

### Ekran paylaşımında görünecek can sıkıcı ayrıntılar

- Footer sosyal bağlantıları **çıplak alan adları** (`instagram.com`, `pinterest.com`,
  `linkedin.com`) — gerçek hesap yok.
- "Gizlilik" / "Şartlar" / "satış şartları" → hepsi `/#`.
- Çalışma ağacında 23 Ağustos tarihli eski `out/` klasörü duruyor.
- Dev sunucu adı hâlâ `atolye-dev`, port 3311 (README 3000 diyor).
- **Mobil çalışıyor** — `services-nav` mobilde yatay şerit, compose stüdyosu tek kolona
  düşüyor. Bu söylenebilir bir şey.

---

## 12. KAYNAK DOSYA HARİTASI

| Ne aranıyorsa | Dosya |
|---|---|
| Marka adı, URL, e-posta, nav | `lib/site.ts` |
| Tasarım felsefesi ve gerekçeler | `DESIGN.md` (37 KB, 27 Ağu'dan beri güncellenmemiş) |
| Tasarım token'ları | `app/globals.css` |
| Kurulum, mimari, ölçülmüş kararlar | `README.md` (14,6 KB) |
| Model zinciri, en iyi kare seçimi | `lib/ai/run.ts` |
| Kabul kapısı, eşikler, ağırlıklar | `lib/ai/judge.ts` (**eşikler satır 40–41**) |
| Prompt şablonu ve kısıtlar | `lib/ai/prompt.ts` (**kırpma düzeltmesi 23–27**) |
| Gemini REST çağrısı | `lib/ai/gemini.ts` |
| HMAC imzası | `lib/ai/invoke.ts` · oturum: `lib/ai/session.ts` |
| Supabase erişimi | `lib/ai/storage.ts` · şema: `supabase/schema.sql` |
| Ölçüm düzeneği | `scripts/olcum/` (altin-set, kosu, rapor, hakem, kiyas-sayfasi) |
| Ölçüm sonuçları | `scripts/olcum/cikti/rapor.json`, `hakem.json`, `sonuclar.jsonl` |
| Kompozisyon arayüzü | `components/compose-studio.tsx` |
| Çekim/call sheet verisi (örtük rakip) | `lib/shoot.ts` |
| Market/Akademi demo verisi | `lib/data.ts` |

### Ortam değişkeni **adları** (değerler asla yazdırılmaz)

`.env.example` (15): `GEMINI_API_KEY`, `GEMINI_API_KEY_UCRETSIZ`, `COMPOSE_MODEL`,
`COMPOSE_IMAGE_SIZE`, `COMPOSE_QUALITY_GATE`, `COMPOSE_JUDGE_MODEL`, `COMPOSE_ESCALATE_MODEL`,
`COMPOSE_MAX_ATTEMPTS`, `COMPOSE_ESIK_URUN`, `COMPOSE_ESIK_ANATOMI`, `COMPOSE_INVOKE_SECRET`,
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`.

---

## 13. İŞLETME NOTLARI — sunum sırasında canlıyı düşürmemek için

- **Gemini ÖN ÖDEMELİ (prepay).** Bakiye sıfırlanınca *"Your prepayment credits are depleted"*
  ile **o faturalandırma hesabına bağlı TÜM projelerdeki TÜM anahtarlar aynı anda durur**.
  29 Ağustos'ta canlı bu yüzden düştü. **Sunum öncesi bakiyeyi kontrol et**, auto-reload kur.
- **Netlify dağıtım bütçesi:** önizleme ve dal dağıtımları **0 kredi**, üretim dağıtımı 15 kredi.
  Üretim dalı `release`, geliştirme `main`. "Stopped builds" ayarı **kullanılmamalı**.
  300 kredilik sert tavan siteyi **duraklatıyor**.
- **Cloudflare KULLANILMIYOR** — Netlify proxy arkasında çalışmayı desteklemiyor
  ("Netlify must handle TLS termination"). Asıl tehlike 90 günde bir sertifika yenilemesinin
  sessizce patlaması.
- **DNS:** selviai.com Hostinger'dan alındı, **Netlify DNS ile bağlı** (`dns1–4.p08.nsone.net`).
  Hostinger'daki bölge **yetkili değil**. E-posta MX kayıtları (Hostinger) Netlify DNS'e
  eklendi ve doğrulandı: MX mx1/mx2, SPF, DMARC (`p=none`), DKIM üç CNAME — hepsi çalışıyor.
- **Supabase ücretsiz proje bir hafta işlem görmezse duraklıyor.**
- **Şema değişikliği** Supabase SQL Editor'e elle yapıştırılmalı.
- **Tarih biçimlendirmede saat dilimini açıkça ver** (`Europe/Istanbul`) — yoksa hidrasyon
  hatası (React #418) ve bu **yalnızca canlıda** görünüyor.

---

## 14. BİLİNEN TUTARSIZLIKLAR — sunumda kullanmadan önce çöz

1. **Ölçüm gideri 4,43 $ mı 2,157 $ mi?** (bkz. §0.2)
2. **İş kaydının Postgres'e taşınması Faz 3 mü Faz 4 mü?** `lib/ai/jobs.ts:14` "Faz 3'te"
   derken `:99` "Faz 4'te" diyor.
3. **Ölçüm eşiği (anatomi ≥ 4) ile üretim eşiği (anatomi ≥ 3) farklı** — hangi oranın
   hangisiyle hesaplandığı her slaytta belirtilmeli.
4. **README `localhost:3000` diyor, gerçek port 3311.**
5. **4 MB gövde tavanı fiilen ölü**, aktif kontrol 6 MB — ikisini birden "aktif sınır"
   diye sunmak yanıltıcı.
6. **Lisans/atıf:** hem ürün demosu hem ölçüm altın setinin 21 girdi görseli sabit Unsplash
   foto kimlikleriyle çekiliyor. Halka açık sunumda kaynak/lisans notu gerekiyor.
7. **DESIGN.md 27 Ağustos'tan beri güncellenmedi** — `compose-studio.tsx` ve
   `newsletter-form.tsx` repoda var, DESIGN.md'de adı hiç geçmiyor.
