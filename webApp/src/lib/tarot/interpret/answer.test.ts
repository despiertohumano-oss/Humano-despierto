import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { buildReading } from "../reading";
import { answerCards, balanceFor, balanceOf, buildAnswer, contrastSides, namedCards } from "./answer";
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
  it("balance: suma lo que cada carta se aparta del promedio del mazo y exige margen", () => {
    const c = (si_no: string, estado: string, reversed = false) => ({ card: { si_no }, estado, reversed }) as never;
    expect(balanceOf([c("sí", "pleno"), c("sí", "pleno"), c("no", "pleno")])).toBe("favorable");
    // Antes «desfavorable» por 2 a 1; ahora -1 + 0,27 no supera el margen de 0,5·√3.
    expect(balanceOf([c("sí", "trabada"), c("no", "pleno"), c("sí", "pleno")])).toBe("abierta");
    expect(balanceOf([c("sí", "trabada"), c("no", "pleno"), c("depende", "pleno")])).toBe("desfavorable");
    expect(balanceOf([c("sí", "pleno"), c("no", "pleno")])).toBe("abierta");
    expect(balanceOf([c("depende", "pleno"), c("depende", "pleno")])).toBe("abierta");
    expect(balanceOf([c("sí", "en_proceso", true), c("sí", "en_proceso", true), c("sí", "pleno")])).toBe("abierta");
    // Una invertida baja un escalón: «sí» al revés ya no suma (compárese con la primera línea).
    expect(balanceOf([c("sí", "en_proceso", true), c("sí", "pleno"), c("no", "pleno")])).toBe("abierta");
    expect(balanceOf([c("sí", "pleno"), c("sí", "pleno"), c("depende", "pleno")])).toBe("favorable");
    // Una sola carta lee su propio signo, como antes.
    expect(balanceOf([c("sí", "pleno")])).toBe("favorable");
    expect(balanceOf([c("depende", "pleno")])).toBe("abierta");
    expect(balanceOf([c("no", "pleno")])).toBe("desfavorable");
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

const plantilla = (o: string) => new RegExp("^" + o.split(/\{\w+\}/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+") + "( .*)?$", "s");
const encaja = (opts: string[], a: string) => opts.some((o) => plantilla(o).test(a));
const todasLasRespuestas = (t: string) => Object.values(templates.respuesta[t as keyof typeof templates.respuesta]).flat();

describe("«¿qué hago?» en tiradas con dos lados compara los lados (T-097)", () => {
  // pregunta-situacion: 1 núcleo; 2/6/10 «si seguís igual»; 5/9/13 «si introducís un cambio»; el resto, otros grupos.
  const situacion = (slugs: string[], q: string, rev: number[] = []) =>
    buildReading({ spread: "pregunta-situacion", cards: slugs.map((s, i) => ({ indice: idx(s), reversed: rev.includes(i + 1) })) }, q);
  const TRECE = ["el-mago", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "as-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas", "as-de-copas", "dos-de-oros", "tres-de-bastos"];

  it("nombra las cartas de los dos caminos y usa la plantilla del lado que fluye más", () => {
    const f = situacion(TRECE, "¿Qué hago con mi trabajo?", [2, 6, 10]);
    expect(f.questionType).toBe("que_hacer");
    expect(f.contrast).toEqual({ kind: "camino", winner: "cambio" });
    for (let s = 1; s <= 12; s++) {
      const a = buildAnswer(f, rngFrom(s))!;
      expect(a).toContain("Qué hago con mi trabajo");
      for (const n of ["el Dos de Copas", "el Seis de Copas", "el Diez de Copas"]) expect(a).toContain(n);
      for (const n of ["el As de Bastos", "el Nueve de Bastos", "el Tres de Bastos"]) expect(a).toContain(n);
      expect(a.indexOf("el Dos de Copas")).toBeLessThan(a.indexOf("el As de Bastos"));
      expect(encaja(templates.respuesta_contraste.camino.cambio, a), a).toBe(true);
      expect(encaja([...templates.respuesta_contraste.camino.continua, ...templates.respuesta_contraste.camino.parejo, ...todasLasRespuestas("que_hacer")], a), a).toBe(false);
    }
    expect(buildAnswer(f, rngFrom(3))).toMatch(/cambio|cambiar|moverte/);
  });

  it("si el camino actual fluye más lo dice, y si pesan igual devuelve la decisión", () => {
    const sigue = situacion(TRECE, "¿Qué hago con mi trabajo?", [5, 9, 13]);
    expect(sigue.contrast).toEqual({ kind: "camino", winner: "continua" });
    const parejo = situacion(TRECE, "¿Qué hago con mi trabajo?");
    expect(parejo.contrast).toEqual({ kind: "camino", winner: "parejo" });
    for (let s = 1; s <= 12; s++) {
      expect(encaja(templates.respuesta_contraste.camino.continua, buildAnswer(sigue, rngFrom(s))!)).toBe(true);
      expect(encaja(templates.respuesta_contraste.camino.parejo, buildAnswer(parejo, rngFrom(s))!)).toBe(true);
    }
  });

  it("relaciones: intercambiar A y B espeja el texto", () => {
    const A = ["el-carro", "reina-de-copas", "as-de-oros"];
    const B = ["dos-de-espadas", "tres-de-copas", "cuatro-de-bastos"];
    // Posiciones 1/3/5 son A y 2/4/6 son B; el lado al revés queda en proceso y el otro fluye.
    const rel = (a: [string[], boolean], b: [string[], boolean]) =>
      buildReading({ spread: "relaciones", cards: [0, 1, 2].flatMap((i) => [{ indice: idx(a[0][i]!), reversed: a[1] }, { indice: idx(b[0][i]!), reversed: b[1] }]) }, "¿Qué hago con esta relación?");
    const ab = rel([A, false], [B, true]);
    const ba = rel([B, true], [A, false]);
    expect(ab.contrast).toEqual({ kind: "relaciones", winner: "a" });
    expect(ba.contrast).toEqual({ kind: "relaciones", winner: "b" });
    expect(ab.dominant.card.id).toBe("el-carro");
    expect(ba.dominant.card.id).toBe("el-carro");
    for (let s = 1; s <= 12; s++) {
      const t = buildAnswer(ab, rngFrom(s))!;
      expect(encaja(templates.respuesta_contraste.relaciones.a, t), t).toBe(true);
      expect(t).toMatch(/persona A[^;]*la Reina de Copas y el As de Oros/);
      expect(t).toMatch(/persona B[^.]*el Dos de Espadas, el Tres de Copas y el Cuatro de Bastos/);
      const m = buildAnswer(ba, rngFrom(s))!;
      expect(encaja(templates.respuesta_contraste.relaciones.b, m), m).toBe(true);
      expect(m).toMatch(/persona A[^;]*el Dos de Espadas, el Tres de Copas y el Cuatro de Bastos/);
      expect(m).toMatch(/persona B[^.]*la Reina de Copas y el As de Oros/);
    }
  });

  it("sin grupos, o con otro tipo de pregunta, la respuesta no cambia de familia", () => {
    const celtaQ = celta("¿Qué hago con esto?");
    expect(contrastSides(celtaQ)).toBeNull();
    expect(encaja(todasLasRespuestas("que_hacer"), buildAnswer(celtaQ, rngFrom(1))!)).toBe(true);
    const vuelve = situacion(TRECE, "¿Vuelve conmigo?", [2, 6, 10]);
    expect(contrastSides(vuelve)).toBeNull();
    expect(encaja(todasLasRespuestas("si_no"), buildAnswer(vuelve, rngFrom(1))!)).toBe(true);
  });

  it("las cartas de la respuesta son las de los dos lados", () => {
    const f = situacion(TRECE, "¿Qué hago con mi trabajo?", [2, 6, 10]);
    expect(answerCards(f).map((p) => p.position.grupo)).toEqual(["si-continua", "si-cambia", "si-continua", "si-cambia", "si-continua", "si-cambia"]);
  });
});

function buildAnswerTemplateOf(r: ReturnType<typeof buildReading>, seed: number): string {
  const opts = templates.respuesta[r.questionType].desfavorable;
  const a = buildAnswer(r, rngFrom(seed))!;
  const re = (o: string) => new RegExp("^" + o.split(/\{\w+\}/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+") );
  return opts.find((o) => re(o).test(a)) ?? "";
}
