// webApp/src/lib/astro/chart.test.ts
import { describe, expect, it } from "vitest";
import horizons from "./__fixtures__/horizons.json";
import { computeChart } from "./chart";
import { BODY_IDS, signOf } from "./zodiac";

// 1990-06-15 12:00 UTC: Horizons da esas longitudes a las 12:00 TT (57 s después); a esa distancia
// ningún cuerpo de la fecha cambia de signo.
const BA = { lat: -34.60372, lon: -58.38159 };
const UTC_1990 = new Date("1990-06-15T12:00:00Z");

describe("computeChart", () => {
  it("13 cuerpos en orden, Big 3 coherente con JPL, casas y aspectos con hora", () => {
    const f = computeChart({ utc: UTC_1990, ...BA, houseSystem: "placidus", hasTime: true });
    expect(f.bodies.map((b) => b.id)).toEqual([...BODY_IDS]);
    expect(f.big3.sun).toBe(signOf(horizons.bodies.sol[2]!.lon));
    expect(f.big3.moon).toBe(signOf(horizons.bodies.luna[2]!.lon));
    expect(f.angles).not.toBeNull();
    expect(f.big3.asc).toBe(signOf(f.angles!.asc));
    expect(f.houses).toMatchObject({ system: "placidus", fallback: false });
    expect(f.bodies.every((b) => b.house !== null && b.house >= 1 && b.house <= 12)).toBe(true);
    expect(f.chartRuler).not.toBeNull();
    expect(Object.values(f.elements.counts).reduce((a, b) => a + b, 0)).toBe(10);
    expect(Object.values(f.modalities.counts).reduce((a, b) => a + b, 0)).toBe(10);
    expect(f.flags).toEqual({ sinHora: false, houseSystemFallback: false, moonSignUncertain: false });
    expect(f.bodies.find((b) => b.id === "sol")!.retrograde).toBe(false);
  });

  it("sin hora: sin ángulos, casas ni aspectos a ángulos", () => {
    const f = computeChart({ utc: UTC_1990, ...BA, houseSystem: "placidus", hasTime: false });
    expect(f.angles).toBeNull();
    expect(f.houses).toBeNull();
    expect(f.big3.asc).toBeNull();
    expect(f.chartRuler).toBeNull();
    expect(f.bodies.every((b) => b.house === null)).toBe(true);
    expect(f.aspects.some((a) => a.a === "asc" || a.b === "asc" || a.a === "mc" || a.b === "mc")).toBe(false);
    expect(f.flags.sinHora).toBe(true);
    expect(f.stelliums.every((s) => s.kind === "signo")).toBe(true);
  });

  it("a 70° de latitud Placidus cae a Whole Sign y lo marca", () => {
    const f = computeChart({ utc: UTC_1990, lat: 70, lon: 25, houseSystem: "placidus", hasTime: true });
    expect(f.houses).toMatchObject({ system: "whole_sign", fallback: true });
    expect(f.flags.houseSystemFallback).toBe(true);
  });

  it("dominantes = los de conteo máximo", () => {
    const f = computeChart({ utc: UTC_1990, ...BA, houseSystem: "whole_sign", hasTime: true });
    const max = Math.max(...Object.values(f.elements.counts));
    expect(f.elements.dominant.length).toBeGreaterThan(0);
    expect(f.elements.dominant.every((e) => f.elements.counts[e] === max)).toBe(true);
  });

  it("fuera de 1900-2100 o con latitud imposible lanza RangeError", () => {
    expect(() => computeChart({ utc: new Date("1899-06-01T00:00:00Z"), ...BA, houseSystem: "placidus", hasTime: true })).toThrow(RangeError);
    for (const lat of [Number.NaN, Infinity, -90]) {
      expect(() => computeChart({ utc: UTC_1990, lat, lon: 0, houseSystem: "placidus", hasTime: true })).toThrow(RangeError);
    }
    for (const lon of [Number.NaN, Infinity, 181]) {
      expect(() => computeChart({ utc: UTC_1990, lat: 0, lon, houseSystem: "placidus", hasTime: true })).toThrow(RangeError);
    }
    expect(() => computeChart({ utc: new Date(Number.NaN), ...BA, houseSystem: "placidus", hasTime: true })).toThrow(RangeError);
    expect(() => computeChart({ utc: UTC_1990, lat: 90, lon: 0, houseSystem: "placidus", hasTime: true })).toThrow(RangeError);
  });

  it("sin hora marca moonSignUncertain solo si la Luna cambia de signo en ±12 h", () => {
    const sinHora = (utc: Date) => computeChart({ utc, ...BA, houseSystem: "placidus", hasTime: false });
    const hits = new Set<boolean>();
    for (let d = 0; d < 30; d++) hits.add(sinHora(new Date(Date.UTC(1990, 5, 1 + d, 12))).flags.moonSignUncertain);
    expect(hits).toEqual(new Set([true, false]));
    expect(computeChart({ utc: UTC_1990, ...BA, houseSystem: "placidus", hasTime: true }).flags.moonSignUncertain).toBe(false);
  });

  it("stelliums: 3 o más planetas en un signo o casa, nunca puntos", () => {
    const f = computeChart({ utc: UTC_1990, ...BA, houseSystem: "whole_sign", hasTime: true });
    const planets = new Set(f.bodies.slice(0, 10).map((b) => b.id));
    for (const s of f.stelliums) {
      expect(s.bodies.length).toBeGreaterThanOrEqual(3);
      expect(s.bodies.every((b) => planets.has(b))).toBe(true);
    }
  });
});
