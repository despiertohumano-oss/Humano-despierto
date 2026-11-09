// `courses.level` es texto libre sin CHECK (Q-05). `courses.discipline` YA NO: desde B1 (migración
// 0073) es una clave de `src/lib/taxonomy/disciplines.ts`; estas dos funciones quedan para el nivel.
// Normalizar por casing/espacios (T-019) solo evita que "Inicial" e "inicial" partan un filtro en dos;
// NO unifica sinónimos como "Iniciacion" vs "Inicial": eso sería inventar la taxonomía.
export function normalizeTaxonomyKey(value: string): string {
  return value.trim().toLowerCase();
}

// Label determinística a partir de la key normalizada (no de "la primera fila que llegó"), para que
// dos requests no puedan mostrar dos mayúsculas distintas para el mismo filtro.
export function taxonomyLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export type DurationBucketKey = "corto" | "medio" | "largo";

export const DURATION_BUCKETS: { key: DurationBucketKey; label: string }[] = [
  { key: "corto", label: "Hasta 2 h" },
  { key: "medio", label: "2 a 5 h" },
  { key: "largo", label: "Más de 5 h" },
];

// Buckets fijos de contenido total (reemplazo de `duration_weeks`, eliminada por ADR-004/T-001:
// el agregado de `lessons.duration_seconds` es el único dato real). Los límites son producto, no
// dato — lo que sale de la base es el CONTEO en cada bucket, no el bucket en sí.
export function bucketForDurationSeconds(totalSeconds: number): DurationBucketKey {
  if (totalSeconds < 2 * 3600) return "corto";
  if (totalSeconds < 5 * 3600) return "medio";
  return "largo";
}
