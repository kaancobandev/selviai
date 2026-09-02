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

**7. Panel gizliyken `innerWidth`/`innerHeight` SIFIR okunur.** Belirti 6
ile aynı sebepten ama ayrı bir yüz: kadraj denetimi (`rr.bottom >
innerHeight`) her nokta için doğru çıkar ve 90 noktanın 90'ı "kadraj dışı"
işaretlenir. `kosu.mjs` bunu yutmaz, çıkış kodunu bozar — ama sebep hiç
görünmez, insan koda değil siteye bakar. Çıkarıcı artık erken ve açıkça
duruyor. Panel görünür hâle gelsin diye ölçümden HEMEN ÖNCE aynı yığında
bir ekran görüntüsü alın.

**8. `sr-only` metni ölçülmemeli.** Görünmediği için kontrastının anlamı
yok, ama ölçülürse rapora gerçek bir kırık gibi düşer ve görünür kırıkları
gizler. Fiyat sayfasında `sr-only` bir `h2` ("Aylık planlar") 3,09:1 ile
"en dar pay" olarak çıktı. `visibility`/`display` yakalamıyor: kalıp 1x1
kutu + `clip`. `rr.width < 1` de yetmiyor, kutu tam 1px.

**9. Yön SAYFAYA göre değil METNE göre.** "Açık temada en kötü piksel en
koyudur" varsayımı yalnız metin de koyuysa doğru. Açık sayfadaki KOYU
ADA'nın (fiyat kartı, hero) beyaz yazısı için tam tersi geçerli. Yön
yanlış seçilince sapma İYİMSER yönde olur. Doğru ölçüt uçlar değil
YAKINLIK: bir metin için en kötü zemin, parlaklığı ona en yakın olandır.

**10. Maskeli gradyan çerçeve, `.u-line`nın akrabası.** `inset:0 +
padding:1px + mask-composite: exclude` tarifi yalnız 1px kenarı boyar, iç
tamamen maskelenir — ama `background-size` "auto" olduğu için kapsama
denetimi katmanı tam alan sanır. `.fiyat-halka` böyle: neredeyse beyaz bir
gradyan (%72 alfa) kartın ortasına bindirilip 30 ölçümü 1,2:1 gösteriyordu.

**11. `data:` URI atlanmamalı; SVG'yi `createImageBitmap` çözmez.** Data
URI ağ ve CORS gerektirmediği için örneklenmesi EN KOLAY türdür. Ama
Chrome SVG blob'unu `createImageBitmap` ile çözmüyor
("InvalidStateError"); `<img>` yolu çözüyor ve data URI olduğu için tuval
kirlenmiyor.

**12. Döşeme ölçütü `background-repeat` DEĞİL.** `cover` ile serilen bir
fotoğrafın da hesaplanmış tekrar değeri "repeat"tir; hiç tekrarlamaz çünkü
karo kutudan büyüktür. Yalnız "tekrara açık VE karo kutudan küçük"
katmanlar döşenir. Ayrım atlanınca altbilgi fotoğrafı karo sanıldı, metnin
altı yerine tüm fotoğraf tarandı ve en dar pay 4,69'dan 4,32'ye kaydı.

**13. Raster örneklerken ALFA korunmalı.** Fotoğraflar opak olduğu için
alfayı 1'e sabitlemek uzun süre fark ettirmedi. Alfalı dokularda ise ciddi
yanlış: fiyat kartlarının SVG greni %2-3 opaklıkta beyaz zerrelerden
oluşuyor, alfa atılınca her zerre KATI BEYAZ sanılıp kart bembeyaz
görünüyordu.

**14. `<img>` de bir katmandır.** Uzun süre yalnız CSS `background-image`
taranıyordu; `<img>` (ve onu basan `next/image`) yığına hiç renk katmıyordu
ve değerlendirici fotoğrafın İÇİNDEN geçip altındaki yer tutucuyu ölçüyordu.
Depoda ~21 fotoğraf üstü rozet var, hepsi bu yoldan ölçülüyordu. Yerleşimi
`object-fit` belirler, `background-size` değil. Tembel görseller ölçümden
önce eager'a çekilip `decode()` bekleniyor, yoksa rapor ölçümü değil
zamanlamayı yansıtır.

Bu kör noktanın kapanması, akademi öne çıkan kartında **koyu temada da var
olan** bir kırığı ortaya çıkardı: fotoğraf üstü eyebrow 3,17:1. Yani hata
açık tema çalışmasının ürünü değildi, yalnızca o güne dek görülemiyordu.

**15. Metnin yığındaki yeri DİZEYLE bulunamaz.** Değerlendirici, metnin
`elementsFromPoint` yığınındaki yerini etiket dizesiyle arıyordu. Üç ayrı
yoldan kırılıyor: aynı sınıfı taşıyan iki kardeş, 40 karaktere kırpılmış
sınıf adı, ve SVG. SVG öğelerinde `className` bir DOMString değil
`SVGAnimatedString`; `String()` ona `"[object SVGAnimatedString]"` diyor.
Eşleşme bozulunca `findIndex` **-1** dönüyor ve TÜM yığın kullanılıyor —
yani metnin **üstündeki** katmanlar da altına bindiriliyor. Teknik çizim
sayfasındaki SVG `ÖN` yazısı böyle 1,00:1 raporlandı: gerçekte beyaz
tuvalin üstünde siyahtı, ama araç ipucunun siyahıyla eşleştirilmişti.
Çıpa artık **kimlikle** işaretleniyor (`kendiIndeks`).

**16. Çıpa yığında hiç olmayabilir.** `pointer-events: none` olan öğeleri
`elementsFromPoint` atlıyor ve pointer-events kapısı yalnız ZEMİNİ olanları
açıyor — zeminsiz bir SVG `<text>` açılmıyor. O hâlde doğru çıpa yığındaki
**en yakın atadır**. Ayrıca "bulunamadı" değeri (-1) budama sırasında
`Math.max(0, …)` ile 0'a kırpılmamalı: bu, "bilmiyorum"u sessizce "en
üstteki katman benim" yapan bir hataydı ve ilk düzeltmeyi etkisiz bıraktı.

**17. Budama çağrı yerinde yapılmamalı.** Saydam sarmalayıcıları atmak
JSON'u 120 KB'dan 65 KB'a indiriyor, ama İNDEKS KAYDIRIYOR. Elle
yapıldığı sürece her ölçüm çağrısı `kendiIndeks`i sessizce bozma riski
taşıyordu; budama artık çıkarıcının içinde ve indeksi kendisi düzeltiyor.

**18. Fikstürün toleransı keyfi değil.** Belgelenmiş hex'lerin kendisi
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
