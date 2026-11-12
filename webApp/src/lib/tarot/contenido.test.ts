// webApp/src/lib/tarot/contenido.test.ts
import { describe, expect, it } from "vitest";
import raw from "./data/cards.json";
import { loadFuente } from "./fuente-schema";

type Raw = { indice: number; id: string; arcano: string; palo: string | null; numero: number; fuente?: string; en_equilibrio?: string; en_desequilibrio?: string; reflexion?: string[] };
const cards = raw as Raw[];

const NUM_A_FUENTE: Record<number, string> = { 11: "sota", 12: "caballo", 13: "reina", 14: "rey" };

function fuenteEsperada(c: Raw): string {
  if (c.arcano === "mayor") return `mayores#${c.numero}`;
  return `${c.palo}#${NUM_A_FUENTE[c.numero] ?? c.numero}`;
}

describe("capa 2 -> capa 1", () => {
  const grupos = { mayores: cards.filter((c) => c.arcano === "mayor"), bastos: cards.filter((c) => c.palo === "bastos"), copas: cards.filter((c) => c.palo === "copas"), espadas: cards.filter((c) => c.palo === "espadas"), oros: cards.filter((c) => c.palo === "oros") };

  for (const [grupo, lista] of Object.entries(grupos)) {
    it(`${grupo}: cada carta apunta a su entrada de la fuente`, () => {
      for (const c of lista) expect(c.fuente, c.id).toBe(fuenteEsperada(c));
    });
    it(`${grupo}: trae en_equilibrio, en_desequilibrio y 2-3 preguntas de reflexión`, () => {
      for (const c of lista) {
        expect(c.en_equilibrio?.length ?? 0, c.id).toBeGreaterThanOrEqual(80);
        expect(c.en_desequilibrio?.length ?? 0, c.id).toBeGreaterThanOrEqual(80);
        expect(c.reflexion?.length ?? 0, c.id).toBeGreaterThanOrEqual(2);
        expect(c.reflexion?.length ?? 0, c.id).toBeLessThanOrEqual(3);
        for (const q of c.reflexion ?? []) expect(q, c.id).toMatch(/^¿.+\?$/);
      }
    });
  }

  it("las referencias resuelven en la fuente", () => {
    const mayores = loadFuente("mayores");
    for (const c of grupos.mayores) expect(mayores.some((m) => `mayores#${m.numero}` === c.fuente)).toBe(true);
    for (const p of ["bastos", "copas", "espadas", "oros"] as const) {
      const f = loadFuente(`menores-${p}`);
      for (const c of grupos[p]) expect(f.cartas.some((m) => `${p}#${NUM_A_FUENTE[m.numero] ?? m.numero}` === c.fuente), c.id).toBe(true);
    }
  });
});
