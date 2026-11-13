import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { buildReading } from "../reading";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const leer = (spread: string, slugs: string[]) =>
  buildReading({ spread: spread as never, cards: slugs.map((s) => ({ indice: idx(s), reversed: false })) });
const lentes = (r: ReturnType<typeof leer>) => r.tensions.map((t) => `${t.a.position.lente}-${t.b.position.lente}`);

describe("tensionsOf", () => {
  it("cruz celta: hasta 3, en orden de prioridad", () => {
    const r = leer("cruz-celta", ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"]);
    expect(lentes(r)).toEqual(["nucleo-cruce", "raiz-transito", "yo-otros"]);
  });
  it("califica con la dignidad entre las dos cartas", () => {
    const r = leer("cruz-celta", ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"]);
    expect(r.tensions[0]!.dignity).toBe("debilita"); // fuego-agua
  });
  it("con contraste de grupos, máximo 2 y sin yo-otros", () => {
    const r = leer("relaciones", ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas"]);
    expect(r.tensions.length).toBeLessThanOrEqual(2);
    expect(lentes(r)).not.toContain("yo-otros");
  });
  it("tiradas sin pares de lentes no tienen tensiones", () => {
    expect(leer("carta-del-dia", ["as-de-oros"]).tensions).toEqual([]);
    expect(leer("astrologica", CARDS.slice(22, 34).map((c) => c.id)).tensions).toEqual([]);
  });
});
