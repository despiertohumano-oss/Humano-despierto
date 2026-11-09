import type { AspectId } from "@/lib/astro/aspects";
import type { BodyId, SignId } from "@/lib/astro/zodiac";
import { cn } from "@/lib/utils/cn";

/** Íconos de línea (ADR-015): reemplazan a los glifos Unicode donde eran ícono. Siempre
 *  `aria-hidden`: el significado lo lleva el texto de al lado (visible o `.sr-only`). */
const PATHS = {
  "arrow-right": "M3 8h10M9 4l4 4-4 4",
  "arrow-up": "M8 13V3M3 8l5-5 5 5",
  "arrow-left": "M13 8H3M7 4L3 8l4 4",
  download: "M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10",
  "chevron-down": "M4 6l4 4 4-4",
  check: "M3 8.5l3 3 7-7",
  circle: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z",
  play: "M5.5 3.5v9l7-4.5z",
  menu: "M2 4h12M2 8h12M2 12h12",
  close: "M3.5 3.5l9 9M12.5 3.5l-9 9",
  bookmark: "M4 2.5h8v11l-4-3-4 3z",
  lock: "M4.5 7.5h7v6h-7zM5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2",
  eye: "M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8zM8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z",
  leaf: "M8 14.5V7M8 9.5C4.5 9.5 3 7.5 3 4c3.5 0 5 2 5 5.5zM8 7c0-3 2-4.5 5-4.5 0 3-2 4.5-5 4.5z",
  star: "M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z",
  "play-circle": "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM6.8 5.6v4.8l3.8-2.4z",
  file: "M4 1.5h5.5l3 3v10h-8.5zM9.5 1.5v3h3",
  chat: "M2 3h12v8H6.5L2 14z",
  notes: "M3.5 2h9v12h-9zM6 5.5h4M6 8h4M6 10.5h2",
  award: "M8 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 9.2L5 14.5l3-1.5 3 1.5-1-5.3",
  plus: "M8 2.5v11M2.5 8h11",
  search: "M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.4 10.4l3.1 3.1",
} as const;

/** D-7: símbolos astrológicos tradicionales (dominio público) dibujados acá con rectas, curvas y
 *  arcos, no tomados de una fuente; D-63 sigue prohibiendo el carácter Unicode. Las claves son los
 *  ids del motor (`zodiac.ts`, `aspects.ts`); el `satisfies` rompe el build si falta o sobra uno. */
export type AstroGlyphId = SignId | BodyId | "nodo_sur" | AspectId;

const ASTRO_PATHS = {
  // Signos
  aries: "M8 14V6.5C8 3.8 6.6 2 4.8 2 3.2 2 2 3.2 2 4.7c0 1.2.9 2.1 2 2.1M8 6.5C8 3.8 9.4 2 11.2 2 12.8 2 14 3.2 14 4.7c0 1.2-.9 2.1-2 2.1",
  tauro: "M8 6.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5zM2.5 2c0 2.6 2.5 4.5 5.5 4.5s5.5-1.9 5.5-4.5",
  geminis: "M3 2.5c3.3 1 6.7 1 10 0M3 13.5c3.3-1 6.7-1 10 0M5.5 3.2v9.6M10.5 3.2v9.6",
  cancer: "M6.3 5.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM4.5 3.7C7.5 2.4 11.2 2.8 13.5 5M13.3 10.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM11.5 12.3C8.5 13.6 4.8 13.2 2.5 11",
  leo: "M6.5 10.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM6.3 9.6C5.4 7.6 5 6.1 5 4.9 5 3.3 6.3 2 8 2s3 1.3 3 2.9c0 2.2-2 4.2-2 6.6 0 1.5 1 2.5 2.3 2.5 1 0 1.7-.6 2-1.4",
  virgo: "M2 4c1-.7 2-.3 2 .9V13M4 4.9C4 3.9 4.7 3 5.75 3S7.5 3.9 7.5 4.9V13M7.5 4.9C7.5 3.9 8.2 3 9.25 3S11 3.9 11 4.9v5.6c0 1.9.9 3 2.5 3.5M11 10.3c1.3-1.7 3-1.8 3-.4 0 1.3-1.4 2.6-3.6 3.3",
  libra: "M2 13.5h12M2 10.5h3.6C4.5 9.6 4 8.5 4 7.3 4 5.2 5.8 3.5 8 3.5s4 1.7 4 3.8c0 1.2-.5 2.3-1.6 3.2H14",
  escorpio: "M2 4c1-.7 2-.3 2 .9V12M4 4.9C4 3.9 4.7 3 5.75 3S7.5 3.9 7.5 4.9V12M7.5 4.9C7.5 3.9 8.2 3 9.25 3S11 3.9 11 4.9V12c0 .9.6 1.5 1.5 1.5H14M12.5 12l1.5 1.5-1.5 1.5",
  sagitario: "M3 13L13 3M8 3h5v5M4.5 8l3.5 3.5",
  capricornio: "M2 3.5l2.2 2v7.5M4.2 5.5C4.7 4 5.7 3.5 6.7 3.5 8 3.5 8.7 4.5 8.7 6v6.5c0 .8.6 1.5 1.6 1.5h.4a2.1 2.1 0 1 0-1.9-3.1",
  acuario: "M2 7l2-2 2 2 2-2 2 2 2-2 2 2M2 11.5l2-2 2 2 2-2 2 2 2-2 2 2",
  piscis: "M3 2.5c2.2 1.5 3 3.5 3 5.5s-.8 4-3 5.5M13 2.5c-2.2 1.5-3 3.5-3 5.5s.8 4 3 5.5M2.5 8h11",
  // Cuerpos y puntos
  sol: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 8h.01",
  luna: "M5.2 2.5a5.5 5.5 0 0 1 0 11 7 7 0 0 0 0-11z",
  mercurio: "M8 4.4a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM5.2 1.5a2.8 2.8 0 0 0 5.6 0M8 10v4.5M6 12.3h4",
  venus: "M8 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM8 8.5v6M5.5 12h5",
  marte: "M6.5 5.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM9.3 6.7L14 2M10 2h4v4",
  jupiter: "M3 5.5C3 3.6 4.2 2.5 5.5 2.5S8 3.5 8 5c0 2.6-3 5-5 6.5h10M10.5 2v12",
  saturno: "M3.5 4h5M6 2v9c0-2 1.2-3 2.8-3S12 9.2 12 11c0 1.4-1.1 2.4-1.1 3.3 0 .5.4.9.9.9",
  urano: "M3 2v8M13 2v8M3 6h10M8 2v8.4M8 10.4a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z",
  neptuno: "M3 2.5c0 4 2.2 6.5 5 6.5s5-2.5 5-6.5M8 2v12.5M5.5 12h5",
  pluton: "M8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3.5 3.5a4.5 4.5 0 0 0 9 0M8 8v6.5M5.5 11.5h5",
  quiron: "M8 10.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 10.5V1.5M8 6l3.5-3.5M8 6l3.5 3.5",
  nodo_norte: "M4.5 11V7a3.5 3.5 0 0 1 7 0v4M6 12.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM13 12.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
  nodo_sur: "M4.5 5v4a3.5 3.5 0 0 0 7 0V5M6 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM13 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
  lilith_media: "M9.8 1.5a3.5 3.5 0 0 0 0 7 4.5 4.5 0 0 1 0-7zM7.6 9.5v5M5.3 12h4.6",
  // Aspectos mayores
  conjuncion: "M6 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.1 7.9L13 3",
  sextil: "M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6",
  cuadratura: "M3 3h10v10H3z",
  trigono: "M8 2.5l6 10.5H2z",
  oposicion: "M6 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM5.4 10.6l5.2-5.2",
} as const satisfies Record<AstroGlyphId, string>;

export const ASTRO_GLYPH_IDS = Object.keys(ASTRO_PATHS) as AstroGlyphId[];

export type AstroIconName = `astro-${AstroGlyphId}`;
export type IconName = keyof typeof PATHS | AstroIconName;

const ASTRO_PREFIX = "astro-";

export function astroIcon(id: AstroGlyphId): AstroIconName {
  return `${ASTRO_PREFIX}${id}`;
}

export function iconPath(name: IconName): string {
  return name.startsWith(ASTRO_PREFIX)
    ? ASTRO_PATHS[name.slice(ASTRO_PREFIX.length) as AstroGlyphId]
    : PATHS[name as keyof typeof PATHS];
}

const FILLED: ReadonlySet<IconName> = new Set(["play", "star"]);

export default function Icon({
  name,
  filled,
  className,
}: {
  name: IconName;
  /** Relleno con el color actual (estado «activo»: guardado, votado). */
  filled?: boolean;
  className?: string;
}) {
  const solid = filled ?? FILLED.has(name);
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className={cn("inline-block h-4 w-4 flex-none", className)}
      fill={solid ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={solid ? 1 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPath(name)} />
    </svg>
  );
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Un ícono DENTRO de otro `<svg>` (la rueda de la carta): `<g>` en vez de un `<svg>` anidado, que
 *  no se puede posicionar con x/y sin depender del CSS. Centrado en (x, y); `size` en unidades del
 *  svg anfitrión. Solo trazo. El nombre accesible va en un `<title>` del `<g>` que lo envuelve. */
export function SvgGlyph({
  name,
  x,
  y,
  size = 16,
  className,
}: {
  name: IconName;
  x: number;
  y: number;
  size?: number;
  className?: string;
}) {
  return (
    <g
      aria-hidden="true"
      transform={`translate(${r2(x - size / 2)} ${r2(y - size / 2)}) scale(${r2(size / 16)})`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPath(name)} />
    </g>
  );
}
