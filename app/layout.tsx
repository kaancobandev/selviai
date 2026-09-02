import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bodoni_Moda } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FooterGate } from "@/components/footer-gate";
import { site } from "@/lib/site";
import { TEMA_ANAHTARI, TEMA_ACIK } from "@/lib/tema";

const display = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
};

/**
 * Mobil tarayıcı çubuğunun rengi. Bugün hiç tanımlı değildi; tema
 * dönünce çubuk eski renginde kalıyordu. İki değerli hâli, kullanıcının
 * sistem tercihine göre doğru olanı seçtiriyor.
 * (Faz 2'de site hâlâ koyu; açık değer Faz 5 için şimdiden doğru.)
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

/**
 * Tema betiği — <head> içinde, BLOKLAYAN.
 *
 * next/script KULLANILMAZ: hiçbir stratejisi ilk boyamadan ÖNCE çalışmayı
 * garanti etmiyor. Tema sınıfı ilk boyamadan sonra eklenirse kullanıcı bir
 * kare yanlış temayı görüyor (FOUC).
 *
 * next-themes de KULLANILMIYOR: <ThemeProvider> bugün tamamen sunucu
 * bileşeni olan bu layout'un üstüne istemci sınırı zorlar.
 *
 * VARSAYILAN KOYU, prefers-color-scheme DEĞİL. Sitenin kimliği koyu;
 * ziyaretçi açıkça seçmediyse koyu açılıyor. Bu yüzden matchMedia
 * dinleyicisine de gerek yok, yalnız localStorage okunuyor.
 *
 * try/catch ŞART: gizli sekmede ve depolama kapalıyken `localStorage`
 * erişimin KENDİSİ fırlatıyor. Yakalanmazsa betik ölür, `.dark` hiç
 * yazılmaz ve site açık temayla açılır — yani en gürültülü hata biçimi
 * en sessiz yerde patlar.
 */
const TEMA_BETIGI = `(function(){try{
document.documentElement.classList.toggle("dark",localStorage.getItem(${JSON.stringify(
  TEMA_ANAHTARI,
)})!==${JSON.stringify(TEMA_ACIK)})
}catch(e){document.documentElement.classList.add("dark")}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    /* suppressHydrationWarning ZORUNLU: betik hidrasyondan önce
       className'i değiştiriyor, sunucu çıktısıyla uyuşmazlık veriyor. */
    <html lang="tr" className={`${display.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_BETIGI }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <FooterGate>
          <SiteFooter />
        </FooterGate>
      </body>
    </html>
  );
}
