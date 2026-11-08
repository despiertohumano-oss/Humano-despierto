import { DISCIPLINES, isDisciplineKey, type DisciplineKey } from "@/lib/taxonomy/disciplines";

/**
 * Imágenes de marca generadas por la dueña con IA y cedidas a la escuela (public/brand/CREDITS.md).
 * Locales: pasan por `next/image` sin host remoto. `alt` describe lo que se ve; quien la usa como
 * fondo decorativo junto a texto pasa `alt=""`.
 */
export interface BrandImage {
  src: string;
  alt: string;
}

export const BRAND = {
  heroNebulosa: { src: "/brand/hero-nebulosa.webp", alt: "Nebulosa de tonos azules, violetas y dorados rodeada de estrellas" },
  heroGalaxia: { src: "/brand/hero-galaxia.webp", alt: "Galaxia en espiral sobre un mar de nubes violetas" },
  cartaAstralAzul: { src: "/brand/carta-astral-azul.webp", alt: "Carta astral en azul profundo y dorado, con el zodíaco y los planetas" },
  cartaAstralDorada: { src: "/brand/carta-astral-dorada.webp", alt: "Carta astral con anillos dorados sobre un cielo azul noche" },
  tarotArcanos: { src: "/brand/tarot-arcanos-dorados.webp", alt: "Cuatro cartas de tarot azul y oro: El Carro, Los Enamorados, la Reina de Espadas y El Colgado" },
  minerales: { src: "/brand/minerales-cuarzos.webp", alt: "Cuarzos y amatista sobre una tela negra" },
  escritorioAstrologico: { src: "/brand/escritorio-astrologico.webp", alt: "Cartas de tarot, minerales, una brújula y cartas astrales sobre una mesa de madera" },
  libroConstelaciones: { src: "/brand/libro-constelaciones.webp", alt: "Libro abierto con constelaciones y lunas doradas sobre acuarelas azules" },
  libroEstelar: { src: "/brand/libro-estelar.webp", alt: "Libro abierto con un mapa celeste que brilla sobre un fondo de estrellas" },
} as const satisfies Record<string, BrandImage>;

// Una imagen por clave de la lista cerrada (B1). Los mappers entregan la etiqueta; se acepta
// cualquiera de las dos, pero un texto libre que solo se parece a una disciplina cae en la neutra.
const BY_DISCIPLINE: Record<DisciplineKey, BrandImage> = {
  astrologia: BRAND.cartaAstralDorada,
  tarot: BRAND.tarotArcanos,
  constelaciones: BRAND.libroConstelaciones,
  magia: BRAND.escritorioAstrologico,
  gemoterapia: BRAND.minerales,
  simbologia: BRAND.cartaAstralAzul,
  "talleres-lunares": BRAND.libroConstelaciones,
};

/** Imagen de muestra de un curso sin portada propia. */
export function brandImageForDiscipline(discipline: string | null | undefined): BrandImage {
  if (!discipline) return BRAND.libroEstelar;
  const key = isDisciplineKey(discipline) ? discipline : DISCIPLINES.find((d) => d.label === discipline)?.key;
  return key ? BY_DISCIPLINE[key] : BRAND.libroEstelar;
}
