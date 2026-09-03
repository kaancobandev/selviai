import type { Attempt, ComposeRequest } from "./types";

/* ------------------------------------------------------------------
   Kalıcı depolama — Supabase (Postgres + Storage).

   SDK yerine doğrudan REST kullanılıyor. Sebep gemini.ts'tekiyle aynı:
   bu dosyalar Netlify arka plan fonksiyonuna esbuild ile paketleniyor
   ve SDK paketlemesi bu projede bir kez günler kaybettirdi. Yüklemek
   ve satır yazmak üç basit HTTP çağrısı; SDK'ya değmez. Faz 4'teki
   oturum yönetimi @supabase/ssr ile Next.js tarafında yapılacak.

   Ortam değişkenleri yoksa depolama sessizce devre dışı kalır ve
   üretim eskisi gibi data URL döndürür — kurulum yarım kalsa bile
   site çalışmayı sürdürsün.
   ------------------------------------------------------------------ */

const BUCKET = "compositions";
const TIMEOUT_MS = 30_000;

function taban(): string | undefined {
  return (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim().replace(/\/+$/, "");
}

/** Yalnızca sunucuda kullanılır; tarayıcıya asla verilmez. */
function gizliAnahtar(): string | undefined {
  return (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
}

export function depoAcikMi(): boolean {
  return Boolean(taban() && gizliAnahtar());
}

function basliklar(ek?: Record<string, string>): Record<string, string> {
  const anahtar = gizliAnahtar()!;
  return { apikey: anahtar, authorization: `Bearer ${anahtar}`, ...ek };
}

export type Kompozisyon = {
  id: string;
  model: string;
  ms: number;
  attempt?: number;
  attempts?: Attempt[];
  accepted?: boolean | null;
  score?: number;
  reason?: string;
  request: ComposeRequest;
  mimeType: string;
  /** base64, veri öneki olmadan */
  data: string;
  /** Anonim tarayıcı oturumu — galeri bununla kapsamlanır. */
  sessionId?: string;
};

/**
 * Kareyi kovaya yükler ve kaydı tabloya yazar.
 * @returns depodaki yol, ya da depolama kapalı/başarısızsa null.
 *
 * Sıra önemli: önce dosya, sonra satır. Satır yazılamazsa yüklenen
 * dosya hemen geri alınır; tersi olsaydı kayıt, var olmayan bir
 * görseli işaret ederdi.
 */
export async function depola(k: Kompozisyon): Promise<string | null> {
  if (!depoAcikMi()) return null;

  const uzanti = k.mimeType === "image/png" ? "png" : k.mimeType === "image/webp" ? "webp" : "jpg";
  const yol = `${k.id}/full.${uzanti}`;
  const bayt = Buffer.from(k.data, "base64");

  try {
    const yukleme = await fetch(`${taban()}/storage/v1/object/${BUCKET}/${yol}`, {
      method: "POST",
      headers: basliklar({ "content-type": k.mimeType, "x-upsert": "true" }),
      body: new Uint8Array(bayt),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!yukleme.ok) {
      console.error("Depoya yükleme başarısız:", yukleme.status, (await yukleme.text()).slice(0, 200));
      return null;
    }

    const satir = await fetch(`${taban()}/rest/v1/compositions`, {
      method: "POST",
      headers: basliklar({ "content-type": "application/json", prefer: "return=minimal" }),
      body: JSON.stringify({
        id: k.id,
        model: k.model,
        duration_ms: k.ms,
        attempt: k.attempt,
        attempts: k.attempts,
        accepted: k.accepted,
        score: k.score,
        reason: k.reason,
        crop: k.request.crop,
        placement: k.request.placement,
        lighting: k.request.lighting,
        aspect: k.request.aspect,
        note: k.request.note,
        image_path: yol,
        image_bytes: bayt.length,
        mime_type: k.mimeType,
        session_id: k.sessionId,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!satir.ok) {
      console.error("Kayıt yazılamadı:", satir.status, (await satir.text()).slice(0, 200));
      // Dosya yüklendi ama kaydı yazılamadı: onu işaret eden hiçbir satır
      // yok, yani galeride görünmez ve silinemez — sessizce kotayı yer.
      // Geri al.
      await fetch(`${taban()}/storage/v1/object/${BUCKET}/${yol}`, {
        method: "DELETE",
        headers: basliklar(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }).catch(() => {});
      return null;
    }

    console.log("Kompozisyon depolandı:", { yol, kb: Math.round(bayt.length / 1024) });
    return yol;
  } catch (error) {
    console.error("Depolama hatası:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * YALNIZ DOSYA yükler — kompozisyon satırı YAZMAZ.
 *
 * İlham kareleri için. `depola` hem dosyayı hem `compositions` satırını
 * yazıyor ve o satır galeriyi besliyor; ilham kareleri oraya yazılsaydı
 * iki sorun çıkardı: (1) galeri, kompozisyonlarla ilham karelerini aynı
 * listede karıştırırdı, (2) satırdaki crop/placement/lighting sütunları
 * ilham için anlamsız — doldurmak yanıltıcı veri, boş bırakmak ise elle
 * çalıştırılacak bir şema göçü demek.
 *
 * Bu yüzden ilham kareleri kovada durur, yolları iş kaydında taşınır ve
 * `/api/kare/<isId>?k=<sira>` ile servis edilir. Şema değişmiyor.
 */
export async function dosyaYukle(
  yol: string,
  mimeType: string,
  base64: string,
): Promise<boolean> {
  if (!depoAcikMi()) return false;
  const bayt = Buffer.from(base64, "base64");
  try {
    const yukleme = await fetch(`${taban()}/storage/v1/object/${BUCKET}/${yol}`, {
      method: "POST",
      headers: basliklar({ "content-type": mimeType, "x-upsert": "true" }),
      body: new Uint8Array(bayt),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!yukleme.ok) {
      console.error("Kare yüklenemedi:", yukleme.status, (await yukleme.text()).slice(0, 200));
      return false;
    }
    console.log("Kare depolandı:", { yol, kb: Math.round(bayt.length / 1024) });
    return true;
  } catch (error) {
    console.error("Kare yükleme hatası:", error instanceof Error ? error.message : error);
    return false;
  }
}

/** Kareyi depodan okur. Kova özeldir; okuma yalnızca sunucudan yapılır. */
export async function indir(yol: string): Promise<{ bayt: Buffer; mime: string } | null> {
  if (!depoAcikMi()) return null;
  try {
    const res = await fetch(`${taban()}/storage/v1/object/${BUCKET}/${yol}`, {
      headers: basliklar(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Depodan okuma başarısız:", res.status, yol);
      return null;
    }
    return {
      bayt: Buffer.from(await res.arrayBuffer()),
      mime: res.headers.get("content-type") ?? "image/jpeg",
    };
  } catch (error) {
    console.error("Depodan okuma hatası:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Kayıt kimliğinden dosya yolunu bulur — iş kaydı silinmiş olsa bile. */
export async function kompozisyonYolu(id: string): Promise<{ yol: string; mime: string } | null> {
  if (!depoAcikMi()) return null;
  try {
    const res = await fetch(
      `${taban()}/rest/v1/compositions?id=eq.${encodeURIComponent(id)}&select=image_path,mime_type&limit=1`,
      { headers: basliklar(), signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const satirlar = (await res.json()) as { image_path?: string; mime_type?: string }[];
    const s = satirlar[0];
    return s?.image_path ? { yol: s.image_path, mime: s.mime_type ?? "image/jpeg" } : null;
  } catch {
    return null;
  }
}

export type GaleriKaydi = {
  id: string;
  olusturuldu: string;
  model: string;
  kabul: boolean | null;
  puan: number | null;
  gerekce: string | null;
  kirpma: string | null;
  yerlesim: string | null;
  isik: string | null;
  enBoy: string | null;
  bayt: number | null;
};

/** Bir oturuma ait kompozisyonlar, yeniden eskiye. */
export async function galeri(oturum: string, sinir = 60): Promise<GaleriKaydi[]> {
  if (!depoAcikMi() || !oturum) return [];
  try {
    const alanlar = "id,created_at,model,accepted,score,reason,crop,placement,lighting,aspect,image_bytes";
    const res = await fetch(
      `${taban()}/rest/v1/compositions?session_id=eq.${encodeURIComponent(oturum)}` +
        `&select=${alanlar}&order=created_at.desc&limit=${sinir}`,
      { headers: basliklar(), signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) {
      console.error("Galeri okunamadı:", res.status, (await res.text()).slice(0, 200));
      return [];
    }
    const satirlar = (await res.json()) as Record<string, unknown>[];
    return satirlar.map((s) => ({
      id: String(s.id),
      olusturuldu: String(s.created_at),
      model: String(s.model ?? ""),
      kabul: (s.accepted as boolean | null) ?? null,
      puan: s.score == null ? null : Number(s.score),
      gerekce: (s.reason as string | null) ?? null,
      kirpma: (s.crop as string | null) ?? null,
      yerlesim: (s.placement as string | null) ?? null,
      isik: (s.lighting as string | null) ?? null,
      enBoy: (s.aspect as string | null) ?? null,
      bayt: s.image_bytes == null ? null : Number(s.image_bytes),
    }));
  } catch (error) {
    console.error("Galeri hatası:", error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Kaydı ve dosyayı siler. Oturum eşleşmiyorsa hiçbir şey yapmaz —
 * kimse başkasının karesini silemesin.
 */
export async function sil(id: string, oturum: string): Promise<boolean> {
  if (!depoAcikMi() || !oturum) return false;
  try {
    const bul = await fetch(
      `${taban()}/rest/v1/compositions?id=eq.${encodeURIComponent(id)}&session_id=eq.${encodeURIComponent(oturum)}&select=image_path&limit=1`,
      { headers: basliklar(), signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!bul.ok) return false;
    const [satir] = (await bul.json()) as { image_path?: string }[];
    if (!satir?.image_path) return false;

    await fetch(`${taban()}/storage/v1/object/${BUCKET}/${satir.image_path}`, {
      method: "DELETE",
      headers: basliklar(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const satirSil = await fetch(
      `${taban()}/rest/v1/compositions?id=eq.${encodeURIComponent(id)}&session_id=eq.${encodeURIComponent(oturum)}`,
      { method: "DELETE", headers: basliklar(), signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    return satirSil.ok;
  } catch (error) {
    console.error("Silme hatası:", error instanceof Error ? error.message : error);
    return false;
  }
}

/* ------------------------------------------------------------------
   Girdi görselleri — imzalı yükleme.

   İstemci baytları API gövdesinden geçirmek yerine doğrudan depoya
   yükler. Kazanç iki türlü: 4 MB'lık gövde sınırı kalkar ve ölçülen
   ~2,7 saniyelik yükleme gecikmesi boru hattından çıkar.

   Girdiler ÜRETİM BİTİNCE SİLİNİR. Yüz fotoğrafları gereğinden uzun
   durmamalı; ayrıca üç girdi bir çıktıdan büyük, 1 GB'lık ücretsiz
   alanı üç kat hızlı tüketirlerdi.
   ------------------------------------------------------------------ */

const GIRDI_KOVA = "inputs";

/**
 * Yol bölütlerini tek tek kaçırır. Bölme karakteri korunur ama bölütün
 * içindeki hiçbir şey URL'i kaydıramaz — bu istekler service_role
 * yetkisiyle gidiyor, yani hedefin kaymasının bedeli yüksek.
 */
function kacir(yol: string): string {
  return yol.split("/").map(encodeURIComponent).join("/");
}

export type YuklemeHedefi = { yol: string; adres: string; token: string };

/** Tek bir dosya için imzalı yükleme adresi üretir. */
export async function imzaliYukleme(yol: string): Promise<YuklemeHedefi | null> {
  if (!depoAcikMi()) return null;
  try {
    const res = await fetch(`${taban()}/storage/v1/object/upload/sign/${GIRDI_KOVA}/${kacir(yol)}`, {
      method: "POST",
      headers: basliklar({ "content-type": "application/json" }),
      body: "{}",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("İmzalı adres alınamadı:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const { token } = (await res.json()) as { url?: string; token?: string };
    if (!token) return null;
    return {
      yol,
      adres: `${taban()}/storage/v1/object/upload/sign/${GIRDI_KOVA}/${kacir(yol)}?token=${token}`,
      token,
    };
  } catch (error) {
    console.error("İmzalı adres hatası:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Depodaki girdiyi base64 olarak okur. */
export async function girdiOku(yol: string): Promise<string | null> {
  if (!depoAcikMi()) return null;
  try {
    const res = await fetch(`${taban()}/storage/v1/object/${GIRDI_KOVA}/${kacir(yol)}`, {
      headers: basliklar(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Girdi okunamadı:", res.status, yol);
      return null;
    }
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch (error) {
    console.error("Girdi okuma hatası:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Üretim bittiğinde girdileri temizler. Hata yutulur: temizlik işi
 *  kullanıcının sonucunu engellememeli. */
export async function girdileriSil(yollar: string[]): Promise<void> {
  if (!depoAcikMi() || !yollar.length) return;
  try {
    await fetch(`${taban()}/storage/v1/object/${GIRDI_KOVA}`, {
      method: "DELETE",
      headers: basliklar({ "content-type": "application/json" }),
      body: JSON.stringify({ prefixes: yollar }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Girdi temizliği başarısız:", error instanceof Error ? error.message : error);
  }
}
