import type { Metadata } from "next";
import Link from "next/link";
import { oturumOku } from "@/lib/ai/session";
import { depoAcikMi, galeri } from "@/lib/ai/storage";
import { GaleriKart } from "@/components/galeri-kart";

export const metadata: Metadata = {
  title: "Galeri — Ürettiğiniz kareler",
  description: "Bu tarayıcıdan ürettiğiniz kompozisyonlar.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Galeri, anonim tarayıcı oturumuyla kapsamlanır: kimse başkasının
 * ürettiği kareyi listeleyemez. Kimlik doğrulama gelince (Faz 4) bu
 * kayıtlar hesaba devredilecek.
 */
export default async function GaleriSayfasi() {
  const oturum = await oturumOku();
  const kayitlar = oturum ? await galeri(oturum) : [];
  const toplamMB = kayitlar.reduce((t, k) => t + (k.bayt ?? 0), 0) / 1048576;

  return (
    <div className="flex flex-1 flex-col bg-ink px-6 pb-24 pt-8 md:px-10 md:pt-10 lg:px-12">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-fog">Stüdyo · Galeri</p>
          <h1 className="mt-3 font-display text-2xl leading-none md:text-3xl">
            Ürettiğiniz kareler
          </h1>
          <p className="mt-3 eyebrow text-fog">
            Yalnızca bu tarayıcıdan üretilenler görünür
          </p>
        </div>
        <div className="flex items-center gap-6">
          {kayitlar.length > 0 && (
            <span className="eyebrow tabular-nums text-fog">
              {kayitlar.length} kare · {toplamMB.toFixed(1)} MB
            </span>
          )}
          <Link href="/hizmetler/kompozisyon" className="eyebrow u-line hover:text-kalem">
            Yeni kompozisyon
          </Link>
        </div>
      </header>

      {!depoAcikMi() ? (
        <Bos
          baslik="Depolama kapalı"
          metin="Kalıcı depolama yapılandırılmadığı için üretilen kareler saklanmıyor. Sunucuda Supabase ortam değişkenlerini tanımlayın."
        />
      ) : kayitlar.length === 0 ? (
        <Bos
          baslik="Henüz kare yok"
          metin="Kompozisyon stüdyosunda üç görsel yükleyip bir kare üretin; burada birikir."
          eylem
        />
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {kayitlar.map((k) => (
            <GaleriKart key={k.id} kayit={k} />
          ))}
        </div>
      )}

      <p className="mt-12 max-w-[62ch] text-[11px] leading-4 text-fog">
        Kareler yapay zekâ ile üretilir ve künyelerinde bu bilgi taşınır. Bu liste
        tarayıcınıza bağlı anonim bir oturumla kapsamlanır — çerezleri silerseniz ya
        da başka bir cihazdan girerseniz kareler görünmez. Sildiğiniz kare depodan da
        kalıcı olarak silinir.
      </p>
    </div>
  );
}

function Bos({ baslik, metin, eylem }: { baslik: string; metin: string; eylem?: boolean }) {
  return (
    <div className="mt-12 flex flex-1 items-center justify-center border border-dashed border-hair py-24">
      <div className="max-w-[42ch] px-8 text-center">
        <p className="font-display text-xl">{baslik}</p>
        <p className="mt-3 text-sm leading-relaxed text-fog">{metin}</p>
        {eylem && (
          <Link
            href="/hizmetler/kompozisyon"
            className="mt-6 inline-block eyebrow u-line hover:text-kalem"
          >
            Stüdyoya git
          </Link>
        )}
      </div>
    </div>
  );
}

