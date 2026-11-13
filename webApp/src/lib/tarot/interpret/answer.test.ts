import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { buildReading } from "../reading";
import { answerCards, balanceFor, balanceOf, buildAnswer, namedCards } from "./answer";
import { rngFrom } from "./text";
import templates from "../data/templates.json";

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
  it("balance por carta: sí no trabada a favor; no o trabada en contra", () => {
    const c = (si_no: string, estado: string) => ({ card: { si_no }, estado }) as never;
    expect(balanceOf([c("sí", "pleno"), c("sí", "pleno"), c("no", "pleno")])).toBe("favorable");
    expect(balanceOf([c("sí", "trabada"), c("no", "pleno"), c("sí", "pleno")])).toBe("desfavorable");
    expect(balanceOf([c("sí", "pleno"), c("no", "pleno")])).toBe("abierta");
    expect(balanceOf([c("depende", "pleno"), c("depende", "pleno")])).toBe("abierta");
    expect(balanceOf([c("sí", "en_proceso"), c("sí", "en_proceso"), c("sí", "pleno")])).toBe("abierta");
  });
  it("si-o-no: la respuesta sigue el veredicto, no el estado", () => {
    const r = buildReading({ spread: "si-o-no", cards: [["tres-de-espadas", false], ["la-luna", true], ["diez-de-espadas", false]].map(([s, rev]) => ({ indice: idx(s as string), reversed: rev as boolean })) }, "¿Vuelve conmigo?");
    expect(r.yesNo!.verdict).toBe("no");
    expect(balanceFor(r)).toBe("desfavorable");
    for (let s = 1; s <= 10; s++) expect(templates.respuesta[r.questionType].desfavorable).toContain(buildAnswerTemplateOf(r, s));
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
  it("«cuando» nombra solo las cartas en proceso (máx. 3)", () => {
    const r = celta("¿Cuándo se resuelve?", [true, false, false, true, false, false, true, false, false, true]);
    const ep = r.placed.filter((p) => p.estado === "en_proceso");
    expect(ep.length).toBeGreaterThan(0);
    const names = namedCards(r);
    expect(names.length).toBeLessThanOrEqual(3);
    for (const p of names) expect(p.estado === "en_proceso" || p.position.n === r.dominant.position.n).toBe(true);
  });
  it("«cuando» sin cartas en proceso nombra núcleo o consejo", () => {
    const r = celta("¿Cuándo se resuelve?");
    const flat = { ...r, placed: r.placed.map((p) => ({ ...p, estado: "pleno" as const })) };
    const names = namedCards(flat);
    expect(names.length).toBeGreaterThan(0);
    for (const p of names) expect(["nucleo", "consejo"]).toContain(p.position.lente);
  });
  it("si_no y que_hacer nombran como mucho 3 cartas", () => {
    for (const q of ["¿Vuelve conmigo?", "¿Qué hago con esto?"]) {
      const r = celta(q);
      expect(namedCards(r).length).toBeLessThanOrEqual(3);
    }
    const many = celta("¿Vuelve conmigo?");
    const wide = { ...many, placed: many.placed.map((p) => ({ ...p, position: { ...p.position, lente: "nucleo" as const } })) };
    expect(answerCards(wide).length).toBe(10);
    expect(namedCards(wide).length).toBe(3);
  });
});

function buildAnswerTemplateOf(r: ReturnType<typeof buildReading>, seed: number): string {
  const opts = templates.respuesta[r.questionType].desfavorable;
  const a = buildAnswer(r, rngFrom(seed))!;
  const re = (o: string) => new RegExp("^" + o.split(/\{\w+\}/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+") );
  return opts.find((o) => re(o).test(a)) ?? "";
}
