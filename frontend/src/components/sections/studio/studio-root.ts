import { archivo, jetbrainsMono } from "@/components/sections/datasheet/fonts";
import "@/components/sections/shared/datasheet-base.css";
import "./studio.css";

/** Root class of the studio: the datasheet scope (.vs) plus the Archivo and JetBrains Mono variables. */
export const STUDIO_ROOT = `vs ${archivo.variable} ${jetbrainsMono.variable}`;
