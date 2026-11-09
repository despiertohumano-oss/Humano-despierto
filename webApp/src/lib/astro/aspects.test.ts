import { describe, expect, it } from "vitest";
import { ASPECTS, findAspects, separation } from "./aspects";

describe("aspectos mayores con orbes Urania Trust", () => {
  it("orbes exactos de la spec", () => {
    expect(ASPECTS.map((a) => [a.id, a.angle, a.orb])).toEqual([
      ["conjuncion", 0, 8], ["sextil", 60, 4], ["cuadratura", 90, 5], ["trigono", 120, 5], ["oposicion", 180, 8],
    ]);
  });

  it("separación por el camino corto", () => {
    expect(separation(350, 10)).toBeCloseTo(20, 10);
    expect(separation(10, 190)).toBeCloseTo(180, 10);
  });

  it("límites inclusivos de orbe", () => {
    const at = (b: number) => findAspects([{ id: "sol", lon: 10, speed: 1 }, { id: "marte", lon: b, speed: 0.5 }]).map((a) => a.type);
    expect(at(18)).toEqual(["conjuncion"]);
    expect(at(18.01)).toEqual([]);
    expect(at(74)).toEqual(["sextil"]);
    expect(at(74.01)).toEqual([]);
    expect(at(105)).toEqual(["cuadratura"]);
    expect(at(135)).toEqual(["trigono"]);
    expect(at(198)).toEqual(["oposicion"]);
  });

  it("aplicativo y separativo según velocidades, también con un retrógrado", () => {
    const [sep] = findAspects([{ id: "sol", lon: 10, speed: 1 }, { id: "luna", lon: 17, speed: 13 }]);
    expect(sep).toMatchObject({ type: "conjuncion", applying: false });
    expect(sep!.orb).toBeCloseTo(7, 10);
    const [apl] = findAspects([{ id: "sol", lon: 10, speed: 1 }, { id: "luna", lon: 3, speed: 13 }]);
    expect(apl).toMatchObject({ applying: true });
    const [retro] = findAspects([{ id: "venus", lon: 100, speed: 0 }, { id: "mercurio", lon: 192, speed: -0.5 }]);
    expect(retro).toMatchObject({ type: "cuadratura", applying: true });
  });

  it("no aspecta ASC con MC y ordena por orbe", () => {
    const r = findAspects([
      { id: "asc", lon: 0, speed: 0 }, { id: "mc", lon: 90, speed: 0 },
      { id: "sol", lon: 92, speed: 1 }, { id: "luna", lon: 180.4, speed: 13 },
    ]);
    expect(r.some((a) => a.a === "asc" && a.b === "mc")).toBe(false);
    expect(r.map((a) => a.orb)).toEqual([...r.map((a) => a.orb)].sort((x, y) => x - y));
    expect(r[0]).toMatchObject({ a: "asc", b: "luna", type: "oposicion" });
    expect(r[1]).toMatchObject({ a: "mc", b: "luna" });
  });
});
