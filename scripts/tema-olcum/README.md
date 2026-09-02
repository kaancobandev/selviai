# Tema ölçüm koşumu

Açık tema çalışmasının ölçüm altyapısı. `scripts/olcum/` ile ilgisi yok —
orası görsel model karşılaştırması, burası kontrast ve parlaklık.

```bash
node scripts/tema-olcum/dogrula.mjs     # regresyon fikstürü
npm run olcum:dogrula                   # aynısı
```

## Neden var

Açık temaya geçerken yeniden ölçülmesi gereken 14 kalem var. Hiçbiri
gözle yapılamaz: ölçülecek yüzeylerin çoğu yarı saydam katman yığını ve
otomatik erişilebilirlik denetçileri bunları göremiyor.

**Kabul ölçütü:** koşum, depoda YAZILI olan bugünkü koyu sayıları yeniden
üretmezse koşum hatalıdır. Bu doğrulama atlanırsa hata, ona dayanan 14
ölçümün hepsine sessizce yayılır.

## Mimari

İki parça, dikiş yeri "matematik vs DOM" değil **çıkarım vs değerlendirme**:

| parça | nerede | ne yapar |
|---|---|---|
| `renk.mjs` | Node | saf matematik: WCAG parlaklık, kontrast, alfa bileşke, `saturate`, gradyan |
| `dogrula.mjs` | Node | regresyon fikstürü — yazılı koyu sayıları yeniden üretir |
| `cikarici.js` | tarayıcı | ölçüm noktalarının gerçek GİRDİlerini toplar (henüz yazılmadı) |

### Neden bileşke Node tarafında hesaplanıyor

`backdrop-filter`'ın çıktısı **hiçbir yoldan piksel olarak okunamaz** —
`getImageData` onu görmez, html2canvas görmez. Yani cam yüzeylerin
bileşkesi tarayıcıda da matematiktir. Tarayıcının verebileceği şey gerçek
**çıktı** değil, gerçek **girdi**: çözülmüş renkler, geometri, hesaplanmış
stil. Sadece altbilgi (görsel + peçe, ikisi de çizilebilir) gerçekten
örneklenebilir.

## Bu kodu değiştirecek olanın bilmesi gerekenler

**1. Renkleri regex'le ayrıştırma.** Tailwind v4 opaklıklı renkleri
`color-mix(in oklab, ...)` olarak basıyor. Naif bir `[\d.]+` taraması oklab
bileşenlerini RGB sanıp neredeyse-siyah okuyor. Bu oturumda iki kez oldu:
bir kez "bütün bağlantılar 1,05:1" dedi, bir kez fotoğraf üstü rozetleri
yanlış işaretledi. Tarayıcı tarafında her renk 1x1 canvas'a bastırılıp
`getImageData` ile okunmalı.

**2. `saturate` hesaba katılmalı.** Katsayılar **0.213 / 0.715 / 0.072** —
SVG `feColorMatrix` saturate matrisi. Rec.601'in 0.299/0.587/0.114'ü
**değil**; ilk yazımda o kullanıldı ve fikstür yakaladı (`#4d4380` için
`#4d3e9a` çıkıyordu, doğrusu `#4f409b`). Atlandığında kayma **her zaman
iyimser yönde** olur, yani gerçekte geçmeyen bir yüzey "geçti" görünür.
Açık temada işaret tersine döner.

**3. `blur` parlaklığı değiştirmez.** Ağırlıkları toplamı 1 olan bir
konvolüsyon; ortalama sabit kalır. Ama bant genişliğini daraltır —
yarıçaptan küçük yapılar düzleşir. Bu yüzden `blur(18px)` altında 11,5px
nokta ızgarası buğu bırakmaz, 104px şeritler bırakır.

**4. En kötü durum yön değiştirir.** Koyu temada en kötü piksel **en
parlak** olandır (beyaz metin orada kaybolur); açık temada **en koyu**
olandır. Koşum iki yönlü olmalı.

**5. DOM zincirini yürüme.** Ölçülecek metnin arka planı çoğu zaman
**kardeş** katmanda (`.fiyat-cam`, `.selvi-footer-zemin`). Ataları yürüyen
bir denetçi onları göremez ve yanlış "geçti" verir. `elementsFromPoint`
ile o pikselde gerçekten üst üste duran her şey sorulmalı.

**6. Panel gizliyken `requestAnimationFrame` donuyor.** Tarayıcı tarafı
hiçbir şeyi rAF ile beklememeli; `getAnimations().forEach(a => a.finish())`
ile animasyonlar bitirilip senkron okunmalı.

**7. Fikstürün toleransı keyfi değil.** Belgelenmiş hex'lerin kendisi
yazılı oranlardan ±0,051'e kadar sapıyor (`#3448bd` → 7,479 ama tabloda
7,53), çünkü tablo yuvarlanmış hex'ten değil float bileşkeden hesaplanmış.
Bu yüzden saf WCAG testi ±0,06, bileşke testi ise oran yerine **hex**
karşılaştırıyor (±1 kanal). İkisini tek teste koymak iki bağımsız
yuvarlama kaynağını üst üste bindirir.

## `sharp` hakkında

`sharp`, `next`'in `optionalDependency`'siydi; koşum ona dayandığı için
`devDependencies`'e **açıkça** eklendi. Aksi hâlde `npm ci --omit=optional`
ile ya da prebuilt binary'si olmayan bir platformda sessizce kırılır ve
`next` sürümü değişince habersiz gider.

## Canlı boru hattı (Faz 1b)

```bash
# 1) Çıkarıcıyı geçici olarak servis et
cp scripts/tema-olcum/cikarici.js public/tema-cikarici.js

# 2) Tarayıcıda
#    const src = await (await fetch('/tema-cikarici.js')).text(); (0,eval)(src);
#    JSON.stringify(await __temaCikar({ kok: 'footer', yon: 'koyu' }))

# 3) Çıktıyı girdi/ altına kaydet, sonra
npm run olcum:kosu scripts/tema-olcum/girdi/koyu-1280-footer.json

# 4) public/tema-cikarici.js'i SİL — yayına gitmemeli
```

### Bilinen sapma

Altbilgi 1280'de en dar **4,69:1** ölçülüyor; `globals.css`'te yazılı değer
**4,80:1**. Fark 0,11 ve bu boru hattı **daha muhafazakâr** tarafta.

Sebep: özgün ölçüm katman yığınının tamamını tuvale çizip **bileşke 8-bit
pikseli** örneklemişti. Bu boru hattı rasterin uç pikselini alıp peçeyi
**float** olarak üstüne biniyor — yuvarlama bir kez değil sıfır kez oluyor.
Ayrıca o ölçümden sonra altbilgiye üç bağlantı eklendi, yani ölçülen küme
de birebir aynı değil.

Sapmanın yönü güvenli: boru hattı gerçekte geçen bir yüzeyi "kaldı"
gösterebilir, tersini göstermez.
