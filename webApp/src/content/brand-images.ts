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

// `discipline` llega como etiqueta ("Astrología") o, tras el bloque B, como clave ("astrologia"):
// se compara por raíz, sin tildes ni mayúsculas, así que sirve para las dos.
const BY_DISCIPLINE: ReadonlyArray<[root: string, image: BrandImage]> = [
  ["tarot", BRAND.tarotArcanos],
  ["astrolog", BRAND.cartaAstralDorada],
  ["constelac", BRAND.libroConstelaciones],
  ["magia", BRAND.escritorioAstrologico],
  ["gemo", BRAND.minerales],
  ["simbol", BRAND.cartaAstralAzul],
  ["lunar", BRAND.libroConstelaciones],
];

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Imagen de muestra de un curso sin portada propia. */
export function brandImageForDiscipline(discipline: string | null | undefined): BrandImage {
  const d = normalize(discipline ?? "");
  const hit = d ? BY_DISCIPLINE.find(([root]) => d.includes(root)) : undefined;
  return hit ? hit[1] : BRAND.libroEstelar;
}
