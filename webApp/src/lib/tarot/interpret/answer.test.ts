import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { buildReading } from "../reading";
import { answerCards, balanceOf, buildAnswer } from "./answer";
import { rngFrom } from "./text";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const celta = (q: string | null, rev: boolean[] = []) =>
  buildReading({ spread: "cruz-celta", cards: ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"].map((s, i) => ({ indice: idx(s), reversed: rev[i] ?? false })) }, q);

describe("respuesta reflexiva", () => {
  it("sin pregunta no hay respuesta", () => {
    expect(buildAnswer(celta(null), rngFrom(1))).toBeNull();
  });
  it("toma las lentes de cada tipo", () => {
    expect(answerCards(celta("¿Qué hago con esto?")).map((p) => p.position.lente)).toEqual(["sosten", "yo", "consejo"]);
    expect(answerCards(celta("¿Qué siente por mí?")).map((p) => p.position.lente)).toEqual(["yo", "otros"]);
    expect(answerCards(celta("¿Cuándo se resuelve?")).length).toBe(10);
  });
  it("si faltan las lentes del tipo, cae en núcleo, consejo o la última", () => {
    const r = buildReading({ spread: "carta-del-dia", cards: [{ indice: 0, reversed: false }] }, "¿Qué siente por mí?");
    expect(answerCards(r).map((p) => p.position.lente)).toEqual(["consejo"]);
  });
  it("balance: favorable, desfavorable o abierta", () => {
    const P = { estado: "pleno" } as never, T = { estado: "trabada" } as never, E = { estado: "en_proceso" } as never;
    expect(balanceOf([P, P, T])).toBe("favorable");
    expect(balanceOf([T, T, P])).toBe("desfavorable");
    expect(balanceOf([P, T])).toBe("abierta");
    expect(balanceOf([E, E, P])).toBe("abierta");
  });
  it("retoma la pregunta literal y es determinista", () => {
    const r = celta("¿Vuelve conmigo?");
    const a = buildAnswer(r, rngFrom(7))!;
    expect(a).toContain("Vuelve conmigo");
    expect(buildAnswer(r, rngFrom(7))).toBe(a);
  });
  it("{cartas} excluye a la dominante, salvo que sea la única", () => {
    const torre = buildReading({ spread: "cruz-celta", cards: ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"].map((s, i) => ({ indice: i === 1 ? 16 : idx(s), reversed: false })) }, "¿Vuelve conmigo?");
    expect(torre.dominant.card.nombre_es).toBe("La Torre");
    for (let s = 1; s <= 30; s++) {
      const a = buildAnswer(torre, rngFrom(s))!;
      expect(a.split("la torre").length - 1).toBeLessThanOrEqual(1);
    }
    const dia = buildReading({ spread: "carta-del-dia", cards: [{ indice: 0, reversed: false }] }, "¿Qué hago?");
    expect(buildAnswer(dia, rngFrom(1))).toContain("el Loco");
  });
});
