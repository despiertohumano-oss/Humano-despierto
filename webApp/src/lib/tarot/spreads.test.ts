import { describe, expect, it } from "vitest";
import { activeSpreads, SPREADS, positionsFor, spreadBySlug } from "./spreads";
import { loadFuente } from "./fuente-schema";

describe("tiradas", () => {
  it("ofrece las nueve tiradas activas en orden", () => {
    expect(activeSpreads().map((s) => s.slug)).toEqual(["carta-del-dia", "si-o-no", "cruz-simple", "consulta-situacion", "cruz-celta", "pregunta-situacion", "karma", "relaciones", "astrologica"]);
  });

  it("pasado-presente-futuro sigue existiendo pero retirada", () => {
    expect(spreadBySlug("pasado-presente-futuro")?.retirada).toBe(true);
    expect(SPREADS).toHaveLength(10);
  });

  it("cada tirada de la dueña coincide con su fuente en cantidad, orden, rotación y grupo", () => {
    const fuente = loadFuente("tiradas").tiradas;
    for (const s of activeSpreads().filter((x) => x.fuente)) {
      const f = fuente.find((t) => t.clave === s.fuente)!;
      expect(s.cartas, s.slug).toEqual([f.posiciones.length]);
      expect(s.forma, s.slug).toBe(f.forma);
      expect(s.posiciones.map((p) => [p.n, p.rotada, p.grupo]), s.slug).toEqual(f.posiciones.map((p) => [p.n, p.rotada, p.grupo]));
      if (s.forma === "grilla") expect(s.posiciones.map((p) => [p.x, p.y]), s.slug).toEqual(f.posiciones.map((p) => [p.x, p.y]));
    }
  });

  it("la astrológica lleva la casa 1..12 en cada posición", () => {
    expect(spreadBySlug("astrologica")!.posiciones.map((p) => p.casa)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("relaciones no nombra columnas: solo Persona A / Persona B", () => {
    expect(spreadBySlug("relaciones")!.posiciones.map((p) => p.nombre)).toEqual(["Persona A", "Persona B", "Persona A", "Persona B", "Persona A", "Persona B"]);
  });

  it("carta del día no admite invertidas", () => {
    expect(spreadBySlug("carta-del-dia")?.allowReversed).toBe(false);
  });

  it("sí o no con una carta usa solo la posición Respuesta", () => {
    const pos = positionsFor(spreadBySlug("si-o-no")!, 1);
    expect(pos.map((p) => p.nombre)).toEqual(["Respuesta"]);
    expect(positionsFor(spreadBySlug("si-o-no")!, 3)).toHaveLength(3);
  });

  it("rechaza cantidades que la tirada no admite", () => {
    expect(() => positionsFor(spreadBySlug("cruz-celta")!, 3)).toThrow();
  });

  it("desconocida devuelve undefined", () => {
    expect(spreadBySlug("herradura")).toBeUndefined();
  });
});
