import { girdiOku } from "./storage";
import { isRef, type ComposeInput, type ComposeRequest, type ImageSource } from "./types";

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
