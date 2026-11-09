import { describe, expect, it } from "vitest";
import { AstroTime, Horizon, Observer } from "astronomy-engine";
import swe from "./__fixtures__/swe.json";
import { ascendant, computeAngles, eclipticToEquatorial, midheaven } from "./angles";
import { J2000_JD } from "./ephemeris";
import { arcsecBetween, norm360 } from "./zodiac";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("ángulos", () => {
  it("regresión de cuadrante: θ=100°, φ=−34,6° ⇒ ASC 195,43°, no el Descendente 15,43° (§3.1, §10)", () => {
    expect(ascendant(100, 23.4392911, -34.6)).toBeCloseTo(195.43, 2);
  });

  it("ASC y MC contra el oráculo, ≤10″ (incluye Buenos Aires, Mendoza y Madrid)", () => {
    for (const c of swe.angles) {
      const a = computeAngles(new AstroTime(c.jdUT - J2000_JD), c.lat, c.lon);
      expect(arcsecBetween(a.asc, c.asc), `ASC ${c.jdUT} ${c.lat}`).toBeLessThanOrEqual(10);
      expect(arcsecBetween(a.mc, c.mc), `MC ${c.jdUT} ${c.lat}`).toBeLessThanOrEqual(10);
    }
  });

  it("el ASC sale por el este a cualquier latitud, incluso pasado el círculo polar", () => {
    const rnd = mulberry32(20261108);
    for (let i = 0; i < 500; i++) {
      const t = new AstroTime(-36524 + rnd() * 73048);
      const lat = (rnd() * 2 - 1) * 89.9;
      const lon = rnd() * 360 - 180;
      const a = computeAngles(t, lat, lon);
      const { ra, dec } = eclipticToEquatorial(a.asc, a.eps);
      const h = Horizon(t, new Observer(lat, lon, 0), ra / 15, dec, undefined);
      expect(h.azimuth, `lat ${lat}`).toBeGreaterThan(0);
      expect(h.azimuth, `lat ${lat}`).toBeLessThan(180);
    }
  });

  it("el MC tiene ascensión recta igual al RAMC", () => {
    for (const ramc of [0, 45, 100, 200, 359]) {
      const mc = midheaven(ramc, 23.44);
      expect(eclipticToEquatorial(mc, 23.44).ra).toBeCloseTo(norm360(ramc), 9);
    }
  });
});
