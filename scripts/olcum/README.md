# Model ölçümü (Faz 2)

Sabit bir altın set üzerinden birden çok görsel modelini aynı promptla
çalıştırır, üç sayı üretir: **kabul oranı**, **p50/p95 gecikme** ve
**kabul edilen kare başına gerçek maliyet**. Model kilidi bu üçüncü
sayıya bakılarak açılır.

## Çalıştırma

```bash
node scripts/olcum/kosu.mjs --kuru      # üretmeden maliyet tahmini
node scripts/olcum/kosu.mjs             # tam matris (8 vaka × 4 model)
node scripts/olcum/kosu.mjs --model=3.1 # ada göre süz
node scripts/olcum/kosu.mjs --vaka=yuzuk

node scripts/olcum/kiyas-sayfasi.mjs    # vaka başına yan yana kıyas sayfası
node scripts/olcum/rapor.mjs            # skor kartı tablosu
```

`GEMINI_API_KEY` `.env.local` dosyasından okunur.

## Dosyalar

| Dosya | İş |
|---|---|
| `altin-set.mjs` | Sekiz vaka, model listesi, fiyatlar, skor ölçütleri |
| `indir.mjs` | Girdi görsellerini 1280 px'e indirip önbelleğe alır |
| `kosu.mjs` | Matrisi çalıştırır, `cikti/sonuclar.jsonl`'a yazar |
| `kiyas-sayfasi.mjs` | `cikti/kiyas/<vaka>.html` — girdiler + dört çıktı yan yana |
| `skorlar.json` | Gözle verilen puanlar (0–5) |
| `rapor.mjs` | Skor kartını hesaplar, `cikti/rapor.json` yazar |
| `hakem.mjs` | Kabul kapısını etiketli karelere karşı doğrular |

## Bilinmesi gerekenler

- **Prompt sürümü kayda giriyor.** `promptOzet` alanı `lib/ai/prompt.ts`
  çıktısının parmak izidir. Farklı sürümlerle üretilmiş kareleri aynı
  tabloda karşılaştırmak sessiz bir hata kaynağı — kayıtlar bunu görünür
  kılar.
- **Maliyet ölçülür, tahmin edilmez.** Yanıttaki `usageMetadata`
  üzerinden hesaplanır. Başarısız çağrılar da faturalanır ve kabul başına
  maliyette paya girer.
- **Modeller farklı biçim döndürüyor:** Gemini 3.x JPEG, 2.5 PNG.
  Uzantı gerçek türü yansıtır.
- **Kıyas sayfası diskteki dosyaya değil son ölçüm kaydına bakar.**
  Başarısız bir koşudan sonra önceki denemenin dosyası diskte kalıyor.
- **Faz 2'nin anatomi puanları iyimser çıktı.** Hakem doğrulaması
  (`node scripts/olcum/hakem.mjs`) anatomide insandan 0,80 puan daha sert
  puanladı; işaretlediği karelere tam çözünürlükte bakıldığında kusurlar
  gerçekti — bozuk parmak eklemleri, deforme ayak. Puanlama 460 piksellik
  kıyas sayfalarından yapıldığı için kaçmışlar. Kabul oranları bu yüzden
  bir miktar iyimser; sıralama değişmiyor.
- Puanlama gözle yapılır ve özneldir; n=8, tek koşu. Güvenlik filtresi
  (`IMAGE_SAFETY`) aynı girdide bir koşuda tetiklenip diğerinde
  tetiklenmeyebiliyor — koşular arası oynaklık gerçek.
