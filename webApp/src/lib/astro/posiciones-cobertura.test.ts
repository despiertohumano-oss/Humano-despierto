import { describe, expect, it } from "vitest";
import { POSICIONES } from "./posiciones";
import { HOUSE_KEYS } from "./prose";
import { PLANET_IDS, SIGN_IDS } from "./zodiac";

// Reglas 3 y 4 del plan T-101: reflexión sin predicción y sin la jerga del material original.
const PROHIBIDOS =
  /enfermedad|enferm[oa]|\bsalud\b|muerte|\bmorir\b|accident|viudez|matrimonio|divorcio|herencia|c[aá]rcel|\bvicios?\b|karma|vidas? pasadas?|\bvas a\b|\bnativ[oa]s?\b|afligid|aspectad|mal[eé]fic|\bviril|\bla mujer\b/i;

const entradas = PLANET_IDS.flatMap((p) => [
  ...SIGN_IDS.map((s) => ({ id: `${p}/signo/${s}`, e: POSICIONES[p].en_signo[s] })),
  ...HOUSE_KEYS.map((h) => ({ id: `${p}/casa/${h}`, e: POSICIONES[p].en_casa[h] })),
]);

describe("cobertura de posiciones (T-101)", () => {
  it("existen las 240 entradas con texto, luz y sombra", () => {
    expect(entradas).toHaveLength(240);
    const faltan = entradas.filter(({ e }) => !e?.texto || !e.luz || !e.sombra).map(({ id }) => id);
    expect(faltan).toEqual([]);
  });

  it("ningún texto usa términos prohibidos", () => {
    const hits = entradas.flatMap(({ id, e }) =>
      [e?.texto, e?.luz, e?.sombra].filter((t): t is string => !!t && PROHIBIDOS.test(t)).map((t) => `${id}: ${t.match(PROHIBIDOS)![0]}`),
    );
    expect(hits).toEqual([]);
  });

  it("ningún texto está duplicado", () => {
    const todos = entradas.flatMap(({ e }) => (e ? [e.texto, e.luz, e.sombra] : []));
    expect(todos.length).toBe(720);
    expect(new Set(todos).size).toBe(todos.length);
  });
});
