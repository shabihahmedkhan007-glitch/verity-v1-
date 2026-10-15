import { Archivo, JetBrains_Mono } from "next/font/google";

// The datasheet faces. The variables are also defined on <html> (for portaled tooltips), but only the datasheet
// roots (.ds, .vs, .vt, .vr) use them, so the rest of the app keeps Atkinson.
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
