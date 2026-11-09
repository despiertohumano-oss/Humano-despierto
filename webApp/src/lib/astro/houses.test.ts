import { describe, expect, it } from "vitest";
import swe from "./__fixtures__/swe.json";
import { ascendant, midheaven } from "./angles";
import { computeHouses, houseOf, placidusCusps, wholeSignCusps } from "./houses";
import { arcsecBetween, norm360 } from "./zodiac";

describe("Placidus", () => {
  it("las 12 cúspides contra el oráculo, ≤10″", () => {
    for (const h of swe.houses) {
      const c = placidusCusps(h.armc, h.eps, h.lat);
      expect(c, `lat ${h.lat}`).not.toBeNull();
      c!.forEach((x, i) => expect(arcsecBetween(x, h.cusps[i]!), `casa ${i + 1} lat ${h.lat}`).toBeLessThanOrEqual(10));
    }
  });

  it("las opuestas difieren 180° y 1/10 son ASC/MC", () => {
    const c = placidusCusps(100, 23.44, -34.6)!;
    for (let i = 0; i < 6; i++) expect(norm360(c[i + 6]! - c[i]!)).toBeCloseTo(180, 9);
    expect(c[0]).toBeCloseTo(ascendant(100, 23.44, -34.6), 9);
    expect(c[9]).toBeCloseTo(midheaven(100, 23.44), 9);
  });

  it("a 70° no existe: computeHouses cae a Whole Sign y lo informa", () => {
    const a = { asc: ascendant(100, 23.44, 70), mc: midheaven(100, 23.44), ramc: 100, eps: 23.44 };
    const h = computeHouses("placidus", a, 70);
    expect(h).toMatchObject({ system: "whole_sign", fallback: true });
    expect(h.cusps).toEqual(wholeSignCusps(a.asc));
  });
});

describe("Whole Sign y casa de un punto", () => {
  it("cúspides múltiplos de 30 y la 1 contiene al ASC", () => {
    const c = wholeSignCusps(97.25);
    expect(c[0]).toBe(90);
    expect(c.every((x) => x % 30 === 0)).toBe(true);
    expect(c[11]).toBe(60);
  });

  it("elegido a mano no es fallback", () => {
    const a = { asc: 97.25, mc: 10, ramc: 12, eps: 23.44 };
    expect(computeHouses("whole_sign", a, -34.6)).toMatchObject({ system: "whole_sign", fallback: false });
  });

  it("houseOf respeta el cruce por 0° y los bordes", () => {
    const c = wholeSignCusps(345);
    expect(houseOf(330, c)).toBe(1);
    expect(houseOf(359.99, c)).toBe(1);
    expect(houseOf(0, c)).toBe(2);
    expect(houseOf(329.99, c)).toBe(12);
  });
});
