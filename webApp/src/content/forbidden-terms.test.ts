import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Barrido de la spec de contenidos (2026-11-08): la dueña no enseña herbolaria ni reiki, no hay
// «oficios» y no se promete acceso ilimitado ni certificado como regla general. Los tests que
// prueban su ausencia quedan fuera: citan los términos a propósito.
const BANNED =
  /herbolar|herborist|reiki|\boficios\b|sin vencimiento|acceso ilimitado|queda tu certificado|certificado con tu nombre|m[aá]scara de la esencia|\bpreguntarse\b/i;

const SRC = join(process.cwd(), "src");
const JSON_BARRIDOS = [join("lib", "astro", "data", "posiciones") + sep, join("lib", "astro", "data", "aspectos") + sep];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

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
