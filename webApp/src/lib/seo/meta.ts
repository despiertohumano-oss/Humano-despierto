import type { Card } from "@/lib/tarot/cards";
import { CARD_IMAGE_SIZES } from "@/lib/tarot/image-sizes";
import { SITE_OG_IMAGE } from "@/lib/og/site";

export const SITE_NAME = "Humano Despierto";
export const SITE_LOCALE = "es_AR";
export const SITE_DEFAULT_TITLE = "Humano Despierto — Escuela online de astrología, tarot y autoconocimiento";
export const SITE_DEFAULT_DESCRIPTION =
  "Escuela online de astrología, tarot y autoconocimiento: cursos con docentes, tarot online gratis y carta natal para estudiar a tu ritmo.";

export const DESCRIPTION_MAX = 160;
export const DESCRIPTION_MIN = 70;
// 60 caracteres en la SERP contando el sufijo " — Humano Despierto" del template de la raíz.
export const TITLE_MAX = 60;
export const TITLE_SUFFIX = ` — ${SITE_NAME}`;
export const TITLE_PART_MAX = TITLE_MAX - TITLE_SUFFIX.length;

/** El primer candidato que entra en el template; si ninguno entra, el último (el más corto). */
export function fitTitle(...candidates: string[]): string {
  return candidates.find((c) => c.length <= TITLE_PART_MAX) ?? candidates[candidates.length - 1]!;
}

/** Corta en un límite de palabra, sin dejar puntuación colgando, y cierra con punto. */
export function trimAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const room = text.slice(0, max - 1);
  const cut = room.lastIndexOf(" ");
  return `${room.slice(0, cut > 0 ? cut : room.length).replace(/[\s,;:.\-–—(]+$/, "")}.`;
}

type OpenGraphInput = {
  title: string;
  description?: string;
  url: string;
  type?: "website" | "article" | "profile";
  images?: readonly { url: string; width?: number; height?: number; alt?: string }[];
};

/** Un `openGraph` propio reemplaza entero el de la raíz: por eso siteName y locale van acá también. */
export function pageOpenGraph({ title, description, url, type = "website", images = [SITE_OG_IMAGE] }: OpenGraphInput) {
  return { title, description, url, type, siteName: SITE_NAME, locale: SITE_LOCALE, images: [...images] };
}

const KEYWORD_STEPS: readonly (readonly [number, number])[] = [[4, 3], [3, 3], [3, 2], [2, 2], [2, 1], [1, 1]];

export function cardTitle(card: Pick<Card, "nombre_es">): string {
  return fitTitle(`${card.nombre_es}: significado en el tarot`, `${card.nombre_es} en el tarot`, card.nombre_es);
}

export function cardDescription(card: Pick<Card, "nombre_es" | "nombre_en" | "palabras_clave_derecha" | "palabras_clave_invertida">): string {
  const build = (r: number, i: number) =>
    `${card.nombre_es} (${card.nombre_en}) al derecho: ${card.palabras_clave_derecha.slice(0, r).join(", ")}. Invertida: ${card.palabras_clave_invertida.slice(0, i).join(", ")}.`;
  for (const [r, i] of KEYWORD_STEPS) {
    const d = build(r, i);
    if (d.length <= DESCRIPTION_MAX) return d;
  }
  return trimAtWord(build(1, 1), DESCRIPTION_MAX);
}

export function cardImageAlt(card: Pick<Card, "nombre_es" | "arcano">): string {
  return `${card.nombre_es}, arcano ${card.arcano} del tarot`;
}

/** La imagen real de la carta, con su tamaño: la OG de cada ficha ya no es la genérica del sitio. */
export function cardOgImage(card: Pick<Card, "id" | "nombre_es" | "arcano">) {
  const size = CARD_IMAGE_SIZES[card.id];
  return { url: `/tarot/rws/${card.id}.webp`, ...(size ? { width: size[0], height: size[1] } : {}), alt: cardImageAlt(card) };
}

export function spreadTitle(nombre: string): string {
  return fitTitle(`${nombre}: tirada de tarot online`, `${nombre}: tarot online`, nombre);
}

export function fichaTitle(nombre: string): string {
  return fitTitle(`${nombre} en la carta natal: significado`, `${nombre} en la carta natal`, nombre);
}

const lista = (items: readonly string[]) => items.join(", ");

export function signDescription(nombre: string, palabras: readonly string[], elemento: string, modalidad: string): string {
  return trimAtWord(
    `Qué significa ${nombre} en la carta natal: ${lista(palabras)}. Signo de ${elemento}, ${modalidad}, y cómo se vive en cada casa.`,
    DESCRIPTION_MAX,
  );
}

export function bodyDescription(nombre: string, palabras: readonly string[]): string {
  return trimAtWord(`Qué significa ${nombre} en la carta natal: ${lista(palabras)}. Cómo se expresa en cada signo y en cada casa.`, DESCRIPTION_MAX);
}

export function houseDescription(nombre: string, palabras: readonly string[]): string {
  return trimAtWord(`Qué significa la ${nombre.toLowerCase()} en la carta natal: ${lista(palabras)}. Qué áreas de la vida ordena y cómo leerla.`, DESCRIPTION_MAX);
}

export function posicionTitle(nombre: string): string {
  return fitTitle(`${nombre}: significado en la carta natal`, `${nombre}: significado`, nombre);
}

const PALABRAS_SUELTAS = /\s+(y|o|de|del|que|no|la|el|en|con|un|una|a|e|u|se|su|al|los|las|por|para|como|es)$/iu;

/** Oraciones completas del texto que entren; si no alcanzan el mínimo, la siguiente recortada y cerrada con “…”. */
export function posicionDescription(texto: string): string {
  const oraciones = texto.match(/[^.!?]+[.!?]+(?=\s|$)/g)?.map((o) => o.trim()) ?? [texto];
  let d = "";
  let i = 0;
  while (i < oraciones.length && `${d} ${oraciones[i]}`.trim().length <= DESCRIPTION_MAX) {
    d = `${d} ${oraciones[i]}`.trim();
    i++;
  }
  if (d.length >= DESCRIPTION_MIN) return d;
  const resto = oraciones[i] ?? "";
  const room = DESCRIPTION_MAX - (d ? d.length + 1 : 0) - 1;
  let corte = resto.slice(0, room);
  corte = corte.slice(0, Math.max(corte.lastIndexOf(" "), 0) || corte.length).replace(/[\s,;:.\-–—(]+$/, "");
  while (PALABRAS_SUELTAS.test(corte)) corte = corte.replace(PALABRAS_SUELTAS, "");
  return `${d ? `${d} ` : ""}${corte}…`;
}
