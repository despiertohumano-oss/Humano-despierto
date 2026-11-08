/**
 * PLACEHOLDER (ADR-015) · Fotos de Unsplash verificadas a mano, una por una, en
 * `design_handoff_humano_humano/reference/brote/README.md`. Lista cerrada: una foto nueva se mira
 * antes de entrar y su `alt` dice lo que se ve. Prohibida la 1469474968028-56623f02e42e (es la de
 * somosbuenavida.com). Sin retratos: una foto de stock de una persona junto al nombre de una
 * docente real le atribuiría una cara ajena (decisión 3 del PO, QA T-060 D1).
 *
 * Desde 2026-11-08 sólo quedan las dos del costado de las pantallas de acceso (`auth-aside.ts`):
 * el hero, «Nuestra mirada» y las portadas de ejemplo usan `brand-images.ts`.
 */

export type PhotoUse = "fondo";

export interface PlaceholderPhoto {
  id: string;
  alt: string;
  use: PhotoUse;
}

export const PLACEHOLDER_PHOTOS = [
  { id: "1441974231531-c6227db76b6e", alt: "Sendero en un bosque con luz de sol entre los árboles", use: "fondo" },
  { id: "1470252649378-9c29740c9fa8", alt: "Sol saliendo sobre un prado con niebla", use: "fondo" },
] as const satisfies readonly PlaceholderPhoto[];

/** Sin query: el ancho y la calidad los pone `next/image` al pasar por el optimizador. */
export function unsplashUrl(id: string): string {
  return `https://images.unsplash.com/photo-${id}`;
}
