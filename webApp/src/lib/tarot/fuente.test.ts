import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FUENTE_DIR, fuenteSchemas, loadFuente, type FuenteName } from "./fuente-schema";

describe("capa 1: docs/TAROT/fuente", () => {
  for (const name of Object.keys(fuenteSchemas) as FuenteName[]) {
    it(`${name}.json existe y respeta su forma`, () => {
      expect(existsSync(join(FUENTE_DIR, `${name}.json`))).toBe(true);
      expect(() => loadFuente(name)).not.toThrow();
    });
  }

  it("los mayores van del 0 al 21 sin huecos", () => {
    expect(loadFuente("mayores").map((m) => m.numero)).toEqual([...Array(22).keys()]);
  });

  it("cada palo trae sus 14 cartas del 1 al 14", () => {
    for (const p of ["bastos", "copas", "espadas", "oros"] as const) {
      const nums = loadFuente(`menores-${p}`).cartas.map((c) => c.numero).sort((a, b) => a - b);
      expect(nums, p).toEqual([...Array(14).keys()].map((i) => i + 1));
    }
  });

  it("las posiciones de cada tirada van de 1 a N sin huecos", () => {
    for (const t of loadFuente("tiradas").tiradas) {
      expect(t.posiciones.map((p) => p.n), t.clave).toEqual(t.posiciones.map((_, i) => i + 1));
    }
  });
});
