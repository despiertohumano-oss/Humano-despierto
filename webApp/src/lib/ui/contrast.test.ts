import { describe, expect, it } from "vitest";
import { blend, contrastRatio, hexToRgb } from "./contrast";

describe("contrast", () => {
  it("negro sobre blanco es 21:1 y un color sobre sí mismo es 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#2a2f6b", "#2a2f6b")).toBeCloseTo(1, 5);
  });

  it("es simétrico y acepta hex o rgb", () => {
    expect(contrastRatio("#0e1430", "#ffffff")).toBeCloseTo(contrastRatio([255, 255, 255], "#0e1430"), 8);
  });

  it("hexToRgb rechaza lo que no es #rrggbb", () => {
    expect(hexToRgb("#d9b45a")).toEqual([217, 180, 90]);
    expect(() => hexToRgb("rojo")).toThrow(/hex inválido/);
  });

  it("blend con alpha 1 devuelve el frente y con 0 el fondo", () => {
    expect(blend([10, 20, 30], [200, 200, 200], 1)).toEqual([10, 20, 30]);
    expect(blend([10, 20, 30], [200, 200, 200], 0)).toEqual([200, 200, 200]);
    expect(blend([0, 0, 0], [100, 100, 100], 0.5)).toEqual([50, 50, 50]);
  });
});
