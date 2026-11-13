import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// G-03 (T-098): producción se construye con cada push a `main`; los tests unitarios son la única red.
const TOML = readFileSync(join(__dirname, "..", "..", "..", "..", "netlify.toml"), "utf8");

function buildCommand(): string {
  const match = TOML.match(/^\s*command\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error("netlify.toml sin [build].command");
  return match[1];
}

describe("netlify.toml · comando de build", () => {
  it("corre npm test antes de npm run build", () => {
    const steps = buildCommand().split("&&").map((s) => s.trim());
    const test = steps.indexOf("npm test");
    const build = steps.indexOf("npm run build");
    expect(test).toBeGreaterThanOrEqual(0);
    expect(build).toBeGreaterThan(test);
  });

  it("un test rojo corta el build: solo `&&`, sin `;`, `||` ni `|`", () => {
    expect(buildCommand()).not.toMatch(/;|\|/);
  });
});
