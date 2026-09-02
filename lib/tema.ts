/**
 * Tema sabitleri — TEK KAYNAK.
 *
 * Anahtar iki ayrı yerde geçiyor: `<head>`teki engelleyici betik (string
 * olarak gömülüyor) ve anahtar bileşeni. İkisinin ayrı ayrı yazılması
 * sessiz bir hata biçimi üretirdi: tema dönüyor ama sayfa yenilenince
 * unutuluyor, çünkü biri "selvi-tema" yazarken diğeri "tema" okuyor.
 */
export const TEMA_ANAHTARI = "selvi-tema";

/** localStorage'da açık temayı işaretleyen değer. */
export const TEMA_ACIK = "acik";
