// T-097: el balance de la respuesta no se inclina a «favorable» por cómo está armado el mazo (49 sí, 12 depende, 17 no).
import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { drawReversed, shuffleDeck } from "../draw";
import { buildReading } from "../reading";
import { SPREADS, type SpreadSlug } from "../spreads";
import { yesNoVerdict } from "../yes-no";
import templates from "../data/templates.json";
import { answerCards, balanceFor, buildAnswer, cardValue, VALOR_BASE, type Balance } from "./answer";
import { rngFrom } from "./text";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const PREGUNTAS = {
  si_no: "¿Vuelve conmigo?",
  cuando: "¿Cuándo se resuelve?",
  que_hacer: "¿Qué hago con esto?",
  el_otro: "¿Qué siente por mí?",
  como_sale: "¿Cómo me va a ir?",
  general: "Mi situación laboral",
} as const;
// Tiradas grandes: 6 cartas o más. Son las que antes leían «favorable» casi siempre.
const GRANDES = SPREADS.filter((s) => !s.retirada && Math.max(...s.cartas) >= 6);

function azar(slug: string, r: () => number) {
  const s = SPREADS.find((x) => x.slug === slug)!;
  const n = Math.max(...s.cartas);
  return { spread: s.slug, cards: shuffleDeck(r).slice(0, n).map((indice) => ({ indice, reversed: drawReversed(r, s.allowReversed) })) };
}

const N = 1000;

describe("balance calibrado (T-097)", () => {
  it("las tiradas grandes son cruz celta, pregunta-situación, karma, relaciones y astrológica", () => {
    expect(GRANDES.map((s) => s.slug).sort()).toEqual(["astrologica", "cruz-celta", "karma", "pregunta-situacion", "relaciones"]);
  });

  it("VALOR_BASE es el valor medio medido de una carta al azar (±0,03)", () => {
    const r = rngFrom(97);
    let suma = 0;
    let n = 0;
    for (const s of GRANDES) for (let i = 0; i < 400; i++) for (const p of buildReading(azar(s.slug, r)).placed) {
      suma += cardValue(p);
      n++;
    }
    expect(Math.abs(suma / n - VALOR_BASE)).toBeLessThan(0.03);
  });

  // Con cartas al azar no hay información: una lectura calibrada dice «favorable» más o menos tan seguido como
  // «desfavorable» y ninguna de las dos es mayoría. Umbrales:
  // - por tirada × tipo: favorable y desfavorable ≤ 45 % cada una (antes: astrológica 60 %, cruz celta «cuándo» 58 %)
  //   y ≥ 10 % (que no se vuelva todo «abierta»); |fav − des| ≤ 0,30, porque con 1 a 3 cartas el puntaje es
  //   discreto (pregunta-situación «qué siente» lee solo el núcleo y da 40/15: es el signo de una carta).
  // - cuando la respuesta suma 6 cartas o más, la discreción ya no pesa: |fav − des| ≤ 0,12 (la diferencia real,
  //   medida con 2000 tiradas, es ≤ 0,05; el resto es margen de muestreo).
  // - en conjunto, favorable y desfavorable entre 25 % y 40 %, separadas por ≤ 0,08.
  // Con N = 1000 el error típico de una diferencia fav − des es ≈ 2,4 puntos: los márgenes dejan ≥ 2,5 desvíos.
  it("con cartas al azar, ni favorable ni desfavorable dominan en las tiradas grandes", () => {
    const total: Record<Balance, number> = { favorable: 0, abierta: 0, desfavorable: 0 };
    const filas: string[] = [];
    for (const s of GRANDES) {
      for (const [tipo, q] of Object.entries(PREGUNTAS)) {
        const r = rngFrom(20261113);
        const c: Record<Balance, number> = { favorable: 0, abierta: 0, desfavorable: 0 };
        let usadas = 0;
        for (let i = 0; i < N; i++) {
          const f = buildReading(azar(s.slug, r), q);
          usadas = answerCards(f).length;
          c[balanceFor(f)]++;
        }
        for (const k of Object.keys(c) as Balance[]) total[k] += c[k];
        const fav = c.favorable / N;
        const des = c.desfavorable / N;
        const tag = `${s.slug} ${tipo}: fav ${fav.toFixed(2)} des ${des.toFixed(2)}`;
        filas.push(tag);
        expect(fav, tag).toBeLessThanOrEqual(0.45);
        expect(des, tag).toBeLessThanOrEqual(0.45);
        expect(fav, tag).toBeGreaterThanOrEqual(0.1);
        expect(des, tag).toBeGreaterThanOrEqual(0.1);
        expect(Math.abs(fav - des), tag).toBeLessThanOrEqual(usadas >= 6 ? 0.12 : 0.3);
      }
    }
    const M = N * GRANDES.length * Object.keys(PREGUNTAS).length;
    const fav = total.favorable / M;
    const des = total.desfavorable / M;
    expect(fav, filas.join("\n")).toBeGreaterThanOrEqual(0.25);
    expect(fav).toBeLessThanOrEqual(0.4);
    expect(des).toBeGreaterThanOrEqual(0.25);
    expect(des).toBeLessThanOrEqual(0.4);
    expect(Math.abs(fav - des)).toBeLessThanOrEqual(0.08);
  }, 120_000);

  it("si-o-no conserva su regla: el balance es el veredicto, carta por carta", () => {
    const r = rngFrom(5);
    const map = { "sí": "favorable", no: "desfavorable", depende: "abierta" } as const;
    for (let i = 0; i < 500; i++) {
      const f = buildReading(azar("si-o-no", r), PREGUNTAS.si_no);
      expect(balanceFor(f)).toBe(map[yesNoVerdict(f.placed.map((p) => ({ card: p.card, reversed: p.reversed }))).verdict]);
    }
  });
});

describe("balance calibrado: textos reales (T-097)", () => {
  const leer = (spread: SpreadSlug, cartas: [string, boolean][], q: string) =>
    buildReading({ spread, cards: cartas.map(([s, rev]) => ({ indice: idx(s), reversed: rev })) }, q);
  const plantilla = (o: string) => new RegExp("^" + o.split(/\{\w+\}/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+") + "( .*)?$", "s");
  const familia = (tipo: keyof typeof templates.respuesta, a: string) =>
    (["favorable", "abierta", "desfavorable"] as const).filter((b) => templates.respuesta[tipo][b].some((o) => plantilla(o).test(a)));

  // Antes: «la tirada dibuja un recorrido que acompaña… se ven fuerzas a favor» con cinco cartas invertidas y el
  // Cinco de Espadas nombrado como fuerza a favor.
  const ASTRO = leer("astrologica", [["cinco-de-espadas", true], ["seis-de-espadas", false], ["caballero-de-oros", true], ["el-mundo", false], ["la-templanza", false], ["la-justicia", false], ["rey-de-copas", true], ["ocho-de-espadas", false], ["seis-de-bastos", false], ["caballero-de-copas", true], ["rey-de-bastos", true], ["tres-de-bastos", true]], "¿Cómo me va a ir este año?");
  // Antes: «un proceso que ya está andando… lo necesario está bastante maduro», con 4 cartas en contra de 10.
  const CELTA = leer("cruz-celta", [["caballero-de-oros", true], ["rey-de-espadas", false], ["la-estrella", false], ["el-colgado", false], ["el-juicio", false], ["caballero-de-bastos", true], ["la-luna", false], ["cinco-de-copas", false], ["la-templanza", false], ["ocho-de-bastos", false]], "¿Cuándo se resuelve?");
  const KARMA = leer("karma", [["cuatro-de-espadas", false], ["la-emperatriz", false], ["reina-de-espadas", true], ["reina-de-bastos", false], ["el-loco", false], ["reina-de-oros", false], ["diez-de-espadas", true], ["rey-de-oros", false]], "¿Cuándo llega el cambio?");

  it("tiradas parejas ya no se leen como favorables", () => {
    for (const [f, tipo] of [[ASTRO, "como_sale"], [CELTA, "cuando"], [KARMA, "cuando"]] as const) {
      expect(f.questionType).toBe(tipo);
      expect(balanceFor(f)).toBe("abierta");
      for (let s = 1; s <= 10; s++) expect(familia(tipo, buildAnswer(f, rngFrom(s))!)).toEqual(["abierta"]);
    }
    const a = buildAnswer(ASTRO, rngFrom(1))!;
    expect(a).not.toMatch(/a favor|acompaña/);
    expect(a).toContain("Cómo me va a ir este año");
    expect(buildAnswer(CELTA, rngFrom(101))).not.toMatch(/maduro/);
  });

  it("una tirada claramente a favor sigue leyéndose favorable, y una claramente en contra, desfavorable", () => {
    const luz = leer("astrologica", ["el-sol", "la-estrella", "el-mundo", "as-de-copas", "diez-de-copas", "seis-de-bastos", "nueve-de-copas", "tres-de-copas", "as-de-oros", "diez-de-oros", "el-carro", "la-emperatriz"].map((s) => [s, false]), "¿Cómo me va a ir este año?");
    expect(balanceFor(luz)).toBe("favorable");
    expect(familia("como_sale", buildAnswer(luz, rngFrom(2))!)).toEqual(["favorable"]);
    const sombra = leer("astrologica", ["la-torre", "diez-de-espadas", "tres-de-espadas", "cinco-de-copas", "nueve-de-espadas", "ocho-de-espadas", "cinco-de-oros", "el-diablo", "la-luna", "cinco-de-espadas", "siete-de-espadas", "diez-de-bastos"].map((s) => [s, false]), "¿Cómo me va a ir este año?");
    expect(balanceFor(sombra)).toBe("desfavorable");
    expect(familia("como_sale", buildAnswer(sombra, rngFrom(2))!)).toEqual(["desfavorable"]);
  });
});
