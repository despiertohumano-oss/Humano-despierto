import { describe, expect, it } from "vitest";
import { estadoOf, neighborEffect } from "./dignity";

describe("neighborEffect (Book T)", () => {
  it("vecino amigo refuerza, enemigo debilita, neutro no cuenta", () => {
    expect(neighborEffect("fuego", "aire", null)).toEqual({ weakened: false, reinforced: 1 });
    expect(neighborEffect("fuego", null, "agua")).toEqual({ weakened: true, reinforced: 0 });
    expect(neighborEffect("fuego", "tierra", null)).toEqual({ weakened: false, reinforced: 0 });
    expect(neighborEffect("agua", "agua", "tierra")).toEqual({ weakened: false, reinforced: 2 });
  });
  it("entre dos vecinos enemigos entre sí, la carta no se ve afectada", () => {
    expect(neighborEffect("tierra", "fuego", "agua")).toEqual({ weakened: false, reinforced: 0 });
    expect(neighborEffect("aire", "tierra", "aire")).toEqual({ weakened: false, reinforced: 0 });
  });
  it("un refuerzo y un debilitamiento se compensan", () => {
    expect(neighborEffect("fuego", "aire", "agua")).toEqual({ weakened: false, reinforced: 1 });
  });
});

describe("estadoOf", () => {
  it("trabada gana; si no, invertida es en proceso; si no, pleno", () => {
    expect(estadoOf(false, true)).toBe("trabada");
    expect(estadoOf(true, true)).toBe("trabada");
    expect(estadoOf(true, false)).toBe("en_proceso");
    expect(estadoOf(false, false)).toBe("pleno");
  });
});
