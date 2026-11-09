import { describe, expect, it } from "vitest";
import horizons from "./horizons.json";
import swe from "./swe.json";

describe("fixtures del motor", () => {
  it("horizons.json: 11 cuerpos × 5 fechas TT y el nodo de la Luna en las mismas 5", () => {
    expect(horizons.jdsTT).toEqual([2415020.5, 2433282.5, 2448058.0, 2461351.5, 2488069.5]);
    expect(Object.keys(horizons.bodies).sort()).toEqual(["jupiter", "luna", "marte", "mercurio", "neptuno", "pluton", "quiron", "saturno", "sol", "urano", "venus"]);
    for (const rows of Object.values(horizons.bodies)) {
      expect(rows.map((r) => r.jdTT)).toEqual(horizons.jdsTT);
      for (const r of rows) {
        expect(r.lon).toBeGreaterThanOrEqual(0);
        expect(r.lon).toBeLessThan(360);
      }
    }
    expect(horizons.moonNode).toHaveLength(5);
    expect(horizons._meta.fuente).toMatch(/Horizons/);
  });

  it("swe.json: 120 casos por grupo, 12 cúspides, latitudes hasta ±66° y la nota de licencia", () => {
    expect(swe.houses).toHaveLength(120);
    expect(swe.angles).toHaveLength(120);
    expect(swe.points).toHaveLength(120);
    for (const h of swe.houses) expect(h.cusps).toHaveLength(12);
    expect(Math.max(...swe.angles.map((a) => Math.abs(a.lat)))).toBeLessThanOrEqual(66);
    expect(swe._meta.fuente).toMatch(/ningun codigo de Swiss Ephemeris en este repo/);
  });
});
