// Respuesta reflexiva a la pregunta (spec T-094 §6): muestra fuerzas, no sentencia.
import templates from "../data/templates.json";
import { nombrar } from "../prose";
import type { Contrast, PlacedCard, ReadingFacts } from "../reading";
import type { QuestionType } from "../question";
import { cardVerdict, type Verdict } from "../yes-no";
import type { Lens } from "./lenses";
import { fill, joinY, pick } from "./text";

export type Balance = "favorable" | "abierta" | "desfavorable";

const LENTES: Record<QuestionType, Lens[] | "todas"> = {
  si_no: ["nucleo", "cruce", "transito", "consejo"],
  cuando: "todas",
  que_hacer: ["yo", "consejo", "sosten"],
  el_otro: ["otros", "yo"],
  como_sale: ["nucleo", "transito", "consejo"],
  general: ["nucleo", "consejo"],
};

const byN = (a: PlacedCard, b: PlacedCard) => a.position.n - b.position.n;

// Qué grupos compara el contraste de cada tirada (reading.ts, contrastOf), en el orden en que se nombran.
const LADOS: Record<Contrast["kind"], [string, string]> = { camino: ["si-continua", "si-cambia"], relaciones: ["a", "b"] };

// «¿Qué hago?» en una tirada con dos caminos o dos personas: la respuesta compara los lados, no lee un camino solo.
export function contrastSides(facts: ReadingFacts): [PlacedCard[], PlacedCard[]] | null {
  if (facts.questionType !== "que_hacer" || !facts.contrast) return null;
  const side = (k: string) => [...(facts.groups.find((g) => g.clave === k)?.placed ?? [])].sort(byN);
  const [a, b] = LADOS[facts.contrast.kind];
  const sides: [PlacedCard[], PlacedCard[]] = [side(a), side(b)];
  return sides[0].length && sides[1].length ? sides : null;
}

export function answerCards(facts: ReadingFacts): PlacedCard[] {
  const sides = contrastSides(facts);
  if (sides) return [...sides[0], ...sides[1]].sort(byN);
  const ordered = [...facts.placed].sort(byN);
  const want = LENTES[facts.questionType];
  if (want === "todas") return ordered;
  const hit = ordered.filter((p) => want.includes(p.position.lente));
  if (hit.length) return hit;
  const nucleo = ordered.filter((p) => p.position.lente === "nucleo");
  if (nucleo.length) return nucleo;
  const consejo = ordered.filter((p) => p.position.lente === "consejo");
  return consejo.length ? consejo : [ordered.at(-1)!];
}

const POLARIDAD: Record<Verdict, number> = { "sí": 1, depende: 0, no: -1 };

// Una carta suma +1, 0 o -1: la trabada resta; la invertida baja un escalón, como en el sí/no.
export function cardValue(c: Pick<PlacedCard, "card" | "estado" | "reversed">): number {
  return c.estado === "trabada" ? -1 : POLARIDAD[cardVerdict(c.card, c.reversed)];
}

// Lo que vale en promedio una carta al azar: el mazo trae 49 «sí», 12 «depende» y 17 «no», un tercio sale
// invertida y una de cada cinco queda trabada por sus vecinas. Sin restarlo, cualquier tirada grande «favorece».
// balance.test.ts lo vuelve a medir.
export const VALOR_BASE = -0.09;
// Margen en desvíos (σ ≈ 1 por carta): por debajo de 0,5·√n la diferencia es ruido del mazo y la respuesta queda abierta.
export const MARGEN = 0.5;

export function balanceOf(cards: PlacedCard[]): Balance {
  const E = cards.filter((c) => c.estado === "en_proceso").length;
  if (E > cards.length - E) return "abierta";
  const desvio = cards.reduce((s, c) => s + cardValue(c) - VALOR_BASE, 0);
  const umbral = MARGEN * Math.sqrt(cards.length);
  if (desvio > umbral) return "favorable";
  if (desvio < -umbral) return "desfavorable";
  return "abierta";
}

export function balanceFor(facts: ReadingFacts): Balance {
  if (facts.yesNo) return facts.yesNo.verdict === "sí" ? "favorable" : facts.yesNo.verdict === "no" ? "desfavorable" : "abierta";
  return balanceOf(answerCards(facts));
}

const MAX_NAMED = 3;

export function namedCards(facts: ReadingFacts): PlacedCard[] {
  const all = answerCards(facts);
  let pool = all;
  if (facts.questionType === "cuando") {
    const ep = all.filter((p) => p.estado === "en_proceso");
    const key = all.filter((p) => p.position.lente === "nucleo" || p.position.lente === "consejo");
    pool = ep.length ? ep : key.length ? key : [all.at(-1)!];
  }
  const others = pool.filter((p) => p.position.n !== facts.dominant.position.n);
  return (others.length ? others : [facts.dominant]).slice(0, MAX_NAMED);
}

function contrastAnswer(facts: ReadingFacts, sides: [PlacedCard[], PlacedCard[]], pregunta: string, rng: () => number): string {
  const c = facts.contrast!;
  const variants = (templates.respuesta_contraste[c.kind] as Record<string, string[]>)[c.winner]!;
  const nombres = (cs: PlacedCard[]) => {
    const sin = cs.filter((p) => p.position.n !== facts.dominant.position.n);
    return joinY((sin.length ? sin : cs).map((p) => nombrar(p.card)));
  };
  return fill(pick(rng, variants), { pregunta, cartas_a: nombres(sides[0]), cartas_b: nombres(sides[1]), dominante: nombrar(facts.dominant.card) });
}

export function buildAnswer(facts: ReadingFacts, rng: () => number): string | null {
  if (!facts.question) return null;
  const pregunta = facts.question.replace(/^¿\s*/, "").replace(/\s*\?$/, "");
  const sides = contrastSides(facts);
  const base = sides ? contrastAnswer(facts, sides, pregunta, rng) : fill(pick(rng, templates.respuesta[facts.questionType][balanceFor(facts)]), {
    pregunta,
    cartas: joinY(namedCards(facts).map((p) => nombrar(p.card))),
    dominante: nombrar(facts.dominant.card),
    rol: pick(rng, templates.respuesta_dominante[facts.dominant.position.lente === "otros" ? "otros" : "yo"]),
  });
  const dominio = facts.domain ? facts.dominant.card[facts.domain] : "";
  return facts.domain && typeof dominio === "string" && dominio.trim() ? `${base} ${fill(pick(rng, templates.posicion_dominio[facts.domain]), { texto: dominio.trim() })}` : base;
}
