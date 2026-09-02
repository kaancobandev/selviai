/**
 * Renk matematiği — saf, yan etkisiz, tarayıcısız.
 *
 * Bu modül HİÇBİR ŞEY ÖLÇMEZ; yalnız hesaplar. Ölçüm noktalarının gerçek
 * girdileri tarayıcıdaki çıkarıcıdan gelir (bkz. cikarici.js), çünkü
 * Tailwind v4 opaklıklı renkleri `color-mix(in oklab, ...)` olarak basıyor
 * ve bunu regex'le ayrıştırmak bu oturumda iki kez yanlış sonuç verdi —
 * renkler tarayıcıda 1x1 canvas'a bastırılıp okunur.
 *
 * NEDEN NODE TARAFINDA MATEMATİK. backdrop-filter'ın bileşke çıktısı
 * hiçbir yoldan piksel olarak okunamaz: getImageData onu görmez. Yani cam
 * yüzeylerin bileşkesi tarayıcıda da hesaplanmak zorunda. Tarayıcının
 * verdiği şey gerçek ÇIKTI değil, gerçek GİRDİ.
 */

/* ---------- ayrıştırma ---------- */

/** "#rgb", "#rrggbb", "rgb(r g b)", "rgb(r, g, b / a)" -> [r,g,b,a] */
export function ayristir(deger) {
  const s = String(deger).trim();
  if (s.startsWith("#")) {
    const h = s.slice(1);
    const t = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [
      parseInt(t.slice(0, 2), 16),
      parseInt(t.slice(2, 4), 16),
      parseInt(t.slice(4, 6), 16),
      t.length === 8 ? parseInt(t.slice(6, 8), 16) / 255 : 1,
    ];
  }
  const m = s.match(/-?[\d.]+%?/g);
  if (!m) throw new Error("renk ayrıştırılamadı: " + s);
  const say = (v, tavan) => (v.endsWith("%") ? (parseFloat(v) / 100) * tavan : parseFloat(v));
  return [say(m[0], 255), say(m[1], 255), say(m[2], 255), m[3] === undefined ? 1 : say(m[3], 1)];
}

export const hex = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/* ---------- WCAG ---------- */

const kanal = (v) => {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

/** WCAG 2.x bağıl parlaklık. */
export const parlaklik = ([r, g, b]) => 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);

/** İki OPAK renk arasındaki kontrast oranı. */
export function kontrast(a, b) {
  const [hi, lo] = [parlaklik(a), parlaklik(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- bileşke ---------- */

/**
 * source-over: üstteki alfalı rengi alttaki OPAK rengin üstüne bindirir.
 * Alt katman her zaman opak varsayılır — yığın zaten sayfa zemininden
 * başlayarak sırayla çözülüyor.
 */
export function uzerine(ust, alt) {
  const [r, g, b, a = 1] = ust;
  return [0, 1, 2].map((i) => ust[i] * a + alt[i] * (1 - a));
}

/** Sıralı katman yığınını tek opak renge indirger. İlk eleman EN ALTTA. */
export function yigin(katmanlar) {
  return katmanlar.reduce((alt, ust) => uzerine(ust.length === 3 ? [...ust, 1] : ust, alt));
}

/* ---------- CSS filtreleri ---------- */

/**
 * filter/backdrop-filter: saturate(k).
 *
 * KODLANMIŞ sRGB üzerinde çalışır ve luma'yı korur:
 *   C' = L + k * (C - L)
 *
 * KATSAYILAR 0.213 / 0.715 / 0.072 — SVG feColorMatrix "saturate"
 * matrisinin satırları; CSS filter kısayolu ona indirgeniyor.
 * DİKKAT: Rec.601'in 0.299/0.587/0.114'ü DEĞİL. İlk yazımda o kullanıldı
 * ve regresyon fikstürü yakaladı: #4d4380 için sonuç #4d3e9a çıkıyordu,
 * doğrusu #4f409b. Fikstürün varlık sebebi tam olarak bu.
 * WCAG parlaklığı ise gama AÇILDIKTAN sonra ölçülüyor ve gama eğrisi
 * konveks; saturate ortalamayı koruyan bir yayılma olduğu için Jensen
 * eşitsizliği gereği parlaklığı YÜKSELTİR, kontrastı DÜŞÜRÜR.
 *
 * Atlanırsa kayma HER ZAMAN iyimser yönde olur — yani gerçekte geçmeyen
 * bir yüzey "geçti" görünür. Bu yüzden hesaba katılıyor.
 * Doğrulandı: #4d4380 -> saturate(1.5) -> #4f409b (globals.css'te yazılı).
 */
export function doygunluk([r, g, b], k) {
  const l = 0.213 * r + 0.715 * g + 0.072 * b;
  return [l + k * (r - l), l + k * (g - l), l + k * (b - l)].map((v) => Math.max(0, Math.min(255, v)));
}

/**
 * blur(): ORTALAMA parlaklığı değiştirmez (ağırlıkları toplamı 1 olan bir
 * konvolüsyon), o yüzden parlaklık terimi olarak hesaba KATILMAZ. Ama
 * bant genişliğini daraltır: yarıçaptan küçük yapılar düzleşir. Bu, "bu
 * dokuyu blur görür mü" sorusunun cevabı — ölçüm noktası seçerken gerekli.
 * @returns blur'den sonra hayatta kalan en küçük yapı boyutu (px)
 */
export const bulaniklikEsigi = (yaricapPx) => yaricapPx * 2;

/* ---------- gradyan ---------- */

/** Duraklar [{konum:0..1, renk:[r,g,b,a]}]; t konumundaki rengi verir. */
export function gradyanda(duraklar, t) {
  const d = [...duraklar].sort((a, b) => a.konum - b.konum);
  if (t <= d[0].konum) return d[0].renk;
  if (t >= d[d.length - 1].konum) return d[d.length - 1].renk;
  for (let i = 0; i < d.length - 1; i++) {
    const a = d[i], b = d[i + 1];
    if (t >= a.konum && t <= b.konum) {
      const u = (t - a.konum) / (b.konum - a.konum);
      return a.renk.map((v, k) => v + (b.renk[k] - v) * u);
    }
  }
  return d[d.length - 1].renk;
}

/* ---------- eşikler ---------- */

/** WCAG 2.2: gövde metni 4,5 · büyük metin 3 · arayüz bileşeni 3 (1.4.11) */
export const ESIK = { metin: 4.5, buyukMetin: 3, arayuz: 3 };

/** Büyük metin tanımı: >=24px, ya da >=18.66px ve kalın. */
export const buyukMu = (pxBoyut, kalinlik) => pxBoyut >= 24 || (pxBoyut >= 18.66 && Number(kalinlik) >= 700);
