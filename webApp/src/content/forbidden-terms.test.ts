import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Barrido de la spec de contenidos (2026-11-08): la dueña no enseña herbolaria ni reiki, no hay
// «oficios» y no se promete acceso ilimitado ni certificado como regla general. Los tests que
// prueban su ausencia quedan fuera: citan los términos a propósito.
const BANNED =
  /herbolar|herborist|reiki|\boficios\b|sin vencimiento|acceso ilimitado|queda tu certificado|certificado con tu nombre|m[aá]scara de la esencia|\bpreguntarse\b/i;

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

describe("barrido de términos prohibidos en src/", () => {
  const files = walk(SRC).filter(
    (f) => /\.(ts|tsx|css|md)$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f) && !f.includes(`${sep}test${sep}`),
  );

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
