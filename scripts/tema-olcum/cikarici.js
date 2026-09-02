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

  /* linear-gradient'i ÖLÇÜM NOKTASINDA çözer.
     Desteklenen: açısız (varsayılan "to bottom"), 0/180deg, "to top/bottom".
     Yatay ve köşegen olanlar, radial ve conic ÇÖZÜLMEZ — null döner ve
     nokta ÇÖZÜLEMEDİ diye işaretlenir. Tahmin etmektense işaretlemek
     yeğdir: bu işin en tehlikeli hata biçimi "yanlış geçti". */
  const gradyanNoktada = (ifade, oranY) => {
    const m = ifade.match(/^linear-gradient\((.*)\)$/s);
    if (!m) return null;
    const parcalar = katmanlaraBol(m[1]);
    let bas = 0, aci = 180;
    const ilk = (parcalar[0] || "").trim();
    if (/^(-?[\d.]+deg$|to\s)/.test(ilk)) {
      bas = 1;
      if (/deg$/.test(ilk)) aci = parseFloat(ilk);
      else if (/to\s+top\s*$/.test(ilk)) aci = 0;
      else if (/to\s+bottom\s*$/.test(ilk)) aci = 180;
      else return null;
    }
    if (aci !== 0 && aci !== 180) return null;
    const t = aci === 180 ? oranY : 1 - oranY;

    const duraklar = [];
    for (let i = bas; i < parcalar.length; i++) {
      const p = parcalar[i].trim();
      const km = p.match(/\s([\d.]+)%\s*$/);
      const renk = coz(km ? p.slice(0, km.index).trim() : p);
      if (!renk) return null;
      duraklar.push({ renk, konum: km ? parseFloat(km[1]) / 100 : null });
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

  window.__temaCikar = async ({ kok = "body", yon = "koyu" } = {}) => {
    /* Animasyonlar rAF ile BEKLENMEZ: panel gizliyken rAF donuyor ve ölçüm
       asılı kalıyor. Senkron bitirilip okunur. */
    try { document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }); } catch (e) {}

    const kokEl = document.querySelector(kok);
    if (!kokEl) return { hata: "kök bulunamadı: " + kok };

    /* Raster arka planları önceden çöz — GERÇEKTEN örneklenebilen tek şey. */
    const rasterler = new Map();
    for (const el of document.querySelectorAll("*")) {
      const bi = getComputedStyle(el).backgroundImage;
      const m = bi && bi.match(/url\((['"]?)(.*?)\1\)/);
      if (!m || m[2].startsWith("data:")) continue;
      const r0 = el.getBoundingClientRect();
      if (r0.width < 8 || r0.height < 8) continue;
      try {
        const blob = await (await fetch(m[2])).blob();
        const bmp = await createImageBitmap(blob);
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(r0.width));
        cv.height = Math.max(1, Math.round(r0.height));
        const cx = cv.getContext("2d", { willReadFrequently: true });
        /* background-size: cover + position: center varsayımı — depodaki
           raster katmanlar böyle. */
        const sc = Math.max(cv.width / bmp.width, cv.height / bmp.height);
        cx.drawImage(bmp, (cv.width - bmp.width * sc) / 2, (cv.height - bmp.height * sc) / 2,
          bmp.width * sc, bmp.height * sc);
        rasterler.set(el, { veri: cx.getImageData(0, 0, cv.width, cv.height).data, g: cv.width, y: cv.height, el });
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

          kayit.katmanlar = katmanlaraBol(st.backgroundImage).map((k, i) => {
            if (!kapsiyorMu(i)) return { tur: "kapsamiyor", ifade: k.slice(0, 40) };
            if (/^url\(/.test(k)) {
              if (!ras || !ras.veri) return { tur: "cozulemedi", ifade: ras && ras.hata ? ras.hata : "raster yok" };
              const kr2 = ras.el.getBoundingClientRect(); // kaydırma sonrası taze
              const x0 = Math.max(0, Math.round(rr.left - kr2.left)), x1 = Math.min(ras.g, Math.round(rr.right - kr2.left));
              const y0 = Math.max(0, Math.round(rr.top - kr2.top)), y1 = Math.min(ras.y, Math.round(rr.bottom - kr2.top));
              let en = null, enL = yon === "acik" ? Infinity : -Infinity;
              for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
                const i = (y * ras.g + x) * 4, p = [ras.veri[i], ras.veri[i + 1], ras.veri[i + 2]], L = lum(p);
                if (yon === "acik" ? L < enL : L > enL) { enL = L; en = p; }
              }
              return en ? { tur: "raster", renk: [en[0], en[1], en[2], 1] } : { tur: "cozulemedi", ifade: "ornek yok" };
            }
            const gr = gradyanNoktada(k, oranY);
            return gr ? { tur: "gradyan", renk: gr } : { tur: "cozulemedi", ifade: k.slice(0, 60) };
          });
        }
        return kayit;
      });

      noktalar.push({
        metin: el.textContent.trim().slice(0, 40),
        etiket: el.tagName + (el.className ? "." + String(el.className).slice(0, 40) : ""),
        renk: coz(cs.color),
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
