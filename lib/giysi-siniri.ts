/* ------------------------------------------------------------------
   GİYSİ SINIRI — teknik çizim karesinde giysinin NEREDE durduğunu ölçer.

   NEDEN GEREKİYOR. Teknik çizim aracı çizimi krokinin arkasına altlık
   olarak koyuyor (bkz. components/flat-sketch.tsx). Çizim 3:4 bir kare
   olarak geliyor ve giysi o karenin içinde ÖNGÖRÜLEMEZ bir payla
   duruyor: istem "küçük ve eşit pay" diyor ama payın kaç piksel olacağına
   her koşuda model karar veriyor. Sabit bir çerçeveye oturtmak bu yüzden
   ancak yaklaşık tutuyordu — omuz, etek ucu ve en krokiye oturmuyordu.
   Payı tahmin etmek yerine ölçüyoruz.

   NEDEN ÖLÇÜLEBİLİYOR. Çizimin zemini SAF BEYAZ; istemin en sert kısıtı
   bu ve orada bu arayüzün ölçüme dayandığı da not düşülü (bkz.
   lib/ai/prompt.ts, TEKNİK ÇİZİM bloğu). Beyaz olmayan piksellerin sınır
   kutusu doğrudan giysinin kendisi.

   YALNIZ ÇİZİMLER İÇİN. Fotoğraf altlıkları (giysi silueti, ilham
   kareleri) beyaz zeminde değil; onlarda bu tarama karenin tamamını
   döndürür, yani hiçbir şey söylemez. Ayrımı çağıran taraf yapıyor.

   TARAYICIDA ÇALIŞIYOR: canvas gerekiyor. Yöntem lib/kolaj.ts'teki
   `macentayiAc` ile aynı sınıftan — o da kareyi tuvale çizip pikselleri
   okuyor; oradaki gerekçeler (kirlenmeyen tuval, sessiz başarısızlık)
   burada da geçerli.
   ------------------------------------------------------------------ */

/** Karedeki giysinin sınır kutusu — kareye ORANLI (0-1), piksel değil. */
export type GiysiSiniri = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Karenin kendi oranı (en/boy). Kutuyu tuval birimine çevirirken gerekiyor. */
  oran: number;
};

/**
 * Beyaz payı. Zemin JPEG'ten geçiyor, yani tam (255,255,255) beklenemez:
 * sıkıştırma zemini birkaç birim dalgalandırıyor ve siyah çizgilerin
 * çevresine halka izleri bırakıyor. Bir piksel "mürekkep" sayılıyorsa EN
 * KOYU kanalı 255'ten en az bu kadar uzak — en koyu kanal, çünkü doygun
 * bir renk (mesela lacivert dolgu) parlaklıkta değil ama tek kanalda
 * mutlaka uzaklaşıyor.
 *
 * 18 seçildi: sıkıştırma gürültüsünün (~5) belirgin üstünde, gerçek bir
 * açık gri dolgunun (%92 parlaklık ≈ 235, yani 20) altında. Küçültmek
 * zemin gürültüsünü giysi sandırır, büyütmek en açık dolguyu yer.
 */
const BEYAZ_PAYI = 18;

/**
 * Tarama için karenin indirildiği uzun kenar.
 *
 * İki sebep: (1) iş sınırlı kalıyor — model 1024 de döndürse 2048 de,
 * tarama hep ~0,25 megapiksel; (2) çift doğrusal küçültme tek piksellik
 * kaçak benekleri beyaza doğru eritiyor, yani aşağıdaki benek savunmasına
 * bedava bir kat daha ekliyor. 512'de kutunun çözünürlüğü ~%0,2, paneldeki
 * ölçek sürgüsünün adımı (%5) yanında görünmez.
 */
const TARAMA_KENARI = 512;

/**
 * Bir satırın/sütunun "dolu" sayılması için gereken en az mürekkep pikseli.
 *
 * BENEK SAVUNMASI BURADA. Sınır tek tek piksellerden değil, satır ve sütun
 * SAYIMLARINDAN çıkarılıyor: tek bir kaçak piksel kendi satırına da
 * sütununa da yalnız 1 katkı veriyor ve eşiği geçemiyor, yani kutuyu kare
 * kenarına savuramıyor. Gerçek bir çizgi ise geçtiği satır ya da sütunda
 * onlarca piksel bırakıyor — dikey bir kol kenarı kendi sütununu, yatay
 * bir etek ucu kendi satırını rahatça dolduruyor. 3 seçildi: 512
 * piksellik taramada en ince çizgi bile bundan uzun.
 */
const EN_AZ_PIKSEL = 3;

/**
 * Karedeki giysinin sınırını ölçer; ölçemezse `null`.
 *
 * `null` dönmesi bir arıza değil, çağıranın sabit çerçevesine düşmesi
 * için verilen işaret: kare yüklenmedi, tuval okunamadı, kare bomboş ya da
 * çıkan sınır inandırıcı değil. Yanlış ama görünen bir altlık, hiç altlık
 * olmamasından iyi.
 */
export async function giysiSiniriniOlc(src: string): Promise<GiysiSiniri | null> {
  const gorsel = await gorseliYukle(src);
  if (!gorsel) return null;

  const kaynakEn = gorsel.naturalWidth || gorsel.width;
  const kaynakBoy = gorsel.naturalHeight || gorsel.height;
  if (!kaynakEn || !kaynakBoy) return null;

  const olcek = Math.min(1, TARAMA_KENARI / Math.max(kaynakEn, kaynakBoy));
  const en = Math.max(1, Math.round(kaynakEn * olcek));
  const boy = Math.max(1, Math.round(kaynakBoy * olcek));

  const tuval = document.createElement("canvas");
  tuval.width = en;
  tuval.height = boy;
  const ctx = tuval.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(gorsel, 0, 0, en, boy);

  let veri: ImageData;
  try {
    veri = ctx.getImageData(0, 0, en, boy);
  } catch {
    /* Tuval kirlendiyse okunamaz. Kareler kendi kaynağımızdan geldiği
       için olmaması gerekir; olursa sessizce yedek çerçeveye düşülüyor. */
    return null;
  }

  const p = veri.data;
  const satir = new Uint32Array(boy);
  const sutun = new Uint32Array(en);
  for (let y = 0; y < boy; y++) {
    for (let x = 0; x < en; x++) {
      const i = (y * en + x) * 4;
      if (p[i + 3] < 8) continue; // saydam piksel de zemin sayılıyor
      const koyu = Math.min(p[i], p[i + 1], p[i + 2]);
      if (255 - koyu < BEYAZ_PAYI) continue;
      satir[y]++;
      sutun[x]++;
    }
  }

  const y0 = ilkDolu(satir);
  const y1 = sonDolu(satir);
  const x0 = ilkDolu(sutun);
  const x1 = sonDolu(sutun);
  if (y0 < 0 || x0 < 0) return null; // bomboş kare: ölçecek bir şey yok

  const sinir: GiysiSiniri = {
    x: x0 / en,
    y: y0 / boy,
    w: (x1 - x0 + 1) / en,
    h: (y1 - y0 + 1) / boy,
    oran: kaynakEn / kaynakBoy,
  };

  /* ÖLÇÜM İNANDIRICI MI. Çok küçükse karede giysi değil bir imza, bir
     benek kümesi ya da yarısı boş bir çıktı var; onu zarfa yaymak
     krokiden büyük bir leke yapar. Neredeyse tam kareyse zemin beyaz
     değil ya da kenarda çerçeve çizgisi var — o durumda ölçüm karenin
     kendi kutusunu söylüyor, yani hiçbir şey söylemiyor. İkisinde de
     sabit çerçeve daha dürüst. */
  if (sinir.w < 0.15 || sinir.h < 0.15) return null;
  if (sinir.w > 0.995 && sinir.h > 0.995) return null;
  return sinir;
}

function ilkDolu(sayim: Uint32Array): number {
  for (let i = 0; i < sayim.length; i++) if (sayim[i] >= EN_AZ_PIKSEL) return i;
  return -1;
}

function sonDolu(sayim: Uint32Array): number {
  for (let i = sayim.length - 1; i >= 0; i--) if (sayim[i] >= EN_AZ_PIKSEL) return i;
  return -1;
}

/**
 * Kareyi ölçüm için yükler.
 *
 * `crossOrigin` BİLEREK KONMUYOR — kolaj'daki eşinden ayrıldığı tek yer.
 * Kareler kendi kaynağımızdan (`/api/kare/...`) ya da `data:` adresinden
 * geliyor, yani tuval zaten kirlenmiyor; buna karşılık `crossOrigin`
 * koymak isteği CORS kipine çeviriyor ve tarayıcı onu ayrı bir önbellek
 * girdisi sayıyor — kareyi ekranda gösteren `image` düğümünün yanına
 * İKİNCİ bir indirme düşerdi. Kare başka bir kaynaktan gelirse
 * `getImageData` patlıyor ve yukarıdaki `catch` yedek çerçeveye düşürüyor.
 */
function gorseliYukle(src: string): Promise<HTMLImageElement | null> {
  return new Promise((cozumle) => {
    const img = new window.Image();
    img.onload = () => cozumle(img);
    img.onerror = () => cozumle(null);
    img.src = src;
  });
}
