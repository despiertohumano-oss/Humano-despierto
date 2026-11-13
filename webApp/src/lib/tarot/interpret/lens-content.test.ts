import { describe, expect, it } from "vitest";
import cards from "../data/cards.json";
import lenses from "../data/lenses.json";
import { LENSES } from "./lenses";

type Entry = Record<string, string>;
const data = lenses as Record<string, Entry>;
const grupos: Record<string, (c: { arcano: string; palo: string | null }) => boolean> = {
  mayores: (c) => c.arcano === "mayor",
  bastos: (c) => c.palo === "bastos",
  copas: (c) => c.palo === "copas",
  espadas: (c) => c.palo === "espadas",
  oros: (c) => c.palo === "oros",
};
const MAYUSCULA = /^[A-ZÁÉÍÓÚÑ¡¿]/u;
const ARTICULO = /^(El|La|Los|Las|Un|Una|Este|Esta)\b/u;

describe("lenses.json", () => {
  for (const [g, f] of Object.entries(grupos)) {
    it(`${g}: cada carta trae las 11 lentes con su fuente`, () => {
      for (const c of cards.filter(f)) {
        const e = data[c.id];
        expect(e, c.id).toBeDefined();
        expect(e!.fuente, c.id).toBe((c as { fuente: string }).fuente);
        for (const l of LENSES) {
          const t = e![l] ?? "";
          expect(t.length, `${c.id}.${l}`).toBeGreaterThanOrEqual(60);
          expect(t.length, `${c.id}.${l}`).toBeLessThanOrEqual(260);
          expect(t, `${c.id}.${l}`).toMatch(MAYUSCULA);
          expect(t, `${c.id}.${l}`).not.toMatch(ARTICULO);
          expect(t.toLowerCase(), `${c.id}.${l}`).not.toContain(c.nombre_es.toLowerCase());
        }
      }
    });
  }
});
