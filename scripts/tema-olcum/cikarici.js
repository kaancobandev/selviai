/**
 * ÇIKARICI — tarayıcıda çalışır, ÖLÇMEZ, yalnız TOPLAR.
 *
 * Değerlendirme Node tarafında (renk.mjs + kosu.mjs). Bölünmenin sebebi:
 * backdrop-filter'ın bileşke çıktısı hiçbir yoldan piksel olarak
 * okunamıyor — getImageData onu görmüyor. Yani cam yüzeylerin bileşkesi
 * tarayıcıda da matematik olurdu; Node'da yapmak test edilebilir ve
 * fikstürle doğrulanabilir kılıyor.
 *
 *   const src = await (await fetch('/tema-cikarici.js')).text(); (0,eval)(src);
 *   await __temaCikar({ kok: 'footer', yon: 'koyu' })
 *
 * yon: "koyu" (varsayılan) en PARLAK pikseli arar — koyu temada beyaz
 * metnin en kötü durumu odur. "acik" en KOYU pikseli arar.
 */
(() => {
  /* ---------- renk çözücü ----------
     Tailwind v4 opaklıklı renkleri color-mix(in oklab, ...) olarak basıyor.
     Regex ile ayrıştırmak bu oturumda iki kez yanlış sonuç verdi (oklab
     bileşenlerini RGB sanıp neredeyse-siyah okudu). Tek güvenilir yol
     tarayıcıya çözdürmek: 1x1 canvas'a bastır, geri oku. */
  const rc = document.createElement("canvas");
  rc.width = rc.height = 1;
  const rx = rc.getContext("2d", { willReadFrequently: true });
  const coz = (deger) => {
    if (!deger || deger === "none" || deger === "transparent") return null;
    rx.clearRect(0, 0, 1, 1);
    rx.fillStyle = "#000";
    rx.fillStyle = deger; // geçersizse önceki değerde kalır
    rx.fillRect(0, 0, 1, 1);
    const d = rx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], +(d[3] / 255).toFixed(4)];
  };

  /* KESİN çözücü: geçersizse null döner, siyah DÖNMEZ.
     `coz` geçersiz girdide fillStyle'ı değiştirmediği için "#000" kalıyor
     ve SİYAH okunuyor. Renk bilinen bir yerden geldiğinde (computed style)
     bu sorun değil, ama gradyan ifadesinin parçalarını tararken
     "circle", "at 50% 50%", "45deg" gibi geometri sözcükleri de eleğe
     giriyor — onlar siyah sanılırsa ölçüm sessizce bozulur.
     İki farklı yedekle deneyip sonuçları karşılaştırmak tek güvenli yol. */
  const cozKesin = (deger) => {
    if (!deger) return null;
    const dene = (yedek) => {
      rx.clearRect(0, 0, 1, 1);
      rx.fillStyle = yedek;
      rx.fillStyle = deger;
      rx.fillRect(0, 0, 1, 1);
      const d = rx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], +(d[3] / 255).toFixed(4)];
    };
    const a = dene("#000000"), b = dene("#ffffff");
    return a.join() === b.join() ? a : null;
  };

  const lum = ([r, g, b]) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  /* Virgülle ayır ama parantez içindeki virgülleri sayma. */
  const katmanlaraBol = (deger) => {
    const parcalar = [];
    let derinlik = 0, son = 0;
    for (let i = 0; i < deger.length; i++) {
      const c = deger[i];
      if (c === "(") derinlik++;
      else if (c === ")") derinlik--;
      else if (c === "," && derinlik === 0) { parcalar.push(deger.slice(son, i).trim()); son = i + 1; }
    }
    parcalar.push(deger.slice(son).trim());
    return parcalar.filter(Boolean);
  };

  /* Durak listesini çözüp `t` konumundaki rengi döndürür.
     Hem linear hem radial buraya geliyor; ayrı yazmak iki kopya bakım
     demekti. `L` yalnız px cinsinden durakları orana çevirmek için:
     linear'da gradyan çizgisi boyu, radial'da yatay yarıçap. */
  const duraktaRenk = (parcalar, bas, t, L) => {
    const duraklar = [];
    for (let i = bas; i < parcalar.length; i++) {
      const p = parcalar[i].trim();
      const km = p.match(/\s([\d.]+)(%|px)\s*$/);
      const renk = coz(km ? p.slice(0, km.index).trim() : p);
      if (!renk) return null;
      const konum = km ? (km[2] === "%" ? parseFloat(km[1]) / 100 : parseFloat(km[1]) / L) : null;
      duraklar.push({ renk, konum });
    }
    if (!duraklar.length) return null;
    if (duraklar[0].konum === null) duraklar[0].konum = 0;
    if (duraklar[duraklar.length - 1].konum === null) duraklar[duraklar.length - 1].konum = 1;
    for (let i = 1; i < duraklar.length - 1; i++) {
      if (duraklar[i].konum === null) duraklar[i].konum = i / (duraklar.length - 1);
    }
    if (t <= duraklar[0].konum) return duraklar[0].renk;
    if (t >= duraklar[duraklar.length - 1].konum) return duraklar[duraklar.length - 1].renk;
    for (let i = 0; i < duraklar.length - 1; i++) {
      const A = duraklar[i], B = duraklar[i + 1];
      if (t >= A.konum && t <= B.konum) {
        const u = B.konum === A.konum ? 0 : (t - A.konum) / (B.konum - A.konum);
        return A.renk.map((v, k) => v + (B.renk[k] - v) * u);
      }
    }
    return duraklar[duraklar.length - 1].renk;
  };

  /* linear-gradient'i ÖLÇÜM NOKTASINDA çözer — HER AÇI için.
     Önce yalnız dikey (0/180deg) çözülüyordu; yatay ve köşegen olanlar
     null dönüp ÇÖZÜLEMEDİ oluyordu. Fiyat kartlarının mavi→lila dolgusu
     tam da köşegen ve bu yüzden kartın üstündeki 30 ölçüm gevşek "en kötü
     durum sınırı"na düşüyor, gradyanın EN AÇIK ucuyla eşleştirilip
     1,05:1 gibi anlamsız sayılar üretiyordu.

     CSS sözleşmesi: 0deg "to top", saat yönünde artar, y ekranda AŞAĞI
     doğru. Yön birim vektörü (sin A, -cos A); gradyan çizgisinin boyu
     L = |W·sin A| + |H·cos A|. Bir nokta için konum, merkeze göre
     izdüşümün L'ye oranı. Köşe anahtar sözcükleri (to top right vb.)
     kutunun en-boyuna bağlı "sihirli köşe" açısını kullanır:
     atan2(W, H) — kare kutuda 45° verir, doğrusu budur. */
  const gradyanNoktada = (ifade, oranX, oranY, W, H) => {
    const m = ifade.match(/^linear-gradient\((.*)\)$/s);
    if (!m) return null;
    const parcalar = katmanlaraBol(m[1]);
    let bas = 0, aci = 180;
    const ilk = (parcalar[0] || "").trim();
    const kose = (Math.atan2(W, H) * 180) / Math.PI;
    if (/^(-?[\d.]+(deg|grad|rad|turn)$|to\s)/.test(ilk)) {
      bas = 1;
      if (/deg$/.test(ilk)) aci = parseFloat(ilk);
      else if (/grad$/.test(ilk)) aci = parseFloat(ilk) * 0.9;
      else if (/rad$/.test(ilk)) aci = (parseFloat(ilk) * 180) / Math.PI;
      else if (/turn$/.test(ilk)) aci = parseFloat(ilk) * 360;
      else if (/to\s+top\s+right\s*$|to\s+right\s+top\s*$/.test(ilk)) aci = kose;
      else if (/to\s+bottom\s+right\s*$|to\s+right\s+bottom\s*$/.test(ilk)) aci = 180 - kose;
      else if (/to\s+bottom\s+left\s*$|to\s+left\s+bottom\s*$/.test(ilk)) aci = 180 + kose;
      else if (/to\s+top\s+left\s*$|to\s+left\s+top\s*$/.test(ilk)) aci = 360 - kose;
      else if (/to\s+top\s*$/.test(ilk)) aci = 0;
      else if (/to\s+bottom\s*$/.test(ilk)) aci = 180;
      else if (/to\s+right\s*$/.test(ilk)) aci = 90;
      else if (/to\s+left\s*$/.test(ilk)) aci = 270;
      else return null;
    }
    const rad = (aci * Math.PI) / 180;
    const sn = Math.sin(rad), cs2 = Math.cos(rad);
    const L = Math.abs(W * sn) + Math.abs(H * cs2);
    if (!L) return null;
    const t = 0.5 + ((oranX - 0.5) * W * sn - (oranY - 0.5) * H * cs2) / L;

    return duraktaRenk(parcalar, bas, t, L);
  };

  /* radial-gradient'i ÖLÇÜM NOKTASINDA çözer.
     Desteklenen biçim: açık iki değerli yarıçap + `at` konumu, yani
     `radial-gradient(128% 52% at 50% -10%, ...)`. Depodaki bütün radyal
     katmanlar bu biçimde (fiyat kartının iki kutup ışığı, `.fiyat-alan`
     halesi). `closest-side` / `farthest-corner` gibi anahtar sözcüklü
     boyutlar ÇÖZÜLMEZ — null döner ve en kötü durum sınırına düşer.

     Neden gerekliydi: sınır, kutup ışıklarını kartın HER YERİNE en güçlü
     duraklarıyla bindiriyordu. Oysa merkezleri kartın dışında (50% -10%
     ve 50% 110%) ve metnin oturduğu orta bantta katkıları sıfıra iniyor.
     Sınırla 3,53:1 okunan kart, gerçekte belgelenmiş 5,62:1'de. */
  const radyalNoktada = (ifade, oranX, oranY, W, H) => {
    const m = ifade.match(/^radial-gradient\((.*)\)$/s);
    if (!m) return null;
    const parcalar = katmanlaraBol(m[1]);
    const ilk = (parcalar[0] || "").trim();
    const bicim =
      /^(?:circle\s+|ellipse\s+)?(-?[\d.]+(?:%|px))\s+(-?[\d.]+(?:%|px))\s+at\s+(-?[\d.]+(?:%|px))\s+(-?[\d.]+(?:%|px))$/;
    const gm = ilk.match(bicim);
    if (!gm) return null;
    const cev = (v, tam) => (v.endsWith("%") ? (parseFloat(v) / 100) * tam : parseFloat(v));
    const rx = cev(gm[1], W), ry = cev(gm[2], H);
    const cx = cev(gm[3], W), cy = cev(gm[4], H);
    if (!rx || !ry) return null;
    /* Elips içinde normalize uzaklık: 0 merkez, 1 kenar. */
    const dx = (oranX * W - cx) / rx, dy = (oranY * H - cy) / ry;
    return duraktaRenk(parcalar, 1, Math.sqrt(dx * dx + dy * dy), rx);
  };

  /* NOKTADA çözülemeyen gradyanlar için EN KÖTÜ DURUM SINIRI.
     radial, conic, repeating-* ve köşegen linear buraya düşüyor. Noktanın
     gerçek rengini bilmiyoruz, ama gradyanın alabileceği renkler durak
     kümesiyle SINIRLI. Ölçüm yönünün en kötü durağını tam kapsamla
     bindirmek geçerli bir üst sınır verir: gerçek yüzey bundan daha kötü
     olamaz. Yani "geçti" dersek gerçekten geçiyordur; "kaldı" dersek elle
     bakılması gerekebilir.

     Bu, noktada çözmenin YERİNE GEÇMEZ — yalnız 38 noktayı topluca
     ÇÖZÜLEMEDİ yapıp raporu kullanılmaz hâle getirmekten iyidir. Somut
     tetikleyici: fiyat sayfasındaki `.fiyat-zemin` nokta ızgarası
     (`radial-gradient(circle, #625d6b 1px, transparent 1px)`) kartların
     altındaki her ölçümü çözülemez yapıyordu. */
  const gradyanSiniri = (ifade, enKotuFark) => {
    const m = ifade.match(/^(?:repeating-)?(?:linear|radial|conic)-gradient\((.*)\)$/s);
    if (!m) return null;
    const adaylar = [];
    for (const p of katmanlaraBol(m[1])) {
      /* Konum/açı ekleri atılıyor: "#625d6b 1px", "red 0% 40%", "50%". */
      const govde = p.replace(/\s+(-?[\d.]+(px|%|deg|rad|turn|em|rem)\s*)+$/i, "").trim();
      const renk = cozKesin(govde);
      if (renk && renk[3] > 0) adaylar.push(renk);
    }
    if (!adaylar.length) return null;
    return adaylar.reduce((en, r) => (enKotuFark(lum(r)) < enKotuFark(lum(en)) ? r : en));
  };

  window.__temaCikar = async ({ kok = "body", yon = "koyu" } = {}) => {
    /* Animasyonlar rAF ile BEKLENMEZ: panel gizliyken rAF donuyor ve ölçüm
       asılı kalıyor. Senkron bitirilip okunur. */
    try { document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }); } catch (e) {}

    /* PANEL GİZLİYKEN innerWidth/innerHeight SIFIR OKUNUYOR. O hâlde
       aşağıdaki kadraj kontrolü (rr.bottom > innerHeight) HER nokta için
       doğru çıkar ve 90 noktanın 90'ı "kadrajDisi" işaretlenir. kosu.mjs
       bunu gürültüsüzce yutmaz — çıkış kodunu bozar — ama sebebi hiç
       görünmez: insan koda değil siteye bakar. Burada erken ve AÇIKÇA
       durduruluyor. (README tuzak 6 rAF donmasını yazıyordu; bu ayrı bir
       belirti, aynı sebepten.) */
    if (!innerWidth || !innerHeight) {
      return {
        hata:
          "görünüm alanı " + innerWidth + "x" + innerHeight +
          " — panel gizli (visibilityState=" + document.visibilityState +
          "). Paneli görünür yapmadan ölçüm yapılamaz.",
      };
    }

    const kokEl = document.querySelector(kok);
    if (!kokEl) return { hata: "kök bulunamadı: " + kok };

    /* Raster arka planları önceden çöz — GERÇEKTEN örneklenebilen tek şey. */
    const rasterler = new Map();
    for (const el of document.querySelectorAll("*")) {
      const bi = getComputedStyle(el).backgroundImage;
      const m = bi && bi.match(/url\((['"]?)(.*?)\1\)/);
      /* `data:` ARTIK ATLANMIYOR. Eskiden atlanıyordu ve sonuç sessiz
         değil ama kör bir tıkanmaydı: fiyat kartlarının SVG gren dokusu
         (`.fiyat-cam`) çözülemez sayılıp kartın üstündeki 34 ölçümün
         hepsini ÇÖZÜLEMEDİ yapıyordu. Oysa data: URI ağ ve CORS
         gerektirmediği için örneklenmesi EN KOLAY olan tür. */
      if (!m) continue;
      const r0 = el.getBoundingClientRect();
      if (r0.width < 8 || r0.height < 8) continue;
      try {
        let bmp;
        try {
          bmp = await createImageBitmap(await (await fetch(m[2])).blob());
        } catch (e1) {
          /* SVG YEDEĞİ. createImageBitmap, Chrome'da SVG blob'unu
             çözmüyor: "InvalidStateError: The source image could not be
             decoded". Fiyat kartlarının gren dokusu tam olarak bu — ve
             çözülemediği için kartın üstündeki 34 ölçüm askıda kalıyordu.
             <img> yolu SVG'yi çözüyor. data: URI olduğundan tuval
             kirlenmiyor, yani getImageData çalışmaya devam ediyor. */
          bmp = await new Promise((coz2, at) => {
            const im = new Image();
            im.onload = () => coz2(im);
            im.onerror = () => at(new Error("img: " + String(e1).slice(0, 40)));
            im.src = m[2];
          });
        }
        const bg = bmp.naturalWidth || bmp.width;
        const by = bmp.naturalHeight || bmp.height;
        if (!bg || !by) throw new Error("goruntu boyutu yok");
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(r0.width));
        cv.height = Math.max(1, Math.round(r0.height));
        const cx = cv.getContext("2d", { willReadFrequently: true });
        /* İki yerleşim biçimi ayrı ele alınıyor. Tek varsayımla
           (cover+center) devam etmek TEKRARLAYAN dokularda yanlış piksel
           örnekler: karo, öğenin her yerine faz kaymasıyla basılıyor,
           dolayısıyla metnin kutusuna denk gelen bölge önceden bilinemez. */
        const st0 = getComputedStyle(el);
        /* GERÇEKTEN DÖŞENİYOR MU? Ölçüt `background-repeat` DEĞİL: `cover`
           ile serilen bir fotoğrafın da hesaplanmış tekrar değeri
           "repeat"tir, ama hiç tekrarlamaz çünkü karo kutudan büyüktür.
           Yalnız tekrara açık VE karosu kutudan küçük katmanlar döşenir.
           (Bu ayrımı atlayınca altbilgi fotoğrafı da "karo" sanıldı ve
           metnin altı yerine TÜM fotoğraf tarandı: en dar pay 4,69'dan
           4,32'ye kaydı — yani yanlış pikseli ölçüyordu.) */
        const tekrarAcik = /repeat(?!-none)/.test(st0.backgroundRepeat || "repeat");
        const boy = (st0.backgroundSize || "auto").trim();
        const kapsayan = /cover|contain/.test(boy);
        const karoKucuk = bg < r0.width - 0.5 || by < r0.height - 0.5;
        if (tekrarAcik && !kapsayan && karoKucuk) {
          /* Karoyu bir kez, doğal boyutunda çiz ve TÜM karoyu örnekle.
             Faz bilinmediği için karodaki en kötü piksel geçerli bir üst
             sınırdır: metnin altına o pikselden daha kötüsü düşemez. */
          const kcv = document.createElement("canvas");
          kcv.width = Math.max(1, bg);
          kcv.height = Math.max(1, by);
          const kcx = kcv.getContext("2d", { willReadFrequently: true });
          kcx.drawImage(bmp, 0, 0);
          rasterler.set(el, {
            veri: kcx.getImageData(0, 0, kcv.width, kcv.height).data,
            g: kcv.width, y: kcv.height, el, tumKaro: true,
          });
        } else {
          /* background-size: cover + position: center — depodaki fotoğraf
             katmanları (.selvi-footer-zemin) böyle. */
          const sc = Math.max(cv.width / bg, cv.height / by);
          cx.drawImage(bmp, (cv.width - bg * sc) / 2, (cv.height - by * sc) / 2,
            bg * sc, by * sc);
          rasterler.set(el, { veri: cx.getImageData(0, 0, cv.width, cv.height).data, g: cv.width, y: cv.height, el });
        }
      } catch (e) {
        rasterler.set(el, { hata: String(e).slice(0, 80), el });
      }
    }

    /* pointer-events kapısı: elementsFromPoint, pointer-events:none olan
       öğeleri ATLIYOR — ama tam ölçmek istediğimiz dekoratif katmanların
       hepsinde o var (.fiyat-cam, .fiyat-halka, .selvi-footer-zemin,
       .selvi-kavis). Açılmazsa yığın onları hiç görmez ve ölçüm sessizce
       sayfa zeminine düşer, yani yanlış "geçti". Sonda geri alınıyor. */
    const kapatilanlar = [];
    for (const el of document.querySelectorAll("*")) {
      const st = getComputedStyle(el);
      if (st.pointerEvents !== "none") continue;
      if (st.backgroundColor === "rgba(0, 0, 0, 0)" && st.backgroundImage === "none") continue;
      kapatilanlar.push([el, el.style.pointerEvents]);
      el.style.pointerEvents = "auto";
    }

    const noktalar = [];
    for (const el of kokEl.querySelectorAll("*")) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (parseFloat(cs.opacity) < 0.15) continue;

      /* GÖRSEL OLARAK GİZLİ metni atla (`sr-only`). Görünmediği için
         kontrastının anlamı yok, ama ölçülürse rapora GERÇEK bir kırık
         gibi düşüyor — fiyat sayfasında "Aylık planlar" tam da böyle
         3,09:1 ile en dar pay olarak çıktı ve görünür kırıkları gizledi.
         `visibility`/`display` yakalamıyor: sr-only kalıbı 1x1 kutu +
         clip. Aşağıdaki `rr.width < 1` kontrolü de yetmiyor, çünkü kutu
         tam olarak 1px. */
      if (cs.clip === "rect(0px, 0px, 0px, 0px)" || cs.clipPath === "inset(50%)") continue;

      /* KADRAJA AL — yoksa sessizce YANLIŞ ÖLÇÜM. elementsFromPoint yalnız
         görünen alanda çalışır; kadraj dışı bir metnin merkezini viewport'a
         kırparsak nokta bambaşka bir bölümün üstüne düşer. İlk denemede
         altbilgi ölçülürken hero katmanları geldi. */
      let rr = el.getBoundingClientRect();
      if (rr.width < 1 || rr.height < 1) continue;
      if (rr.top < 0 || rr.bottom > innerHeight || rr.left < 0 || rr.right > innerWidth) {
        el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
        rr = el.getBoundingClientRect();
      }
      if (rr.top < 0 || rr.bottom > innerHeight) {
        noktalar.push({ metin: el.textContent.trim().slice(0, 40), etiket: el.tagName, kadrajDisi: true });
        continue;
      }

      const mx = rr.left + rr.width / 2;
      const my = rr.top + rr.height / 2;

      /* EN KÖTÜ DURUM YÖNÜ METNE GÖRE, SAYFAYA GÖRE DEĞİL.
         `yon` sayfa geneli bir varsayım: "açık temada en kötü piksel en
         koyudur". Bu yalnız metin de koyuysa doğru. Açık temada KOYU ADA
         (fiyat kartı, hero) üstündeki BEYAZ metin için tam tersi geçerli
         ve yön yanlış seçilince sayı İYİMSER tarafa kayar — bu işin en
         tehlikeli hata biçimi. Fiyat sayfasında tam bu oldu: beyaz kart
         yazıları açık lila zeminle eşleştirilip 1,07:1 çıktı.

         Doğru ölçüt uçlar değil YAKINLIK: bir metin için en kötü zemin,
         parlaklığı ona EN YAKIN olandır — kontrast orada en düşüktür.
         `yon` yalnız metin rengi okunamazsa yedek olarak kalıyor. */
      const metinRengi = coz(cs.color);
      const metinL = metinRengi && metinRengi[3] > 0 ? lum(metinRengi) : null;
      const enKotuFark = (L) =>
        metinL === null ? (yon === "acik" ? L : -L) : Math.abs(L - metinL);

      /* Yığın: DOM zinciri YÜRÜNMEZ. Ölçülecek metnin arka planı çoğu zaman
         KARDEŞ katmanda; ataları yürüyen bir denetçi onları göremez. */
      const yigin = document.elementsFromPoint(mx, my).map((n) => {
        const st = getComputedStyle(n);
        const kayit = {
          etiket: n.tagName + (n.className ? "." + String(n.className).slice(0, 40) : ""),
          zemin: coz(st.backgroundColor),
          backdrop: st.backdropFilter && st.backdropFilter !== "none" ? st.backdropFilter : null,
          filtre: st.filter !== "none" ? st.filter : null,
          opaklik: parseFloat(st.opacity),
          karisim: st.mixBlendMode !== "normal" ? st.mixBlendMode : null,
        };

        if (st.backgroundImage !== "none") {
          /* Bir katmanda hem url() hem gradyan olabiliyor
             (.selvi-footer-zemin: görsel + %45 peçe + üst geçiş). Yalnız
             url()'i örneklemek peçeyi atlar ve oranı olduğundan DÜŞÜK
             gösterir. CSS'te katmanlar ÜSTTEN ALTA sıralı. */
          const kr = n.getBoundingClientRect();
          const oranY = kr.height ? Math.min(1, Math.max(0, (my - kr.top) / kr.height)) : 0;
          const oranX = kr.width ? Math.min(1, Math.max(0, (mx - kr.left) / kr.width)) : 0;
          const ras = rasterler.get(n);

          /* KAPSAMA DENETİMİ — yoksa ciddi yanlış ölçüm.
             Her background-image katmanı öğenin tamamını kaplamıyor.
             .u-line alt çizgisi `background-size: 100% 1px` ile öğenin
             ALTINDA 1px'lik bir şerit; kapsama bakılmazsa değerlendirici
             onu tam alan beyaz zemin sanıp beyaz metnin altına beyaz
             koyar ve oran 1,00:1 çıkar. Aynısı .seam için de geçerli. */
          const boyutlar = katmanlaraBol(st.backgroundSize || "auto");
          const konumlar = katmanlaraBol(st.backgroundPosition || "0% 0%");
          const tekrarlar = katmanlaraBol(st.backgroundRepeat || "repeat");
          const kapsiyorMu = (i) => {
            const boyut = (boyutlar[i % boyutlar.length] || "auto").trim();
            const tekrar = (tekrarlar[i % tekrarlar.length] || "repeat").trim();
            if (/cover|contain/.test(boyut)) return true;
            const parcalar = boyut.split(/\s+/);
            const yBoyut = parcalar.length > 1 ? parcalar[1] : "auto";
            if (yBoyut === "auto") return true;
            if (/repeat-y|^repeat$/.test(tekrar)) return true;
            const yPx = yBoyut.endsWith("%") ? (parseFloat(yBoyut) / 100) * kr.height : parseFloat(yBoyut);
            if (!isFinite(yPx) || yPx >= kr.height - 0.5) return true;
            /* Dikey konum: "left bottom" / "0% 100%" gibi. */
            const konum = (konumlar[i % konumlar.length] || "0% 0%").trim().split(/\s+/);
            const yKonumIfade = konum.length > 1 ? konum[1] : "50%";
            let ust;
            if (yKonumIfade === "top") ust = 0;
            else if (yKonumIfade === "bottom") ust = kr.height - yPx;
            else if (yKonumIfade === "center") ust = (kr.height - yPx) / 2;
            else if (yKonumIfade.endsWith("%")) ust = ((parseFloat(yKonumIfade) / 100) * (kr.height - yPx));
            else ust = parseFloat(yKonumIfade) || 0;
            const yerel = my - kr.top;
            return yerel >= ust - 0.5 && yerel <= ust + yPx + 0.5;
          };

          /* GRADYAN ÇERÇEVE (halka) TUZAĞI — `.u-line`nın maskeli akrabası.
             Yaygın tarif: inset:0 + padding:1px + iki maske katmanı +
             `mask-composite: exclude`. Sonuç yalnız 1px'lik KENAR boyanır,
             iç tamamen maskelenir. Ama `background-size` "auto" olduğu için
             kapsama denetimi katmanı TAM ALAN sanıyor ve neredeyse beyaz
             bir gradyanı (#d6e6ff %72 alfa) kartın ortasına bindiriyordu:
             fiyat kartındaki 30 ölçüm bu yüzden 1,2:1 çıkıyordu.

             Denetim kesin, sezgisel değil: nokta içerik kutusunun içindeyse
             (yani padding bandının dışında) halka orayı BOYAMIYOR. */
          const maskeBirlesim = st.maskComposite || st.webkitMaskComposite || "";
          let halkaIcinde = false;
          if (/exclude|xor/.test(maskeBirlesim)) {
            const pl = parseFloat(st.paddingLeft) || 0, pr = parseFloat(st.paddingRight) || 0;
            const pt = parseFloat(st.paddingTop) || 0, pb = parseFloat(st.paddingBottom) || 0;
            halkaIcinde =
              mx > kr.left + pl && mx < kr.right - pr && my > kr.top + pt && my < kr.bottom - pb;
          }

          kayit.katmanlar = katmanlaraBol(st.backgroundImage).map((k, i) => {
            if (halkaIcinde) return { tur: "kapsamiyor", ifade: "halka ici (mask-composite: exclude)" };
            if (!kapsiyorMu(i)) return { tur: "kapsamiyor", ifade: k.slice(0, 40) };
            if (/^url\(/.test(k)) {
              if (!ras || !ras.veri) return { tur: "cozulemedi", ifade: ras && ras.hata ? ras.hata : "raster yok" };
              const kr2 = ras.el.getBoundingClientRect(); // kaydırma sonrası taze
              /* tumKaro: tekrarlayan doku, faz bilinmiyor — karonun
                 tamamı taranıyor (üst sınır). Aksi hâlde yalnız metnin
                 kutusuna denk gelen bölge. */
              const x0 = ras.tumKaro ? 0 : Math.max(0, Math.round(rr.left - kr2.left));
              const x1 = ras.tumKaro ? ras.g : Math.min(ras.g, Math.round(rr.right - kr2.left));
              const y0 = ras.tumKaro ? 0 : Math.max(0, Math.round(rr.top - kr2.top));
              const y1 = ras.tumKaro ? ras.y : Math.min(ras.y, Math.round(rr.bottom - kr2.top));
              /* ALFA KORUNUYOR. Önce zorla 1 yazılıyordu; fotoğraf
                 katmanları için doğru (opaklar) ama ALFALI dokular için
                 ciddi yanlış: fiyat kartlarının SVG greni %2-3 opaklıkta
                 beyaz zerrelerden oluşuyor ve alfa atılınca her zerre KATI
                 BEYAZ sanılıp kartı bembeyaz gösteriyor, 30 nokta 1,00:1'e
                 düşüyordu.

                 En kötü aday seçilirken de alfa hesaba katılıyor: bir
                 pikselin zarar verme gücü, hem metne yakınlığı hem de ne
                 kadar opak olduğuyla orantılı. Saydam bir zerre metni
                 gizleyemez. */
              let en = null, enPuan = -Infinity;
              for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
                const i = (y * ras.g + x) * 4;
                const p = [ras.veri[i], ras.veri[i + 1], ras.veri[i + 2]];
                const a = ras.veri[i + 3] / 255;
                if (a <= 0) continue;
                const puan = a * (1 - Math.min(1, enKotuFark(lum(p))));
                if (puan > enPuan) { enPuan = puan; en = [p[0], p[1], p[2], +a.toFixed(4)]; }
              }
              return en ? { tur: "raster", renk: en } : { tur: "cozulemedi", ifade: "ornek yok" };
            }
            const gr =
              gradyanNoktada(k, oranX, oranY, kr.width, kr.height) ||
              radyalNoktada(k, oranX, oranY, kr.width, kr.height);
            if (gr) return { tur: "gradyan", renk: gr };
            /* Noktada çözülemedi — en kötü durum sınırına düş. `sinir: true`
               raporda görünür kalsın diye taşınıyor: sayı bir ÖLÇÜM değil,
               ÜST SINIR. */
            const sr = gradyanSiniri(k, enKotuFark);
            if (sr) return { tur: "gradyan", renk: sr, sinir: true, ifade: k.slice(0, 60) };
            return { tur: "cozulemedi", ifade: k.slice(0, 60) };
          });
        }
        return kayit;
      });

      noktalar.push({
        metin: el.textContent.trim().slice(0, 40),
        etiket: el.tagName + (el.className ? "." + String(el.className).slice(0, 40) : ""),
        renk: metinRengi,
        px: Math.round(parseFloat(cs.fontSize) * 100) / 100,
        kalinlik: cs.fontWeight,
        rect: { s: Math.round(rr.left), u: Math.round(rr.top), g: Math.round(rr.width), y: Math.round(rr.height) },
        yigin,
      });
    }

    for (const [el, eski] of kapatilanlar) el.style.pointerEvents = eski;

    return {
      yon,
      kok,
      url: location.pathname,
      viewport: { g: innerWidth, y: innerHeight, dpr: devicePixelRatio },
      sayfaZemini: coz(getComputedStyle(document.documentElement).backgroundColor)
        || coz(getComputedStyle(document.body).backgroundColor),
      rasterSayisi: rasterler.size,
      pointerEventsAcilan: kapatilanlar.length,
      noktalar,
    };
  };
  return "hazir: __temaCikar({ kok, yon })";
})();
