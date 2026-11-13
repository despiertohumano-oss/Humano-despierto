// Lente = el rol desde el que se lee una carta según su posición (spec T-094 §4).
export const LENSES = ["nucleo", "cruce", "raiz", "transito", "meta", "yo", "otros", "sosten", "sombra", "consejo", "leccion"] as const;
export type Lens = (typeof LENSES)[number];

export const LENS_LABEL: Record<Lens, string> = {
  nucleo: "el centro",
  cruce: "lo que te cruza",
  raiz: "la raíz",
  transito: "lo que viene",
  meta: "lo que buscás",
  yo: "vos",
  otros: "tu entorno",
  sosten: "lo que te sostiene",
  sombra: "lo que temés",
  consejo: "el consejo",
  leccion: "la lección",
};
