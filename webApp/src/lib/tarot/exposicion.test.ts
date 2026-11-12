import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";
import suits from "./data/suits.json";
import spreads from "./data/spreads.json";
import templates from "./data/templates.json";

// D2: el método de la dueña alimenta la lectura pero no se nombra. Este test cita los términos a propósito.
const METODO = /m[aá]scara de la esencia|\bdesequilibrio:|\bequilibrio:|\bpreguntarse\b|waite no cita/i;

// D4: la invertida es el mismo tema atenuado; estos pares opuestos no pueden aparecer derecha -> invertida.
const OPUESTOS: [RegExp, RegExp][] = [
  [/éxito|triunfo|logro/i, /fracaso|derrota|pérdida total/i],
  [/amor|unión/i, /odio|desamor|separación definitiva/i],
  [/abundancia|prosperidad/i, /ruina|miseria/i],
  [/alegría|felicidad/i, /desgracia|tragedia/i],
  [/salud|curación/i, /enfermedad grave|muerte/i],
];

describe("no exposición del método (D2)", () => {
  it("ningún texto de datos lo nombra", () => {
    const blob = JSON.stringify([CARDS, suits, spreads, templates]);
    expect(blob.match(METODO)).toBeNull();
  });

  it("nada fuera de los tests importa la fuente", () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const offenders = walk(join(process.cwd(), "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.endsWith("fuente-schema.ts"))
      .filter((f) => /fuente-schema|docs\/TAROT/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("invertidas atenuadas (D4)", () => {
  it("ninguna invertida usa el opuesto de su derecha", () => {
    const hits: string[] = [];
    for (const c of CARDS) {
      const der = c.palabras_clave_derecha.join(" ");
      const inv = c.palabras_clave_invertida.join(" ") + " " + c.significado_invertida;
      for (const [a, b] of OPUESTOS) if (a.test(der) && b.test(inv)) hits.push(c.id);
    }
    expect(hits).toEqual([]);
  });
});
