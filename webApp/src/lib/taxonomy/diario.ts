// Categorías del Diario (spec 2026-11-08 §B3, etiquetas literales de la dueña). Espejo del CHECK
// `diario_posts_category_no_locator` de la migración 0075; `diario.test.ts` lee la migración y
// falla si difieren.
export const DIARIO_CATEGORIES = [
  { key: "astrologia", label: "Astrología" },
  { key: "tarot-arquetipos", label: "Tarot y arquetipos" },
  { key: "gemoterapia", label: "Gemoterapia y minerales" },
  { key: "simbologia", label: "Simbología y símbolos de poder" },
  { key: "ciclos-lunares", label: "Ciclos lunares" },
  { key: "conciencia", label: "Conciencia y transformación personal" },
] as const;

export type DiarioCategoryKey = (typeof DIARIO_CATEGORIES)[number]["key"];

export const DIARIO_CATEGORY_KEYS = DIARIO_CATEGORIES.map((c) => c.key) as [DiarioCategoryKey, ...DiarioCategoryKey[]];

export function isDiarioCategory(value: string): value is DiarioCategoryKey {
  return (DIARIO_CATEGORY_KEYS as readonly string[]).includes(value);
}

export function diarioCategoryLabel(key: string): string {
  return DIARIO_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
