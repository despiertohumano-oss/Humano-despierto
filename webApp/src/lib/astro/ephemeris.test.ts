import { describe, expect, it } from "vitest";
import { AstroTime } from "astronomy-engine";
import horizons from "./__fixtures__/horizons.json";
import { J2000_JD, apparentLongitude, speedOf } from "./ephemeris";
import { PLANET_IDS, arcsecBetween } from "./zodiac";

// Spec §2: planetas ≤30″, Luna ≤10″ contra JPL (medido: ≤15″ y ≤3,2″, motor-de-calculo.md §1.3).
const TOLERANCIA = (b: string) => (b === "luna" ? 10 : 30);

describe("longitud geocéntrica aparente de la fecha contra JPL Horizons q31", () => {
  for (const body of PLANET_IDS) {
    it(`${body} en 1900, 1950, 1990, 2026 y 2100`, () => {
      for (const row of horizons.bodies[body]) {
        const t = AstroTime.FromTerrestrialTime(row.jdTT - J2000_JD);
        expect(arcsecBetween(apparentLongitude(body, t), row.lon), `${body} JD ${row.jdTT}`).toBeLessThanOrEqual(TOLERANCIA(body));
      }
    });
  }
});

describe("velocidad", () => {
  it("la Luna anda entre 11,8° y 15,3° por día (motor-de-calculo.md §9.1)", () => {
    for (const jd of horizons.jdsTT) {
      const v = speedOf((t) => apparentLongitude("luna", t), AstroTime.FromTerrestrialTime(jd - J2000_JD));
      expect(v).toBeGreaterThan(11.5);
      expect(v).toBeLessThan(15.5);
    }
  });

  it("Mercurio se vuelve retrógrado al menos una vez en 1990 y el Sol nunca", () => {
    const inicio = AstroTime.FromTerrestrialTime(2447892.5 - J2000_JD);
    const dias = [...Array(365).keys()].map((d) => inicio.AddDays(d));
    expect(dias.some((t) => speedOf((x) => apparentLongitude("mercurio", x), t) < 0)).toBe(true);
    expect(dias.every((t) => speedOf((x) => apparentLongitude("sol", x), t) > 0.9)).toBe(true);
  });
});
