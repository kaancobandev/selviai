# Selvi — Moda Geliştirme Stüdyosu

Minimalist, editoryal bir moda geliştirme platformunun statik/interaktif arayüzü.
Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript. Backend yok.

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
| `/hizmetler/shooting` | Prodüksiyon masası: ekip/lokasyon kartları, mood & gün ışığı, tearsheet, look–model sürükle-bırak, prop listesi, call sheet |
| `/hizmetler/teknik-cizim` | Vektörel teknik çizim tuvali: kalem, seç, mezura, makas, dikiş tipleri, kumaş dolgusu, ön/arka/detay, SVG indir |
| `/hizmetler/kompozisyon` | **Kompozisyon stüdyosu** — kişi + ürün + arka plan görsellerini yapay zekâ ile tek karede birleştirir |
| `/hizmetler/[slug]` | Diğer dört hizmet için tanıtım ekranı (collage, moodboard, lookbook, kultur-analizi) |
| `/market` | Koleksiyon galerisi — filtre, sıralama, satın al |
| `/market/yukle` | Sürükle-bırak yükleme formu + canlı önizleme |
| `/akademi` | Dersler, öne çıkan video, fiyatlandırma |
| `/akademi/odeme?plan=tek\|tam\|mentor` | Ödeme formu + sipariş özeti (prototip) |
| `/giris` | Giriş ekranı (prototip) |

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
| Çalıştırıcı | `lib/ai/run.ts` | İşi baştan sona yürütür |
| Uçlar | `app/api/compose`, `app/api/jobs/[id]` | İş başlatma ve durum yoklama |
| Arka plan | `netlify/functions/compose-background.mts` | Yayında üretimi 15 dk sınırıyla çalıştırır |
| Arayüz | `components/compose-studio.tsx` | Üç slot, parametreler, sonuç |

Üretim 10–40 saniye sürer. Netlify'da senkron fonksiyonlar 10 saniyede kesildiği için
üretim arka plan fonksiyonunda çalışır; istemci `/api/jobs/:id` ucundan durumu yoklar.
Yerelde `npm run dev` tek süreç olduğundan iş doğrudan çalıştırılır — davranış aynıdır.

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
| `GEMINI_API_KEY` | Google AI Studio anahtarı |
| `COMPOSE_MODEL` | `gemini-3.1-flash-image` |
| `COMPOSE_IMAGE_SIZE` | `1K` |
| `NEXT_PUBLIC_SITE_URL` | `https://selviai.com` |

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
