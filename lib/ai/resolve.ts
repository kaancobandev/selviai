import { girdiOku } from "./storage";
import { isRef, type ComposeInput, type ComposeRequest, type ImageSource } from "./types";

/**
 * Modele gidecek toplam girdi boyutu tavanı.
 *
 * İmzalı yüklemeye geçince /api/compose'daki 4 MB'lık gövde kontrolü
 * ölü kaldı: depo yolları gövdede yer kaplamıyor, dolayısıyla o tavan
 * hiçbir şeyi ölçmüyordu. Tek kalan sınır kovanın dosya başına sınırıydı.
 * Kontrol buraya, baytların GERÇEKTEN elde olduğu yere taşındı.
 *
 * İstemci 1280 px / JPEG q0.9 üretiyor — üç görsel tipik olarak 700 KB.
 * 6 MB, meşru kullanımın sekiz katı ve kötüye kullanımın onda biri.
 */
const EN_FAZLA_TOPLAM_BAYT = 6 * 1024 * 1024;

const baytSayisi = (b64: string) => Math.floor((b64.length * 3) / 4);

/**
 * İstek görselleri depoda duruyorsa baytlarını indirir. Model katmanı
 * her zaman hazır baytla çağrılır; nereden geldiğini bilmez.
 */
export async function cozGirdiler(girdi: ComposeInput): Promise<ComposeRequest> {
  const [person, product, scene] = await Promise.all([
    coz(girdi.person),
    coz(girdi.product),
    coz(girdi.scene),
  ]);

  const toplam = baytSayisi(person.data) + baytSayisi(product.data) + baytSayisi(scene.data);
  if (toplam > EN_FAZLA_TOPLAM_BAYT) {
    const mb = (n: number) => Math.round(n / 1048576);
    throw new Error(
      "Girdi görselleri çok büyük: " + mb(toplam) + " MB (tavan " +
        mb(EN_FAZLA_TOPLAM_BAYT) + " MB)",
    );
  }

  return { ...girdi, person, product, scene };
}

async function coz(kaynak: ImageSource) {
  if (!isRef(kaynak)) return kaynak;
  const data = await girdiOku(kaynak.path);
  if (!data) throw new Error(`Girdi görseli okunamadı: ${kaynak.path}`);
  return { mimeType: kaynak.mimeType, data };
}

/** İstekteki depo yolları — üretim bitince silinecekler. */
export function girdiYollari(girdi: ComposeInput): string[] {
  return [girdi.person, girdi.product, girdi.scene].filter(isRef).map((k) => k.path);
}
