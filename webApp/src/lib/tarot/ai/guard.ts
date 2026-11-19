// T-106 · Guarda de la lectura redactada: nada sale del modelo a la pantalla sin pasar por acá.
// Ante cualquier duda rechaza; la página ya muestra la lectura por plantillas como respaldo.
import { FORBIDDEN_TERMS } from "@/content/forbidden-terms";
import { CARDS } from "../cards";
import type { ReadingFacts } from "../reading";

export type GuardResult = { ok: true; paragraphs: string[] } | { ok: false; reason: GuardReason };
export type GuardReason = "largo" | "formato" | "contenido" | "metodo" | "prediccion" | "inventa" | "cartas";

const MIN_WORDS = 180;
// Una sola carta da para menos texto.
const MIN_WORDS_ONE_CARD = 110;
const MAX_WORDS = 650;
const MAX_CHARS = 5000;
const MAX_PARAGRAPHS = 8;

// Con clases de caracteres: forbidden-terms.test.ts barre cada línea de src/ con la lista literal.
const METODO = /m[aá]scara\s+de\s+la\s+esenci[a]|\bdesequilibri[o]\s*:|\bequilibri[o]\s*:|\bpregunta[r]se\b|waite\s+no\s+cit[a]/i;

// Las reglas de abajo leen el texto sin tildes y en minúscula (`fold`).
const SELF = /modelo de lenguaje|inteligencia artificial|\bcomo (?:una )?ia\b|\bsoy (?:un|una) (?:modelo|asistente|ia)\b|\b(?:mis|estas) instrucciones\b|\binstrucciones del sistema\b|\bprompt\b/;

// Enlaces y contactos: una inyección en la pregunta no puede poner un contacto con la voz de la escuela.
const LINKS = [
  /https?:\/\/|\bwww\.|\]\s*\(/i,
  /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
  /\b[a-z0-9-]+\.(?:com|net|org|ar|io|info|app|dev|ly|me|co|es|xyz|site|online|shop|link|tv)\b/i,
  // 7 dígitos o más, con espacios, guiones, puntos o paréntesis entre medio.
  /(?:\+?\d[\s().-]{0,2}){7,}/,
];

const MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
const DIAS = "lunes|martes|miercoles|jueves|viernes|sabado|domingo";
const UNIDAD = "dia|dias|semana|semanas|mes|meses|ano|anos|hora|horas";
const CANTIDAD = "un|una|unos|unas|pocos|pocas|algunos|algunas|varios|varias|\\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta";

// Regla general de predicción: un futuro (perifrástico «vas/va/van a …» o simple «-rás/-rá/-rán») seguido
// de un desenlace concreto (conseguir, casarse, cobrar, curarse, morir, volver…). El futuro solo, sin
// desenlace («vas a necesitar paciencia»), pasa: eso lo cuida el prompt.
const DESENLACES =
  "consegu|encontrar|casar|divorciar|separar|ganar|cobrar|recibir|heredar|curar|sanar|morir|enfermar|embaraz|quedar embarazad|ascender|aprobar|volver|regresar|llegar|perder|mudar|triunfar|ir bien|salir bien|salir todo bien|tener (?:un |una )?(?:accidente|hijo|hija|bebe)";
const FUTURO_SIMPLE =
  "consegui|encontra|casa|divorcia|separa|gana|cobra|recibi|hereda|cura|sana|mori|enferma|embaraza|ascende|aproba|volve|regresa|llega|perde|muda|triunfa";

const PREDICCION = [
  // salud
  /\benferm\w*|\bdiagnost\w*|\bcancer\b|\bembaraz\w*|\btumor\w*|\bquirurg\w*|\bcirugia\w*|\bhospital\w*/,
  // muerte de personas; «la Muerte» como carta y «la muerte de un ciclo» pasan
  /\bmori\w*|\bmuri\w*|\bmuer(?:a|as|an)\b|\bmuert[oa]s?\b|\bfallec\w*|\bfuneral\w*|\bvelorio\w*|\bmuerte de (?:tu|tus|su|sus|mi|mis|alguien|algun|alguna|un ser|una persona|un familiar|un pariente|un amigo|una amiga)\b/,
  // fechas y plazos
  new RegExp(`\\b(?:${MESES}|${DIAS})\\b`),
  /\b(?:19|20)\d\d\b|\b\d{1,2}\s*[/.-]\s*\d{1,2}\b/,
  new RegExp(`\\b(?:en|dentro de)\\s+(?:(?:${CANTIDAD})\\s+)?(?:${UNIDAD})\\b`),
  new RegExp(`\\b(?:${UNIDAD})\\s+que viene\\b|\\bproxim[oa]s?\\s+(?:${UNIDAD})\\b|\\b(?:${UNIDAD})\\s+proxim[oa]s?\\b|\\bdentro de poco\\b|\\bpasado manana\\b|\\bantes de fin de ano\\b`),
  // dinero
  /\bherenci\w*|\bloteria\b|\bapuestas?\b|\bcasino\b|\bdinero asegurado\b/,
  /\b(?:plata|dinero|premio)\b[^.]{0,40}\b(?:lleg\w*|vas a|va a|vendra\w*)|\b(?:lleg\w*|vas a|va a)\b[^.]{0,30}\b(?:plata|dinero|premio)\b/,
  // futuro + desenlace
  new RegExp(`\\b(?:vas|va|van|vamos) a (?:\\S+ ){0,2}?(?:${DESENLACES})`),
  new RegExp(`\\b(?:${FUTURO_SIMPLE})r(?:as|a|an|e|emos)\\b`),
];

// Garantías: rechazadas salvo negadas («nada está garantizado», «no te aseguro nada»).
const GARANTIA = /\bte aseguro\b|\bgarantiz\w*|\basegurad[oa]s?\b|\bes seguro que\b/g;
const NEGACION = /\b(?:no|nada|nunca|ni|sin|nadie|tampoco)\b/;

function affirmedGuarantee(folded: string): boolean {
  for (const m of folded.matchAll(GARANTIA)) {
    const before = folded.slice(Math.max(0, m.index - 30), m.index);
    if (!NEGACION.test(before)) return true;
  }
  return false;
}

// Sin tildes, conservando mayúsculas (para distinguir «la Fuerza» de «la fuerza»).
const strip = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");
const fold = (s: string) => strip(s).toLowerCase();

const PALOS = "bastos|copas|espadas|oros";
const RANGOS = "as|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|sota|paje|caballero|caballo|reina|rey";
const MENOR = new RegExp(`\\b(?:${RANGOS}) de (?:${PALOS})\\b`, "g");
// «Paje» es otro nombre de la Sota; «caballo», del caballero.
const canonMinor = (s: string) => s.replace(/^paje /, "sota ").replace(/^caballo /, "caballero ");

/**
 * Un arcano mayor cuenta como nombrado solo con su artículo y la mayúscula del nombre («la Fuerza»,
 * «del Sol») o en la forma «la carta de(l) …» en cualquier caja. Así «la fuerza que tenés» o «el sol
 * de la mañana» no cuentan ni como carta nombrada ni como carta inventada.
 */
type MajorPattern = { id: string; byArticle: RegExp; byCarta: RegExp };
const MAJOR_PATTERNS: MajorPattern[] = CARDS.filter((c) => c.arcano === "mayor").map((c) => {
  const [art, ...rest] = strip(c.nombre_es).split(" ");
  const noun = rest.join("\\s+");
  const article = art === "El" ? "(?:[Ee]l|[Dd]el|[Aa]l)" : art === "La" ? "[Ll]a" : "[Ll]os";
  return {
    id: c.id,
    byArticle: new RegExp(`\\b${article}\\s+${noun}\\b`),
    byCarta: new RegExp(`\\bcarta\\s+(?:de|del)\\s+(?:(?:la|el|los)\\s+)?${noun.toLowerCase()}\\b`),
  };
});
const majorMentioned = (m: MajorPattern, stripped: string, folded: string) => m.byArticle.test(stripped) || m.byCarta.test(folded);

function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*|__/g, "")
    // Cursiva suelta: se limpia para que el asterisco no llegue crudo a la pantalla.
    .replace(/[*_]/g, "")
    .replace(/«\s*/g, "“")
    .replace(/\s*»/g, "”")
    .trim();
}

export function guardReading(raw: string, facts: ReadingFacts): GuardResult {
  const text = normalize(raw);
  if (text.length === 0 || text.length > MAX_CHARS) return { ok: false, reason: "largo" };
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  const words = text.split(/\s+/).length;
  if (words < (facts.placed.length === 1 ? MIN_WORDS_ONE_CARD : MIN_WORDS) || words > MAX_WORDS || paragraphs.length > MAX_PARAGRAPHS) return { ok: false, reason: "largo" };

  if (LINKS.some((re) => re.test(text))) return { ok: false, reason: "contenido" };
  if (/^\s*(?:#|[-•]\s|\d+[.)]\s|>)/m.test(text) || /[<>`|[\]]/.test(text) || /\p{Extended_Pictographic}/u.test(text)) {
    return { ok: false, reason: "formato" };
  }
  if (METODO.test(text)) return { ok: false, reason: "metodo" };
  const stripped = strip(text);
  const folded = stripped.toLowerCase();
  if (FORBIDDEN_TERMS.test(text) || SELF.test(folded)) return { ok: false, reason: "contenido" };
  if (PREDICCION.some((re) => re.test(folded)) || affirmedGuarantee(folded)) return { ok: false, reason: "prediccion" };

  const inReading = new Set(facts.placed.map((p) => p.card.id));
  // La quintaesencia no está en la mesa, pero el motor la nombra en los datos: no es un invento.
  if (facts.quintessence) inReading.add(facts.quintessence.id);
  const minorNames = new Set(facts.placed.filter((p) => p.card.arcano === "menor").map((p) => fold(p.card.nombre_es)));
  for (const m of folded.matchAll(MENOR)) if (!minorNames.has(canonMinor(m[0]))) return { ok: false, reason: "inventa" };
  for (const m of MAJOR_PATTERNS) if (!inReading.has(m.id) && majorMentioned(m, stripped, folded)) return { ok: false, reason: "inventa" };

  const named = facts.placed.filter((p) => {
    if (p.card.arcano === "menor") return [...folded.matchAll(MENOR)].some((m) => canonMinor(m[0]) === fold(p.card.nombre_es));
    return majorMentioned(MAJOR_PATTERNS.find((m) => m.id === p.card.id)!, stripped, folded);
  }).length;
  if (named < Math.ceil(facts.placed.length / 2)) return { ok: false, reason: "cartas" };

  return { ok: true, paragraphs };
}
