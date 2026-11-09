import { describe, expect, it } from "vitest";
import { AstroTime } from "astronomy-engine";
import horizons from "./__fixtures__/horizons.json";
import swe from "./__fixtures__/swe.json";
import { J2000_JD } from "./ephemeris";
import { meanLilithLongitude, meanNodeLongitude, trueNodeLongitude } from "./points";
import { arcsecBetween } from "./zodiac";

const at = (jdUT: number) => new AstroTime(jdUT - J2000_JD);

describe("puntos lunares", () => {
  it("nodo medio y Lilith media contra el oráculo, ≤10″ (medido 0,3″ y 1,1″)", () => {
    for (const p of swe.points) {
      expect(arcsecBetween(meanNodeLongitude(at(p.jdUT)), p.meanNode), `nodo ${p.jdUT}`).toBeLessThanOrEqual(10);
      expect(arcsecBetween(meanLilithLongitude(at(p.jdUT)), p.meanLilith), `lilith ${p.jdUT}`).toBeLessThanOrEqual(10);
    }
  });

  it("regresión: Lilith SIN proyectar a la eclíptica se aparta minutos (§6.1, hasta 417″)", () => {
    const peor = Math.max(...swe.points.map((p) => arcsecBetween(meanLilithLongitude(at(p.jdUT), false), p.meanLilith)));
    expect(peor).toBeGreaterThan(60);
  });

  it("nodo verdadero en J2000 contra los elementos osculantes de Horizons, ≤15″ (§8.2)", () => {
    for (const n of horizons.moonNode) {
      const t = AstroTime.FromTerrestrialTime(n.jdTDB - J2000_JD);
      expect(arcsecBetween(trueNodeLongitude(t, "j2000"), n.om), `JD ${n.jdTDB}`).toBeLessThanOrEqual(15);
    }
  });

  it("el nodo verdadero de la fecha oscila a menos de 2° del medio (§5.2: máx 1,74°)", () => {
    for (const p of swe.points) {
      expect(arcsecBetween(trueNodeLongitude(at(p.jdUT)), meanNodeLongitude(at(p.jdUT))) / 3600).toBeLessThan(2);
    }
  });
});
