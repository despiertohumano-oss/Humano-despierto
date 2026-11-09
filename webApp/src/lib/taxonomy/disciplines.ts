// Lista cerrada de disciplinas (spec 2026-11-08 §B1). Espejo del CHECK `courses_discipline_closed`
// de la migración 0073: `disciplines.test.ts` lee la migración y falla si difieren.
export const DISCIPLINES = [
  { key: "astrologia", label: "Astrología" },
  { key: "tarot", label: "Tarot" },
  { key: "constelaciones", label: "Constelaciones familiares" },
  { key: "magia", label: "Magia" },
  { key: "gemoterapia", label: "Gemoterapia" },
  { key: "simbologia", label: "Simbología y símbolos de poder" },
  { key: "talleres-lunares", label: "Talleres lunares" },
] as const;

export type DisciplineKey = (typeof DISCIPLINES)[number]["key"];

export const DISCIPLINE_KEYS = DISCIPLINES.map((d) => d.key) as [DisciplineKey, ...DisciplineKey[]];

export function isDisciplineKey(value: string): value is DisciplineKey {
  return (DISCIPLINE_KEYS as readonly string[]).includes(value);
}

export function disciplineLabel(key: string): string {
  return DISCIPLINES.find((d) => d.key === key)?.label ?? key;
}
