// webApp/src/lib/tarot/interpret/narrative.ts
// Arma el texto de la lectura (spec T-094 §5, §6): idea lineal → conjunto → dominante → posiciones → tensiones → respuesta → resolución → espejo.
import templates from "../data/templates.json";
import { articulo, cap, nombrar } from "../prose";
import type { PlacedCard, ReadingFacts } from "../reading";
import type { Estado } from "./dignity";
import { buildAnswer } from "./answer";
import { lensText } from "./lens-texts";
import { LENS_LABEL } from "./lenses";
import { fill, joinY, lowerFirst, pick, rngFrom } from "./text";

export type ReadingText = {
  apertura: string;
  ideaLineal: string;
  panorama: string | null;
  dominante: { titulo: string; texto: string } | null;
  posiciones: { titulo: string; glosa: string; texto: string }[];
  grupos: { titulo: string; texto: string }[];
  tensiones: string[];
  respuesta: string | null;
  sintesis: string;
  consejo: string;
  espejo: string;
};

// Baraja seedeada: recorre todas las variantes antes de repetir una.
function deckOf(rng: () => number, variants: readonly string[]): (ok?: (v: string) => boolean) => string {
  let pile: string[] = [];
  return (ok = () => true) => {
    if (!pile.some(ok)) pile = variants.filter(ok).map((v) => [rng(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    const i = pile.findIndex(ok);
    return pile.splice(i, 1)[0]!;
  };
}

const byN = (a: PlacedCard, b: PlacedCard) => a.position.n - b.position.n;
const nom = (p: PlacedCard) => nombrar(p.card);

// «los Enamorados» no admite un verbo en minúscula pegado: con carta plural solo valen las variantes que arrancan el texto en mayúscula.
const forCard = (variants: string[], p: PlacedCard): string[] => (articulo(p.card) === "los" ? variants.filter((v) => !v.includes("{texto_min}")) : variants);

function ideaLineal(facts: ReadingFacts, rng: () => number): string {
  const all = [...facts.placed].sort(byN);
  if (all.length < 2) return "";
  const o = all.length > 6 ? [...all.slice(0, 5), all.at(-1)!] : all;
  const clave = (p: PlacedCard) => p.keywords[0]!;
  const paso = deckOf(rng, templates.idea_paso);
  const parts = [fill(pick(rng, templates.idea_inicio), { A: nom(o[0]!), clave: clave(o[0]!) })];
  for (const p of o.slice(1, -1)) parts.push(fill(paso(), { a: nom(p), clave: clave(p) }));
  if (o.length > 1) parts.push(fill(pick(rng, templates.idea_fin), { a: nom(o.at(-1)!), clave: clave(o.at(-1)!) }));
  return `${parts.join(", ")}.`;
}

function panorama(facts: ReadingFacts, rng: () => number): string | null {
  const { proportions: pr, patterns: pt } = facts;
  const parts: string[] = [];
  if (pr.majorsDominant) parts.push(pick(rng, templates.panorama_mayores));
  if (pr.dominantSuit) parts.push(pick(rng, templates.panorama_palo[pr.dominantSuit]));
  if (pr.absentSuit) parts.push(pick(rng, templates.panorama_ausente[pr.absentSuit]));
  if (pt.people.length >= 2) parts.push(fill(pick(rng, templates.gente), { cartas: joinY(pt.people.map(nom)) }));
  if (pt.facets.length) parts.push(fill(pick(rng, templates.facetas), { cartas: joinY(pt.facets.map(nom)) }));
  if (pr.blocked) parts.push(pick(rng, templates.panorama_bloqueo));
  for (const r of pt.repeated) {
    const key = String(r.numero) as keyof typeof templates.patron_numero;
    parts.push(fill(pick(rng, templates.patron_numero[key]), { cartas: joinY(r.cartas.map(nom)) }));
  }
  if (pt.progression) parts.push(pick(rng, templates.progresion[pt.progression]));
  return parts.length ? parts.join(" ") : null;
}

function posicion(p: PlacedCard, facts: ReadingFacts, rng: () => number, estadoDeck: Record<Estado, () => string>) {
  const lente = lensText(p.card, p.position.lente);
  const base = fill(pick(rng, forCard(templates.posicion_lente, p)), { nombre: nom(p), Nombre: cap(nom(p)), posicion: p.position.nombre, texto: lente, texto_min: lowerFirst(lente) });
  const estadoTexto = p.estado === "trabada" ? p.card.en_desequilibrio : p.card.en_equilibrio;
  const estado = fill(estadoDeck[p.estado](), { nombre: nom(p), texto: estadoTexto });
  const dominio = facts.domain && p.domainText ? " " + fill(pick(rng, templates.posicion_dominio[facts.domain]), { texto: p.domainText }) : "";
  return { titulo: `${p.position.n}. ${p.position.nombre}`, glosa: p.position.significado, texto: `${base} ${estado}${dominio}` };
}

function tensiones(facts: ReadingFacts, rng: () => number): string[] {
  const out: string[] = [];
  const c = facts.contrast;
  if (c) out.push(c.kind === "relaciones" ? pick(rng, templates.contraste_relaciones[c.winner]) : pick(rng, templates.contraste_camino[c.winner]));
  for (const t of facts.tensions) {
    const base = fill(pick(rng, templates.tension[t.dignity]), { A: cap(nom(t.a)), b: nom(t.b), la: LENS_LABEL[t.a.position.lente], lb: LENS_LABEL[t.b.position.lente] });
    const marcada = (["trabada", "en_proceso"] as const).flatMap((e) => [t.a, t.b].filter((p) => p.estado === e).map((p) => [e, p] as const))[0];
    out.push(marcada ? `${base} ${fill(pick(rng, templates.tension_estado[marcada[0]]), { A: cap(nom(marcada[1])), b: nom(marcada[1]) })}` : base);
  }
  return out;
}

function resolucionCard(facts: ReadingFacts): PlacedCard {
  const o = [...facts.placed].sort(byN);
  return o.find((p) => p.position.lente === "consejo") ?? o.at(-1)!;
}

function sintesis(facts: ReadingFacts, rng: () => number): string {
  const parts: string[] = [];
  if (facts.yesNo) {
    const centro = facts.placed[Math.floor(facts.placed.length / 2)]!;
    const detalle = `${cap(nom(centro))}${centro.reversed ? " al revés" : ""} habla de ${centro.keywords.slice(0, 3).join(", ")}.`;
    parts.push(fill(pick(rng, templates.sino[facts.yesNo.verdict]), { detalle }));
    if (facts.yesNo.tiebreak) parts.push(pick(rng, templates.sino_desempate));
  }
  for (const c of facts.combos) {
    const pa = facts.placed.find((p) => p.card.id === c.a)!;
    const pb = facts.placed.find((p) => p.card.id === c.b)!;
    parts.push(fill(pick(rng, templates.combo), { texto: lowerFirst(c.texto), a: nom(pa), b: nom(pb) }));
  }
  if (facts.quintessence) {
    parts.push(fill(pick(rng, templates.quintaesencia), { nombre: nombrar(facts.quintessence), palabras: facts.quintessence.palabras_clave_derecha.slice(0, 3).join(", ") }));
  }
  if (facts.placed.length > 1) {
    const r = resolucionCard(facts);
    const yaDicho = r.position.lente === "consejo";
    const t = lensText(r.card, "consejo");
    const options = templates.resolucion.filter((v) => (/\{texto(_min)?\}/.test(v) ? !yaDicho : yaDicho));
    parts.push(fill(pick(rng, forCard(options, r)), { nombre: nom(r), Nombre: cap(nom(r)), posicion: r.position.nombre, texto: t, texto_min: lowerFirst(t) }));
  }
  return parts.join(" ");
}

function consejo(d: PlacedCard, rng: () => number): string {
  const conDosPuntos = d.card.consejo.includes(":");
  const options = conDosPuntos ? templates.consejo.filter((v) => !v.split("{consejo}")[0]!.trimEnd().endsWith(":")) : templates.consejo;
  return fill(pick(rng, options), { consejo: lowerFirst(d.card.consejo) });
}

export function renderReading(facts: ReadingFacts, seed: number): ReadingText {
  const rng = rngFrom(seed);
  const apertura = facts.question ? fill(pick(rng, templates.apertura_pregunta), { pregunta: facts.question }) : pick(rng, templates.apertura);
  const d = facts.dominant;
  const estadoDeck = {
    pleno: deckOf(rng, templates.estado.pleno),
    en_proceso: deckOf(rng, templates.estado.en_proceso),
    trabada: deckOf(rng, templates.estado.trabada),
  };
  const idea = ideaLineal(facts, rng);
  const pan = panorama(facts, rng);
  const dominante =
    facts.placed.length > 1
      ? { titulo: cap(nom(d)), texto: fill(pick(rng, templates.dominante), { nombre: nom(d), Nombre: cap(nom(d)), posicion: d.position.nombre, claves: joinY(d.keywords.slice(0, 3).map((k) => `«${k}»`)) }) }
      : null;
  return {
    apertura,
    ideaLineal: idea,
    panorama: pan,
    dominante,
    posiciones: facts.placed.map((p) => posicion(p, facts, rng, estadoDeck)),
    grupos: facts.groups.map((g) => ({ titulo: g.nombre, texto: fill(pick(rng, templates.grupo), { grupo: g.nombre, claves: joinY(g.placed.map((p) => p.keywords[0]!)) }) })),
    tensiones: tensiones(facts, rng),
    respuesta: buildAnswer(facts, rng),
    sintesis: sintesis(facts, rng),
    consejo: resolucionCard(facts).card.id === d.card.id ? "" : consejo(d, rng),
    espejo: fill(pick(rng, templates.reflexion), { pregunta: pick(rng, d.card.reflexion) }),
  };
}
