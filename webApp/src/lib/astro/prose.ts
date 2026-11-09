import { z } from "@/lib/validation/zod";
import raw from "./data/templates.json";
import type { AspectId } from "./aspects";
import type { BodyPosition, ChartFacts } from "./chart";
import { BODY_IDS, BODY_NAMES, SIGNS, SIGN_IDS, type BodyId, type Modality, formatDegree, pointName } from "./zodiac";

export const HOUSE_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export type HouseKey = (typeof HOUSE_KEYS)[number];
const ASPECT_KEYS = ["conjuncion", "sextil", "cuadratura", "trigono", "oposicion"] as const satisfies readonly AspectId[];

const entry = z.object({
  nombre: z.string().min(1),
  palabras_clave: z.array(z.string().min(1)).min(3).max(6),
  frase: z.string().min(40),
  ficha: z.array(z.string().min(200)).min(2).max(4),
});
const paragraph = z.string().min(120);

const schema = z.object({
  _meta: z.object({ estado: z.enum(["borrador", "aprobado"]), revision: z.string().nullable() }),
  cuerpos: z.record(z.enum(BODY_IDS), entry),
  signos: z.record(z.enum(SIGN_IDS), entry),
  casas: z.record(z.enum(HOUSE_KEYS), entry),
  aspectos: z.record(z.enum(ASPECT_KEYS), entry),
  sol_en: z.record(z.enum(SIGN_IDS), paragraph),
  luna_en: z.record(z.enum(SIGN_IDS), paragraph),
  asc_en: z.record(z.enum(SIGN_IDS), paragraph),
});

export type TextEntry = z.infer<typeof entry>;
// Se valida al importar: un hueco en los textos tiene que romper el build, no una carta.
export const TEMPLATES = schema.parse(raw);

// Sin comillas ni apóstrofos: la ficha y el resultado lo comparan contra HTML escapado.
export const AVISO_MARCO =
  "La astrología es un lenguaje simbólico con más de dos mil años de tradición, no una ciencia. Te ofrecemos esta carta como herramienta de reflexión y conversación, no de predicción: no reemplaza la atención médica ni psicológica. Si estás atravesando una situación de salud física o mental, consultá a una profesional. Si necesitás hablar con alguien ahora, la Línea Nacional de Salud Mental atiende gratis las 24 horas en el 0800-999-0091.";
export const AVISO_SIN_HORA = "Sin hora de nacimiento no se calculan Ascendente, Medio Cielo ni casas.";
export const AVISO_FALLBACK =
  "En esta latitud las casas Placidus no se pueden calcular: te mostramos casas de signo entero (Whole Sign).";
export const AVISO_LUNA =
  "Sin la hora, la Luna puede estar unos grados antes o después de lo que ves, y ese día cambió de signo: tomá su signo con cautela.";

export type Paragraph = { titulo: string; texto: string; porQue: string };
export type ChartText = {
  big3: Paragraph[];
  regente: Paragraph | null;
  cuerpos: Paragraph[];
  aspectos: Paragraph[];
  balance: string;
  avisos: string[];
  marco: string;
};

const MODALIDAD: Record<Modality, string> = { cardinal: "cardinal", fijo: "fija", mutable: "mutable" };

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    if (v === undefined) throw new Error(`plantilla sin valor para {${k}}`);
    return v;
  });
}

function lista(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

// Los luminares llevan artículo en la prosa corrida («la Luna rige…»); los planetas, no.
function conArticulo(id: BodyId): string {
  return id === "sol" ? "el Sol" : id === "luna" ? "la Luna" : BODY_NAMES[id];
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function posicion(b: BodyPosition): string {
  return `a ${formatDegree(b.lon)} de ${SIGNS[b.sign].nombre}${b.house ? `, casa ${b.house}` : ""}`;
}

function ubicacion(b: BodyPosition): string {
  return `${BODY_NAMES[b.id]} ${posicion(b)}`;
}

function bodyParagraph(b: BodyPosition): Paragraph {
  const partes = [TEMPLATES.cuerpos[b.id].frase, TEMPLATES.signos[b.sign].frase];
  if (b.house) partes.push(TEMPLATES.casas[String(b.house) as HouseKey].frase);
  return {
    titulo: `${BODY_NAMES[b.id]} en ${SIGNS[b.sign].nombre}${b.house ? `, casa ${b.house}` : ""}${b.retrograde ? " (retrógrado)" : ""}`,
    texto: partes.join(" "),
    porQue: ubicacion(b),
  };
}

function balanceText(f: ChartFacts): string {
  const el = f.elements.dominant;
  const mo = f.modalities.dominant.map((m) => MODALIDAD[m]);
  const plural = el.length > 1 || mo.length > 1;
  const stelliums = f.stelliums.map((s) =>
    s.kind === "signo"
      ? `Hay un stellium en ${SIGNS[s.sign].nombre}: ${lista(s.bodies.map((b) => BODY_NAMES[b]))}.`
      : `Hay un stellium en la casa ${s.house}: ${lista(s.bodies.map((b) => BODY_NAMES[b]))}.`,
  );
  return [
    `Entre los diez planetas ${plural ? "predominan" : "predomina"} ${el.length > 1 ? "los elementos" : "el elemento"} ${lista(el)} y ${mo.length > 1 ? "las modalidades" : "la modalidad"} ${lista(mo)}.`,
    ...stelliums,
  ].join(" ");
}

export function renderChart(f: ChartFacts): ChartText {
  const byId = new Map(f.bodies.map((b) => [b.id, b]));
  const sol = byId.get("sol")!;
  const luna = byId.get("luna")!;

  const big3: Paragraph[] = [
    { titulo: `Sol en ${SIGNS[sol.sign].nombre}`, texto: TEMPLATES.sol_en[sol.sign], porQue: ubicacion(sol) },
    { titulo: `Luna en ${SIGNS[luna.sign].nombre}`, texto: TEMPLATES.luna_en[luna.sign], porQue: ubicacion(luna) },
  ];
  if (f.angles && f.big3.asc) {
    big3.push({ titulo: `Ascendente en ${SIGNS[f.big3.asc].nombre}`, texto: TEMPLATES.asc_en[f.big3.asc], porQue: `Ascendente a ${formatDegree(f.angles.asc)} de ${SIGNS[f.big3.asc].nombre}` });
  }

  let regente: Paragraph | null = null;
  if (f.chartRuler && f.big3.asc) {
    const r = byId.get(f.chartRuler)!;
    regente = {
      titulo: `Regente de la carta: ${BODY_NAMES[r.id]}`,
      texto: `${capitalizar(conArticulo(r.id))} rige tu Ascendente en ${SIGNS[f.big3.asc].nombre}, así que sus temas suelen teñir toda la carta. ${TEMPLATES.cuerpos[r.id].frase}`,
      porQue: `${SIGNS[f.big3.asc].nombre} tiene como regente tradicional a ${conArticulo(r.id)}, que está ${posicion(r)}`,
    };
  }

  const aspectos = f.aspects.slice(0, 8).map((a) => ({
    titulo: `${pointName(a.a)} en ${TEMPLATES.aspectos[a.type].nombre} con ${pointName(a.b)}`,
    texto: fill(TEMPLATES.aspectos[a.type].frase, { a: pointName(a.a), b: pointName(a.b) }),
    porQue: `orbe de ${a.orb.toFixed(1).replace(".", ",")}°, ${a.applying ? "aplicativo (se está formando)" : "separativo (se está disipando)"}`,
  }));

  const avisos: string[] = [];
  if (f.flags.sinHora) avisos.push(AVISO_SIN_HORA);
  if (f.flags.houseSystemFallback) avisos.push(AVISO_FALLBACK);
  if (f.flags.moonSignUncertain) avisos.push(AVISO_LUNA);

  return { big3, regente, cuerpos: f.bodies.map(bodyParagraph), aspectos, balance: balanceText(f), avisos, marco: AVISO_MARCO };
}
