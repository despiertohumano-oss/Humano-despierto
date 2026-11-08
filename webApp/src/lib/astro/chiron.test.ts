import { describe, expect, it } from "vitest";
import { AstroTime } from "astronomy-engine";
import horizons from "./__fixtures__/horizons.json";
import { CHIRON_TABLE_RANGE_JD_TT, chironLongitude } from "./chiron";
import { J2000_JD } from "./ephemeris";
import { arcsecBetween } from "./zodiac";

describe("Quirón", () => {
  it("contra Horizons q31 en 1900, 1950, 1990, 2026 y 2100: ≤5″ (medido 0,35″)", () => {
    for (const r of horizons.bodies.quiron) {
      const t = AstroTime.FromTerrestrialTime(r.jdTT - J2000_JD);
      expect(arcsecBetween(chironLongitude(t), r.lon), `JD ${r.jdTT}`).toBeLessThanOrEqual(5);
    }
  });

  it("la tabla cubre 1900-01-01 y 2100-12-31 con margen, y fuera de ella lanza", () => {
    const [desde, hasta] = CHIRON_TABLE_RANGE_JD_TT;
    expect(desde).toBeLessThan(2415020.5 - 60);
    expect(hasta).toBeGreaterThan(2488433.5 + 60);
    expect(() => chironLongitude(AstroTime.FromTerrestrialTime(2414000.5 - J2000_JD))).toThrow(RangeError);
  });
});
