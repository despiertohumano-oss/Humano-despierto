import { describe, expect, it } from "vitest";
import type { Aspect, AspectId } from "./aspects";
import { POSICIONES, posicionesSchema, tonoDe } from "./posiciones";
import { PLANET_IDS, type PointId } from "./zodiac";

const asp = (a: PointId, b: PointId, type: AspectId): Aspect => ({ a, b, type, orb: 1, applying: true });

describe("tonoDe", () => {
  it("más trígonos y sextiles que cuadraturas y oposiciones: luz", () => {
    const r = tonoDe("marte", [asp("marte", "venus", "trigono"), asp("jupiter", "marte", "sextil"), asp("marte", "saturno", "cuadratura")]);
    expect(r).toEqual({ tono: "luz", fluidos: 2, tensos: 1 });
  });

  it("más cuadraturas y oposiciones: sombra", () => {
    const r = tonoDe("marte", [asp("marte", "venus", "oposicion"), asp("marte", "luna", "cuadratura"), asp("marte", "sol", "trigono")]);
    expect(r).toEqual({ tono: "sombra", fluidos: 1, tensos: 2 });
  });

  it("empate: ambas", () => {
    expect(tonoDe("marte", [asp("marte", "venus", "trigono"), asp("marte", "sol", "cuadratura")]).tono).toBe("ambas");
  });

  it("sin aspectos: ambas con 0 y 0", () => {
    expect(tonoDe("marte", [])).toEqual({ tono: "ambas", fluidos: 0, tensos: 0 });
    expect(tonoDe("marte", [asp("venus", "sol", "trigono")])).toEqual({ tono: "ambas", fluidos: 0, tensos: 0 });
  });

  it("ignora ángulos, Quirón, nodo, Lilith y conjunciones", () => {
    const r = tonoDe("marte", [
      asp("marte", "asc", "trigono"), asp("mc", "marte", "sextil"), asp("marte", "quiron", "trigono"),
      asp("nodo_norte", "marte", "sextil"), asp("marte", "lilith_media", "trigono"), asp("marte", "venus", "conjuncion"),
      asp("marte", "saturno", "cuadratura"),
    ]);
    expect(r).toEqual({ tono: "sombra", fluidos: 0, tensos: 1 });
  });
});

describe("posicionesSchema", () => {
  const ok = { texto: "t".repeat(300), luz: "l".repeat(100), sombra: "s".repeat(100) };
  const con = (e: object) => ({ en_signo: { aries: e }, en_casa: {} });

  it("acepta registros parciales y vacíos", () => {
    expect(posicionesSchema.safeParse({ en_signo: {}, en_casa: {} }).success).toBe(true);
    expect(posicionesSchema.safeParse(con(ok)).success).toBe(true);
  });

  it("rechaza largos fuera de rango", () => {
    expect(posicionesSchema.safeParse(con({ ...ok, texto: "t".repeat(279) })).success).toBe(false);
    expect(posicionesSchema.safeParse(con({ ...ok, texto: "t".repeat(701) })).success).toBe(false);
    expect(posicionesSchema.safeParse(con({ ...ok, luz: "l".repeat(89) })).success).toBe(false);
    expect(posicionesSchema.safeParse(con({ ...ok, sombra: "s".repeat(261) })).success).toBe(false);
  });

  it("rechaza comillas dobles y apóstrofos", () => {
    expect(posicionesSchema.safeParse(con({ ...ok, luz: `${"l".repeat(100)} "x"` })).success).toBe(false);
    expect(posicionesSchema.safeParse(con({ ...ok, sombra: `${"s".repeat(100)} d'x` })).success).toBe(false);
  });

  it("rechaza claves de signo o casa inexistentes", () => {
    expect(posicionesSchema.safeParse({ en_signo: { ofiuco: ok }, en_casa: {} }).success).toBe(false);
    expect(posicionesSchema.safeParse({ en_signo: {}, en_casa: { "13": ok } }).success).toBe(false);
  });

  it("los 10 archivos reales cumplen el esquema", () => {
    expect(Object.keys(POSICIONES).sort()).toEqual([...PLANET_IDS].sort());
  });
});
