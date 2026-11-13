// Respuesta reflexiva a la pregunta (spec T-094 §6): muestra fuerzas, no sentencia.
import templates from "../data/templates.json";
import { nombrar } from "../prose";
import type { PlacedCard, ReadingFacts } from "../reading";
import type { QuestionType } from "../question";
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

export function answerCards(facts: ReadingFacts): PlacedCard[] {
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

export function balanceOf(cards: PlacedCard[]): Balance {
  const P = cards.filter((c) => c.estado === "pleno").length;
  const T = cards.filter((c) => c.estado === "trabada").length;
  const E = cards.filter((c) => c.estado === "en_proceso").length;
  if (E > P + T) return "abierta";
  if (P > T) return "favorable";
  if (T > P) return "desfavorable";
  return "abierta";
}

export function buildAnswer(facts: ReadingFacts, rng: () => number): string | null {
  if (!facts.question) return null;
  const cards = answerCards(facts);
  const balance = balanceOf(cards);
  const pregunta = facts.question.replace(/^¿\s*/, "").replace(/\s*\?$/, "");
  const others = cards.filter((p) => p !== facts.dominant);
  const base = fill(pick(rng, templates.respuesta[facts.questionType][balance]), {
    pregunta,
    cartas: joinY((others.length ? others : cards).map((p) => nombrar(p.card))),
    dominante: nombrar(facts.dominant.card),
  });
  const dominio = facts.domain ? ` ${facts.dominant.card[facts.domain]}` : "";
  return base + dominio;
}
