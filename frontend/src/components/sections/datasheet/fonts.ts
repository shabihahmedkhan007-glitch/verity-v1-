import { Archivo, JetBrains_Mono } from "next/font/google";

// Landing-only faces. The variables are applied on the .ds root, so the rest of the app keeps Atkinson.
// Archivo needs its width axis: the datasheet uses wdth 72 to 90 for display text and part numbers.
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});
