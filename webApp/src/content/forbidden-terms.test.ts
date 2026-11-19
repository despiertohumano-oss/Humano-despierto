import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_TERMS } from "./forbidden-terms";

// Barrido de la spec de contenidos (2026-11-08): la dueña no enseña herbolaria ni reiki, no hay
// «oficios» y no se promete acceso ilimitado ni certificado como regla general. Los tests que
// prueban su ausencia quedan fuera: citan los términos a propósito.
const BANNED = FORBIDDEN_TERMS;

// La lista literal: si alguien afloja FORBIDDEN_TERMS, este test lo nota. guard.test.ts usa la misma.
const LITERALES = ["herbolaria", "herboristas", "reiki", "oficios", "sin vencimiento", "acceso ilimitado", "queda tu certificado", "certificado con tu nombre", "máscara de la esencia", "mascara de la esencia", "preguntarse"];

const SRC = join(process.cwd(), "src");
const JSON_BARRIDOS = [join("lib", "astro", "data", "posiciones") + sep, join("lib", "astro", "data", "aspectos") + sep];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

describe("lista de términos prohibidos", () => {
  it.each(LITERALES)("atrapa «%s»", (t) => {
    expect(FORBIDDEN_TERMS.test(`un texto con ${t} adentro`)).toBe(true);
  });

  it("no atrapa palabras parecidas", () => {
    expect(FORBIDDEN_TERMS.test("un oficio, la pregunta, un certificado")).toBe(false);
  });
});

describe("barrido de términos prohibidos en src/", () => {
  // De los .json solo se barren los textos por posición (T-101) y por aspecto (T-102) de la carta: `lib/astro/data/templates.json:354`
  // dice «preguntarse» desde antes y queda fuera hasta que lo revise su ticket.
  const files = walk(SRC).filter(
    (f) =>
      (/\.(ts|tsx|css|md)$/.test(f) || (f.endsWith(".json") && JSON_BARRIDOS.some((d) => f.includes(d)))) &&
      !/\.(test|spec)\.tsx?$/.test(f) &&
      !f.includes(`${sep}test${sep}`),
  );

  it("barre los textos por posición y por aspecto de la carta", () => {
    const json = files.filter((f) => f.endsWith(".json"));
    expect(json).toHaveLength(11);
    expect(json.some((f) => f.endsWith(join("aspectos", "pluton.json")))).toBe(true);
  });

  it("hay archivos para barrer", () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it("ninguno contiene un término prohibido", () => {
    const hits = files.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => ({ f: f.replace(SRC, "src"), line: i + 1, text: line.trim() }))
        .filter((l) => BANNED.test(l.text)),
    );
    expect(hits).toEqual([]);
  });
});
