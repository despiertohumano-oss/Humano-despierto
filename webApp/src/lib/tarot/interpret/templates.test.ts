import { describe, expect, it } from "vitest";
import templates from "../data/templates.json";

const T = templates as Record<string, unknown>;
const TIPOS = ["si_no", "cuando", "que_hacer", "el_otro", "como_sale", "general"];
const BAL = ["favorable", "abierta", "desfavorable"];

const HOJAS: [string, string[]][] = [
  ["idea_inicio", ["A", "clave"]],
  ["idea_paso", ["a", "clave"]],
  ["idea_fin", ["a", "clave"]],
  ["posicion_lente", ["nombre", "Nombre", "posicion", "texto", "texto_min"]],
  ...["pleno", "en_proceso", "trabada"].map((k) => [`estado.${k}`, ["nombre", "texto"]] as [string, string[]]),
  ...Array.from({ length: 10 }, (_, i) => [`patron_numero.${i + 1}`, ["cartas"]] as [string, string[]]),
  ["progresion.avanza", []],
  ["progresion.retrocede", []],
  ["gente", ["cartas"]],
  ["facetas", ["cartas"]],
  ["dominante", ["nombre", "Nombre", "posicion", "claves"]],
  ...["intensifica", "refuerza", "debilita", "neutral"].map((k) => [`tension.${k}`, ["A", "b", "la", "lb"]] as [string, string[]]),
  ...TIPOS.flatMap((t) => BAL.map((b) => [`respuesta.${t}.${b}`, t === "el_otro" ? ["pregunta", "cartas", "dominante", "rol"] : ["pregunta", "cartas", "dominante"]] as [string, string[]])),
  ...(["camino.parejo", "camino.continua", "camino.cambio", "relaciones.parejo", "relaciones.a", "relaciones.b"].map((k) => [`respuesta_contraste.${k}`, ["pregunta", "cartas_a", "cartas_b", "dominante"]] as [string, string[]])),
  ["respuesta_dominante.yo", []],
  ["respuesta_dominante.otros", []],
  ["tension_estado.trabada", ["A", "b"]],
  ["tension_estado.en_proceso", ["A", "b"]],
  ["consejo", ["consejo"]],
  ["grupo", ["claves"]],
  ["resolucion", ["nombre", "Nombre", "posicion", "texto", "texto_min"]],
];

const get = (path: string) => path.split(".").reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], T);

describe("plantillas de T-094", () => {
  for (const [path, allowed] of HOJAS) {
    it(`${path}: ≥ 3 variantes y solo {${allowed.join(",")}}`, () => {
      const v = get(path) as string[];
      expect(Array.isArray(v), path).toBe(true);
      expect(v.length).toBeGreaterThanOrEqual(3);
      for (const s of v) for (const m of s.matchAll(/\{(\w+)\}/g)) expect(allowed, `${path}: ${s}`).toContain(m[1]);
    });
  }
  it("toda respuesta retoma la pregunta", () => {
    for (const t of TIPOS) for (const b of BAL) for (const s of get(`respuesta.${t}.${b}`) as string[]) expect(s, `${t}.${b}`).toContain("{pregunta}");
  });
  it("respuesta_contraste retoma la pregunta, nombra los dos lados y no ordena", () => {
    for (const k of ["camino", "relaciones"]) {
      for (const [w, vs] of Object.entries(get(`respuesta_contraste.${k}`) as Record<string, string[]>)) {
        for (const s of vs) {
          for (const m of ["{pregunta}", "{cartas_a}", "{cartas_b}", "{dominante}"]) expect(s, `${k}.${w}`).toContain(m);
          expect(s, `${k}.${w}`).not.toMatch(/\b(ten[eé]s que|deb[eé]s|deber[ií]as|hay que)\b/i);
          expect(s.trimStart().startsWith("{dominante}"), `${k}.${w}`).toBe(false);
        }
      }
    }
  });
  it("respuesta.cuando nunca promete fechas", () => {
    for (const b of BAL) for (const s of get(`respuesta.cuando.${b}`) as string[]) expect(s).not.toMatch(/\b(d[ií]as?|semanas?|mes(es)?|años?|pronto)\b/i);
  });
});
