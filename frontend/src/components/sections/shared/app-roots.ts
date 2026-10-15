import { archivo, jetbrainsMono } from "@/components/sections/datasheet/fonts";
import "./datasheet-base.css";
import "./app-pages.css";

const FACES = `${archivo.variable} ${jetbrainsMono.variable}`;

/** Root class of /try: the datasheet scope (.vt) plus the Archivo and JetBrains Mono variables. */
export const TRY_ROOT = `vt ${FACES}`;

/** Root class of /results: the datasheet scope (.vr) plus the Archivo and JetBrains Mono variables. */
export const RESULTS_ROOT = `vr ${FACES}`;

/** Root class of the 404 page: the datasheet scope (.vn) plus the Archivo and JetBrains Mono variables. */
export const NOT_FOUND_ROOT = `vn ${FACES}`;
