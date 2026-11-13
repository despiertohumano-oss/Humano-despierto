import { describe, expect, it } from "vitest";
import { LENSES, LENS_LABEL } from "./lenses";
import { SPREADS, spreadBySlug } from "../spreads";

const lentes = (slug: string) => spreadBySlug(slug)!.posiciones.map((p) => p.lente);

describe("lentes", () => {
  it("son once, cerradas, con rótulo", () => {
    expect(LENSES).toEqual(["nucleo", "cruce", "raiz", "transito", "meta", "yo", "otros", "sosten", "sombra", "consejo", "leccion"]);
    for (const l of LENSES) expect(LENS_LABEL[l].length).toBeGreaterThan(2);
  });

  it("toda posición de toda tirada tiene lente", () => {
    for (const s of SPREADS) for (const p of s.posiciones) expect(LENSES, `${s.slug}#${p.n}`).toContain(p.lente);
  });

  it("mapa de la spec §4.1", () => {
    expect(lentes("carta-del-dia")).toEqual(["consejo"]);
    expect(lentes("si-o-no")).toEqual(["nucleo", "nucleo", "nucleo"]);
    expect(lentes("cruz-simple")).toEqual(["raiz", "transito", "raiz", "transito", "nucleo"]);
    expect(lentes("consulta-situacion")).toEqual(["sosten", "cruce", "nucleo", "consejo", "transito"]);
    expect(lentes("cruz-celta")).toEqual(["nucleo", "cruce", "meta", "raiz", "sosten", "transito", "yo", "otros", "sombra", "consejo"]);
    expect(lentes("karma")).toEqual(["yo", "leccion", "otros", "otros", "otros", "transito", "leccion", "consejo"]);
    expect(lentes("relaciones")).toEqual(["yo", "otros", "yo", "otros", "yo", "otros"]);
    expect(lentes("astrologica")).toEqual(Array(12).fill("nucleo"));
    expect(lentes("pasado-presente-futuro")).toEqual(["raiz", "nucleo", "transito"]);
    const ps = spreadBySlug("pregunta-situacion")!.posiciones;
    const porGrupo: Record<string, string> = { "si-continua": "transito", "si-cambia": "transito", "pasado-reciente": "raiz", karmica: "leccion" };
    for (const p of ps) expect(p.lente, `#${p.n}`).toBe(p.grupo ? porGrupo[p.grupo] : "nucleo");
  });
});
