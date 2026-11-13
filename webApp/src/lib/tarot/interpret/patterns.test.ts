import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { buildReading } from "../reading";
import { dominantOf, patternsOf } from "./patterns";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const leer = (spread: string, slugs: string[], rev: boolean[] = []) =>
  buildReading({ spread: spread as never, cards: slugs.map((s, i) => ({ indice: idx(s), reversed: rev[i] ?? false })) });

describe("patternsOf", () => {
  it("números repetidos entre menores 1..10", () => {
    const r = leer("cruz-simple", ["cinco-de-copas", "cinco-de-oros", "as-de-bastos", "dos-de-espadas", "rey-de-copas"]);
    expect(patternsOf(r.placed).repeated.map((x) => [x.numero, x.cartas.length])).toEqual([[5, 2]]);
  });
  it("progresión: avanza si sube en ≥ 2/3 de los pasos, retrocede si baja", () => {
    expect(patternsOf(leer("cruz-simple", ["as-de-bastos", "tres-de-copas", "cinco-de-oros", "siete-de-espadas", "nueve-de-copas"]).placed).progression).toBe("avanza");
    expect(patternsOf(leer("cruz-simple", ["diez-de-bastos", "ocho-de-copas", "seis-de-oros", "cuatro-de-espadas", "dos-de-copas"]).placed).progression).toBe("retrocede");
    expect(patternsOf(leer("cruz-simple", ["tres-de-bastos", "ocho-de-copas", "dos-de-oros", "nueve-de-espadas", "cuatro-de-copas"]).placed).progression).toBeNull();
  });
  it("figuras: personas en otros/sosten/cruce, facetas en yo/sombra", () => {
    // cruz-celta: 1 nucleo, 2 cruce, 3 meta, 4 raiz, 5 sosten, 6 transito, 7 yo, 8 otros, 9 sombra, 10 consejo
    const r = leer("cruz-celta", ["as-de-bastos", "rey-de-copas", "dos-de-oros", "tres-de-espadas", "reina-de-oros", "seis-de-bastos", "sota-de-copas", "caballero-de-espadas", "rey-de-bastos", "diez-de-oros"]);
    const p = patternsOf(r.placed);
    expect(p.people.map((x) => x.card.id)).toEqual(["rey-de-copas", "reina-de-oros", "caballero-de-espadas"]);
    expect(p.facets.map((x) => x.card.id)).toEqual(["sota-de-copas", "rey-de-bastos"]);
  });
});

describe("dominantOf", () => {
  it("1) mayor en núcleo o cruce", () => {
    const r = leer("cruz-celta", ["as-de-bastos", "la-torre", "el-sol", "tres-de-espadas", "cuatro-de-oros", "seis-de-bastos", "dos-de-copas", "ocho-de-espadas", "nueve-de-bastos", "diez-de-oros"]);
    expect(dominantOf(r.placed).card.id).toBe("la-torre");
  });
  it("2) si no, el mayor de menor posición", () => {
    const r = leer("cruz-celta", ["as-de-bastos", "dos-de-oros", "tres-de-copas", "el-sol", "cuatro-de-oros", "la-luna", "dos-de-copas", "ocho-de-espadas", "nueve-de-bastos", "diez-de-oros"]);
    expect(dominantOf(r.placed).card.id).toBe("el-sol");
  });
  it("3) sin mayores, la más reforzada; 4) si nadie refuerza, la del núcleo", () => {
    const r = leer("cruz-simple", ["as-de-bastos", "as-de-espadas", "dos-de-bastos", "as-de-copas", "as-de-oros"]);
    const max = Math.max(...r.placed.map((p) => p.reinforced));
    expect(dominantOf(r.placed).reinforced).toBe(max);
    const sola = leer("carta-del-dia", ["as-de-oros"]);
    expect(dominantOf(sola.placed).card.id).toBe("as-de-oros");
  });
});
