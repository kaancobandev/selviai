import { Cinzel, Cormorant_Garamond, Hanken_Grotesk, Karla } from "next/font/google";

/**
 * Marka stüdyosunda seçilebilen ek yazı tipleri.
 * Bodoni Moda ve Archivo zaten kök düzende yüklüdür (--font-bodoni, --font-archivo).
 * Bu dosya yalnızca /hizmetler/branding sayfasından içe aktarılır; fontlar orada yüklenir.
 */
export const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const cinzel = Cinzel({
  subsets: ["latin", "latin-ext"],
  variable: "--font-cinzel",
  display: "swap",
});

export const karla = Karla({
  subsets: ["latin", "latin-ext"],
  variable: "--font-karla",
  display: "swap",
});

export const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hanken",
  display: "swap",
});

export const brandFontClass = [cormorant.variable, cinzel.variable, karla.variable, hanken.variable].join(" ");
