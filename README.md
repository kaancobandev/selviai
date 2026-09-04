# Selvi — Moda Geliştirme Stüdyosu

Minimalist, editoryal bir moda geliştirme platformu.
Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript.

Sunucu çalışma zamanı açık: kompozisyon motoru (Gemini), kalıcı depolama
(Supabase), üretimi yürüten Netlify arka plan fonksiyonu ve anonim oturum
çerezi. Diğer dokuz hizmet ekranı arayüz prototipidir.

## Çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000`.

## Rotalar

| Rota | İçerik |
|------|--------|
| `/` | Hero, manifesto, hizmetler akordeonu, market seçkisi, akademi teaser |
| `/hizmetler` → `/hizmetler/inspiration` | Çalışma alanı: sol dikey menü + interaktif ilham tuvali (sürükle, seç, düzenle, yükle) |
| `/hizmetler/kumas-secimi` | Kumaş: makro doku kütüphanesi, cetvelli/zoom'lu görsel, metraj hesabı, ağırlık/esneklik/döküm sürgüleri |
| `/hizmetler/branding` | Marka sistemi stüdyosu: logo/monogram kılavuzları, tipografi eşleşmesi, renk token'ları, canlı mockup |
| `/hizmetler/etiket-tasarimi` | Etiket stüdyosu: dokuma / asma / bakım etiketi, 1:1 cetvelli sahne, şartname ve tahmini maliyet |
| `/hizmetler/shooting` | Prodüksiyon masası: ışık senaryosu, tearsheet referansları, look–model sürükle-bırak, prop listesi (ekip/lokasyon/call sheet kaldırıldı — bkz. DESIGN.md H) |
| `/hizmetler/teknik-cizim` | Vektörel teknik çizim tuvali: kalem, seç, mezura, makas, dikiş tipleri, kumaş dolgusu, ön/arka/detay, SVG indir |
| `/hizmetler/kompozisyon` | **Kompozisyon stüdyosu** — kişi + ürün + arka plan görsellerini yapay zekâ ile tek karede birleştirir |
| `/hizmetler/[slug]` | Diğer dört hizmet için tanıtım ekranı (collage, moodboard, lookbook, kultur-analizi) |
| `/market` | Koleksiyon galerisi — filtre, sıralama, satın al |
| `/market/yukle` | Sürükle-bırak yükleme formu + canlı önizleme |
| `/akademi` | Dersler, öne çıkan video, fiyatlandırma |
| `/akademi/odeme?plan=tek\|tam\|mentor` | Ödeme formu + sipariş özeti (prototip) |
| `/hizmetler/kompozisyon/galeri` | Bu tarayıcıdan üretilen kareler — indir, sil |
| `/giris` | Giriş ekranı (prototip — kimlik doğrulama Faz 4) |

### API uçları

| Uç | İş |
|----|----|
| `POST /api/yukleme` | Girdi görselleri için imzalı yükleme adresi |
| `POST /api/compose` | Üretimi kuyruğa alır, `jobId` döner |
| `GET /api/jobs/:id` | İş durumu (istemci bunu yoklar) |
| `GET /api/kare/:id` | Üretilen kareyi servis eder |
| `DELETE /api/kare/:id` | Kareyi kalıcı siler (yalnız üreten oturum) |

## Yapay zekâ kurulumu

Kompozisyon stüdyosu (`/hizmetler/kompozisyon`) üç görseli tek karede birleştirir.
Çalışması için bir Google AI Studio anahtarı gerekir.

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) adresinden anahtar oluşturun.
   **Görsel modellerinde ücretsiz katman yoktur** — anahtarı faturalandırma açık bir
   Google Cloud projesinde üretin.
2. Depo kökünde `.env.local` dosyası açın:

   ```
   GEMINI_API_KEY=buraya_anahtar
   COMPOSE_MODEL=gemini-3.1-flash-image
   COMPOSE_IMAGE_SIZE=1K
   ```

3. `npm run dev` ile sunucuyu yeniden başlatın.

Anahtar yoksa arayüz çalışır ama üretim "GEMINI_API_KEY tanımlı değil" hatasıyla düşer.

### Nasıl çalışır

| Parça | Dosya | Görev |
|-------|-------|-------|
| Prompt | `lib/ai/prompt.ts` | Üç görselin rolünü tanımlar, yasakları listeler |
| Sağlayıcı | `lib/ai/gemini.ts` | Model çağrısı, hata çevirisi |
| İş kaydı | `lib/ai/jobs.ts` | Netlify Blobs (yayında) / süreç içi Map (yerelde) |
| Çalıştırıcı | `lib/ai/run.ts` | Üret → denetle → gerekirse yükselt |
| Kabul kapısı | `lib/ai/judge.ts` | Kareyi gösterilmeden önce puanlar |
| Kalıcı depo | `lib/ai/storage.ts` | Supabase Storage + Postgres kaydı |
| Görsel ucu | `app/api/kare/[id]` | Kareyi özel kovadan servis eder |
| Uçlar | `app/api/compose`, `app/api/jobs/[id]` | İş başlatma ve durum yoklama |
| Arka plan | `netlify/functions/compose-background.mts` | Yayında üretimi 15 dk sınırıyla çalıştırır |
| Arayüz | `components/compose-studio.tsx` | Üç slot, parametreler, sonuç |

Üretim 10–40 saniye sürer. Netlify'da senkron fonksiyonlar 10 saniyede kesildiği için
üretim arka plan fonksiyonunda çalışır; istemci `/api/jobs/:id` ucundan durumu yoklar.
Yerelde `npm run dev` tek süreç olduğundan iş doğrudan çalıştırılır — davranış aynıdır.

Ortam ayrımı `NODE_ENV` ile yapılır. `process.env.NETLIFY` bayrağına **bakmayın**:
Netlify'ın Next.js çalışma zamanında tanımlı değildir ve ona güvenmek hem üretimi
yanlış dala düşürüyor hem de iki süreci ayrı iş deposuna yazdırıyordu.

### Kalıcı depolama

Üretilen kare Supabase'e yazılır: dosya **özel** bir Storage kovasına
(`compositions`), kaydı `public.compositions` tablosuna. İş kaydında
yalnızca yol tutulur.

Görsel imzalı URL ile değil, uygulamanın kendi `/api/kare/:id` ucundan
servis edilir. Sebep: bağlantının süresi dolmaz, yetki kontrolü tek yerde
kalır (Faz 4'te oturum kontrolü tam olarak oraya girecek) ve yüz fotoğrafı
içeren çıktılar hiçbir zaman herkese açık bir adreste durmaz.

Kurulum:

1. [supabase.com](https://supabase.com) üzerinde proje açın (bölge:
   Frankfurt — Netlify fonksiyonlarıyla aynı kıta).
2. SQL Editor'e `supabase/schema.sql` içeriğini yapıştırıp çalıştırın.
3. Project Settings > API'den URL ve **secret** anahtarı alıp ortam
   değişkenlerine yazın (bkz. `.env.example`). Aynı değerleri Netlify'da
   Site configuration > Environment variables altına da girin.

Değişkenler boşsa depolama sessizce devre dışı kalır ve üretim data URL
döndürür — kurulum yarım kalsa bile site çalışır.

**Ücretsiz katman sınırı:** 1 GB dosya alanı. Birincil model ortalama
609 KB ürettiği için bu **~1.700 kare** demek. Saklama süresi kuralı
sıradaki iş.

#### Küçük görsel

Ayrı bir küçük dosya üretilmiyor. `/api/kare/:id` tam boyu servis ediyor,
küçültmeyi Next.js'in kendi görsel iyileştiricisi yapıyor — `<Image>`
bileşeni `sizes` ile hangi genişliği isteyeceğine karar veriyor ve sonuç
Netlify'da önbelleğe alınıyor. Yeni bağımlılık yok; `sharp`ı sunucusuz
pakete sokmak gereksiz risk olurdu.

Canlıda ölçülen (aynı kare):

| Genişlik | Bayt | Süre |
|---|---|---|
| tam boy | 643 KB | 7,2 sn |
| 828 | 90 KB | 1,3 sn |
| 384 | 26 KB | 1,2 sn · önbellekten 0,56 sn |
| 128 | 4,8 KB | — |

İndirme bağlantısı tam boya gitmeye devam ediyor; yalnızca ekranda
gösterilen sürüm küçültülüyor.

### İmzalı yükleme

İstemci görselleri API gövdesinden geçirmez: `/api/yukleme` imzalı bir
adres döndürür, tarayıcı baytları doğrudan `inputs` kovasına yükler ve
`/api/compose` yalnızca yolları taşır. Gövde 231 KB'tan birkaç yüz bayta
iner ve 4 MB'lık gövde sınırı ortadan kalkar.

**Yükleme, görsel seçilir seçilmez başlar** — üretim düğmesine basıldığında
değil. Bu ayrım işin özü: üretim anında yapıldığında kazanç çıkmıyor, çünkü
imzalı adres için gereken fazladan gidiş-dönüş küçülen gövdenin kazandırdığını
geri alıyor. Canlıda ölçüldü:

| | Gövdede base64 | Üretim anında imzalı | Seçimde imzalı |
|---|---|---|---|
| `/api/compose` | 2742 ms | 564 ms | 564 ms |
| imzalı adres + yükleme | — | 2291 ms | (düğmeden önce biter) |
| **kullanıcının beklediği** | **2742 ms** | **2855 ms** | **564 ms** |

**İmza istekleri sıraya alınır.** Oturum çerezini ilk istek oluşturur;
aynı anda giden istekler henüz çerezi göremediği için her biri ayrı oturum
üretir ve `/api/compose` yolları haklı olarak reddeder.

**Girdiler üretim bitince silinir.** Yüz fotoğrafları gereğinden uzun
durmamalı; ayrıca üç girdi bir çıktıdan büyük olduğu için 1 GB'lık
ücretsiz alanı üç kat hızlı tüketirlerdi.

Yolu istemci gönderdiği için sunucu iki kez doğrular: biçim (`<oturum>/<dosya>`,
tek bölme, dizin dışına çıkma yok) ve önekin isteği yapan oturuma ait olması.
Yoksa bir istemci başkasının girdisiyle üretim yaptırabilirdi.

Depolama kapalıysa ya da yükleme tökezlerse istemci sessizce eski yola
(gövdede base64) düşer — kullanıcı farkı görmez.

**Bilinen boşluk:** kullanıcı görsel yükleyip üretim yapmadan çıkarsa
dosyalar `inputs` kovasında kalır; temizlik yalnızca üretim bitince
çalışıyor. 1 GB'lık ücretsiz alanda bu birikir. Çözüm bir süpürme işi:
belirli bir yaştan eski girdileri silen zamanlanmış fonksiyon.

### Galeri

`/hizmetler/kompozisyon/galeri` — bu tarayıcıdan üretilen kareler.

Kimlik doğrulama gelene kadar liste **anonim bir oturum çereziyle**
kapsamlanır (`selvi_oturum`, httpOnly). Kimliksiz bir galeri, yüz
fotoğrafı yükleyen kullanıcıların üretimlerini birbirine göstermek olurdu.
Faz 4'te oturum açan kullanıcının kayıtları hesabına devredilecek.

Silme gerçek silmedir: hem depodaki dosya hem tablo satırı gider, ve
yalnızca kareyi üreten oturum silebilir — eşleşme veritabanında sorgulanır,
istekteki hiçbir alana güvenilmez.

**Bilinen taviz:** `/api/kare/:id` oturum kontrolü yapmaz; kimliği bilen
görüntüleyebilir. Sebep teknik — Next'in görsel iyileştiricisi kaynağı
sunucudan çeker ve kullanıcının çerezini taşımaz, ucu korursak küçük
görsel çalışmaz. UUID'nin 122 bitlik entropisi tahmin edilemez bir anahtar
sayılır ve listeleme ucu yoktur. Faz 4'te sıkılaştırılabilir.

### Kabul kapısı ve kademeli yeniden deneme

Üretilen kare kullanıcıya gösterilmeden önce ucuz bir görsel modeline
(`gemini-3.1-flash-lite`) puanlatılır — Faz 2'deki skor kartının aynısıyla.
Eşiği geçemezse daha güçlü modelle bir kez daha denenir.

Kapı **başarısızlık değil yükseltme** tetikler. Hakem kasten katı; reddi
başarısızlık saymak ürünü kullanılamaz hale getirirdi. Kullanıcı her
hâlükârda en iyi kareyi görür, kapıyı geçmediyse arayüzde bunu söyleriz.

Eşikler 30 etiketli kare üzerinde seçildi (`node scripts/olcum/hakem.mjs`).
Hakem ürün sadakatinde iyi ayarlı, anatomide insandan 0,80 puan daha sert —
eşik bunu telafi ediyor.

Maliyet etkisi: kare başına ~0,059 $ yerine **~0,13 $**, kötü durumda
gecikme ~40 sn. `COMPOSE_QUALITY_GATE=0` ile kapatılabilir.

### Model seçimi

Modeller sabit bir altın set üzerinde ölçülür; düzenek `scripts/olcum/` altında.
Karar kabul edilen kare başına maliyete göre verilir:

| Model | Rol | Kabul | p50 | Kabul başına |
|---|---|---|---|---|
| `gemini-3.1-flash-image` | birincil | %88 | 11,6 sn | 0,068 $ |
| `gemini-3.1-flash-lite-image` | hızlı önizleme | %88 | 4,6 sn | 0,040 $ |
| `gemini-3-pro-image` | yeniden deneme, zor vaka | %100 | 17,5 sn | 0,142 $ |
| `gemini-2.5-flash-image` | kullanılmıyor | %50 | 13,7 sn | 0,068 $ |

Ölçümün ilk bulduğu şey model değil promptun kendisiydi: `detay` kırpması istendiğinde
Flash ve Lite normal portre üretiyordu. Kırpma yönergesi sayısallaştırılınca kabul oranı
Flash'ta %63 → %88, Lite'ta %50 → %88 oldu. Prompt değiştirildiğinde ölçüm yenilenmeli —
kayıtlardaki `promptOzet` alanı hangi sürümle üretildiğini söyler.

## Yayınlama (Netlify + selviai.com)

Proje sunucu çalışma zamanı kullanır (API uçları var), bu yüzden **Git bağlantısı gerekir** —
klasör sürükle-bırak yöntemi yalnızca statik dosya sunar.

### 1. Depoyu GitHub'a gönder

```bash
git init -b main
git add -A
git commit -m "Atolye MVP + kompozisyon motoru"
git remote add origin https://github.com/KULLANICI/selviai.git
git push -u origin main
```

`.env.local` `.gitignore` içindedir; anahtar depoya girmez.

### 2. Netlify'da siteyi oluştur

**Add new project → Import an existing project → GitHub** ile depoyu seç.
Next.js algılanır; `netlify.toml` build komutunu ve fonksiyon dizinini tanımlar.

### 3. Ortam değişkenlerini gir

**Site configuration → Environment variables**:

| Anahtar | Değer |
|---------|-------|
| `GEMINI_API_KEY` | Google AI Studio anahtarı (ödeyen üretim projesi) |
| `GEMINI_API_KEY_UCRETSIZ` | **Ayrı** Google projesinin anahtarı. Bugün üretimin tamamı bunu kullanıyor; tanımsızsa `GEMINI_API_KEY`'e düşülür ve hız sınırı yalıtımı **sessizce kaybolur** |
| `COMPOSE_INVOKE_SECRET` | Arka plan fonksiyonu imzası ve depo yolu öneki. Tanımsızsa türetilir, ama üretimde açıkça verin |
| `COMPOSE_MODEL` | `gemini-3.1-flash-image` |
| `COMPOSE_IMAGE_SIZE` | `1K` |
| `NEXT_PUBLIC_SITE_URL` | `https://selviai.com` |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` | Kalıcı depolama — bkz. "Kalıcı depolama" |

Değişkenleri ekledikten sonra **Deploys → Trigger deploy → Clear cache and deploy site**.

### 4. Alan adını bağla

**Domain management → Add a domain** → `selviai.com`. Netlify hem apex hem `www` için
kayıt ister. İki yol var:

**A) Netlify DNS — önerilen.** Netlify'ın verdiği dört nameserver'ı Hostinger'da
**Alan Adları → selviai.com → DNS / Nameserver'lar → Nameserver değiştir** altına yaz.
Apex alan adı Netlify'ın CDN'ine doğrudan yönlenir; sertifika otomatik gelir.

**B) DNS Hostinger'da kalsın.** Hostinger **DNS Bölgesi Düzenleyici**'de:

| Tür | Ad | Değer |
|-----|-----|-------|
| A | `@` | `75.2.60.5` |
| CNAME | `www` | `SITE-ADI.netlify.app` |

Alan adı şu an Hostinger'da park hâlde (`dns-parking.com`); mevcut A ve CNAME
kayıtlarını silmen gerekir. Yayılma 24 saati bulabilir.

Her iki yolda da Netlify Let's Encrypt sertifikasını kendisi alır — **HTTPS** birkaç
dakika içinde açılır. Sonraki her `git push` yeni yayın tetikler.

## Özelleştirme

- **Marka adı / menü / hero medyası:** `lib/site.ts` (`hero.video` doldurulursa görsel yerine video oynar)
- **İçerik (hizmetler, koleksiyonlar, dersler, planlar):** `lib/data.ts`
- **Renk ve tipografi token'ları:** `app/globals.css` içindeki `@theme` bloğu
- **Görseller:** Unsplash üzerinden; `next.config.ts` → `images.remotePatterns`

Tasarım kararları ve ekran yerleşimleri için `DESIGN.md`.
