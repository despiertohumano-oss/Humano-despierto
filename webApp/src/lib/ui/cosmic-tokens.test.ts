import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { blend, contrastRatio, hexToRgb } from "./contrast";

const SRC = join(process.cwd(), "src");
const css = readFileSync(join(SRC, "styles", "tokens.css"), "utf8");

function token(name: string): string {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!m) throw new Error(`falta el token --${name} en tokens.css`);
  return m[1].trim();
}

const noche = token("noche");
const indigo = token("indigo");
const oro = token("oro");
const papel = token("papel");
const miel = token("miel");
const bosque = token("bosque");

describe("tokens cósmicos (ADR-015 extendido)", () => {
  it("valores de la spec", () => {
    expect([noche, indigo, oro]).toEqual(["#0e1430", "#2a2f6b", "#d9b45a"]);
  });

  it.each([
    ["papel sobre noche", papel, noche],
    ["oro sobre noche", oro, noche],
    ["papel sobre indigo", papel, indigo],
    ["oro sobre indigo", oro, indigo],
    ["bosque sobre miel (botón primary)", bosque, miel],
  ])("texto: %s ≥ 4.5:1", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["foco oro sobre noche", oro, noche],
    ["foco oro sobre indigo", oro, indigo],
    ["miel (botón) sobre noche", miel, noche],
  ])("no texto: %s ≥ 3:1", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  it("el velo sobre imagen es de 70 % como mínimo y sostiene el texto papel aun sobre un píxel blanco", () => {
    const velo = Number(token("velo-min"));
    expect(velo).toBeGreaterThanOrEqual(0.7);
    const peorCaso = blend(hexToRgb(noche), [255, 255, 255], velo);
    expect(contrastRatio(hexToRgb(papel), peorCaso)).toBeGreaterThanOrEqual(4.5);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

describe("los tokens cósmicos sólo se usan en superficies .cosmico", () => {
  const USO = /\b(?:bg|text|border|fill|stroke|from|to|via|ring|outline)-(?:noche|indigo|oro)\b/;
  const files = walk(SRC).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f),
  );

  it("todo archivo que usa noche/indigo/oro declara la clase `cosmico`", () => {
    const sueltos = files
      .filter((f) => USO.test(readFileSync(f, "utf8")) && !readFileSync(f, "utf8").includes("cosmico"))
      .map((f) => f.replace(SRC, "src"));
    expect(sueltos).toEqual([]);
  });
});
