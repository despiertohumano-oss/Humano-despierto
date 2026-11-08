import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND, brandImageForDiscipline } from "./brand-images";

describe("BRAND", () => {
  it("cada imagen existe en public/ y su alt dice lo que se ve", () => {
    for (const img of Object.values(BRAND)) {
      expect(existsSync(join(process.cwd(), "public", img.src)), img.src).toBe(true);
      expect(img.alt.trim().length).toBeGreaterThan(15);
    }
  });
});

describe("brandImageForDiscipline", () => {
  it.each([
    ["Tarot", BRAND.tarotArcanos],
    ["tarot", BRAND.tarotArcanos],
    ["Astrología", BRAND.cartaAstralDorada],
    ["astrologia", BRAND.cartaAstralDorada],
    ["Constelaciones familiares", BRAND.libroConstelaciones],
    ["constelaciones", BRAND.libroConstelaciones],
    ["Magia", BRAND.escritorioAstrologico],
    ["Gemoterapia", BRAND.minerales],
    ["Simbología y símbolos de poder", BRAND.cartaAstralAzul],
    ["simbologia", BRAND.cartaAstralAzul],
    ["Talleres lunares", BRAND.libroConstelaciones],
    ["talleres-lunares", BRAND.libroConstelaciones],
  ])("%s → su imagen", (discipline, expected) => {
    expect(brandImageForDiscipline(discipline)).toBe(expected);
  });

  it("una disciplina desconocida, vieja o ausente cae en la imagen neutra", () => {
    for (const d of ["Herbal", "Numerología", "", null, undefined]) {
      expect(brandImageForDiscipline(d)).toBe(BRAND.libroEstelar);
    }
  });
});
