import { describe, expect, it } from "vitest";
import {
  BODY_IDS, BODY_NAMES, PLANET_IDS, SIGNS, SIGN_IDS, arcsecBetween, bodyBySlug, bodySlug,
  degreeInSign, formatDegree, isSignId, norm360, pointName, signOf,
} from "./zodiac";

describe("zodiac", () => {
  it("12 signos en orden y 13 cuerpos con los nombres de la spec", () => {
    expect(SIGN_IDS).toEqual(["aries", "tauro", "geminis", "cancer", "leo", "virgo", "libra", "escorpio", "sagitario", "capricornio", "acuario", "piscis"]);
    expect(BODY_IDS).toHaveLength(13);
    expect(PLANET_IDS).toHaveLength(10);
    expect(BODY_NAMES.lilith_media).toBe("Lilith (Luna Negra media)");
    expect(BODY_NAMES.nodo_norte).toBe("Nodo Norte");
    expect(pointName("asc")).toBe("Ascendente");
  });

  it("elemento, modalidad y regente tradicional (fundamentos-interpretativos.md §1.1)", () => {
    expect(SIGNS.aries).toMatchObject({ elemento: "fuego", modalidad: "cardinal", regente: "marte" });
    expect(SIGNS.escorpio).toMatchObject({ elemento: "agua", modalidad: "fijo", regente: "marte" });
    expect(SIGNS.acuario).toMatchObject({ elemento: "aire", modalidad: "fijo", regente: "saturno" });
    expect(SIGNS.piscis).toMatchObject({ elemento: "agua", modalidad: "mutable", regente: "jupiter" });
    const porElemento = SIGN_IDS.reduce<Record<string, number>>((acc, s) => ({ ...acc, [SIGNS[s].elemento]: (acc[SIGNS[s].elemento] ?? 0) + 1 }), {});
    expect(porElemento).toEqual({ fuego: 3, tierra: 3, aire: 3, agua: 3 });
  });

  it("signOf, degreeInSign y formatDegree en los bordes", () => {
    expect(signOf(0)).toBe("aries");
    expect(signOf(29.9999)).toBe("aries");
    expect(signOf(30)).toBe("tauro");
    expect(signOf(359.99)).toBe("piscis");
    expect(signOf(-0.5)).toBe("piscis");
    expect(degreeInSign(84.5)).toBeCloseTo(24.5, 10);
    expect(formatDegree(84.5)).toBe("24°30′");
    expect(formatDegree(30.9999)).toBe("0°59′");
  });

  it("norm360 y arcsecBetween cruzan el 0", () => {
    expect(norm360(-10)).toBe(350);
    expect(norm360(725)).toBe(5);
    expect(arcsecBetween(359.999, 0.001)).toBeCloseTo(7.2, 6);
  });

  it("slugs de cuerpos ida y vuelta", () => {
    for (const b of BODY_IDS) expect(bodyBySlug(bodySlug(b))).toBe(b);
    expect(bodySlug("nodo_norte")).toBe("nodo-norte");
    expect(bodyBySlug("asc")).toBeUndefined();
    expect(isSignId("tauro")).toBe(true);
    expect(isSignId("ofiuco")).toBe(false);
  });
});
