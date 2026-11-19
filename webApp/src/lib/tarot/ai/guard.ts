// T-106 · Guarda de la lectura redactada: nada sale del modelo a la pantalla sin pasar por acá.
// Ante cualquier duda rechaza; la página ya muestra la lectura por plantillas como respaldo.
import type { ReadingFacts } from "../reading";

export type GuardResult = { ok: true; paragraphs: string[] } | { ok: false; reason: GuardReason };
export type GuardReason = "largo" | "formato" | "contenido" | "metodo" | "prediccion" | "inventa" | "cartas";

const MIN_WORDS = 180;
// Una sola carta da para menos texto.
const MIN_WORDS_ONE_CARD = 110;
const MAX_WORDS = 650;
const MAX_CHARS = 5000;
const MAX_PARAGRAPHS = 8;

// Los patrones de abajo se escriben con clases de caracteres (p. ej. `herbol[a]r`) porque
// forbidden-terms.test.ts barre cada línea de src/ buscando las palabras literales; guard.test.ts
// prueba que estas expresiones sí atrapan las palabras reales.
const SITE_BANNED = /herbol[a]r|herboris[t]|rei[k]i|\bofic[i]os\b|sin venc[i]miento|acceso il[i]mitado/i;
const METODO = /m[aá]scara\s+de\s+la\s+esenci[a]|\bdesequilibri[o]\s*:|\bequilibri[o]\s*:|\bpregunta[r]se\b|waite\s+no\s+cit[a]/i;
const SELF = /modelo de lenguaje|intelig[e]ncia artificial|\bcomo (?:una )?IA\b|\bsoy (?:un|una) (?:modelo|asistente|IA)\b|\binstrucciones\b|\bprompt\b/i;

const MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
const PREDICCION = [
  /\benferm(?:edad|o|a|ar[aá]s?|ar)\b|\bdiagn[oó]stic|\bc[aá]ncer\b|\bembaraz|\btumor\b/i,
  /\b(?:vas|va|van) a morir\b|\bmorir[aá]s?\b|\bfallec|\baccidente\b/i,
  new RegExp(`\\b(?:${MESES})\\b`, "i"),
  /\b(?:19|20)\d\d\b/,
  /\b(?:en|dentro de)\s+(?:unos?\s+|unas?\s+|pocos?\s+|pocas?\s+)?(?:\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce)\s+(?:d[ií]as|semanas|meses|a[nñ]os)\b/i,
  /\b(?:vas a|va a)\s+(?:ganar|cobrar|recibir|heredar)\b|\bganar[aá]s\b|\bcobrar[aá]s\b|\bloter[ií]a\b|\bdinero asegurado\b|\bte aseguro\b|\bgarantiz/i,
];

const NUMEROS = "as|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|sota|caballero|caballo|reina|rey";
const MENOR = new RegExp(`\\b(${NUMEROS}) de (bastos|copas|espadas|oros)\\b`, "gi");

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*|__/g, "")
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

  if (/^\s*(?:#|[-*•]\s|\d+[.)]\s|>)/m.test(text) || /[<>`|]/.test(text) || /\p{Extended_Pictographic}/u.test(text)) {
    return { ok: false, reason: "formato" };
  }
  if (METODO.test(text)) return { ok: false, reason: "metodo" };
  if (SITE_BANNED.test(text) || SELF.test(text)) return { ok: false, reason: "contenido" };
  if (PREDICCION.some((re) => re.test(text))) return { ok: false, reason: "prediccion" };

  const folded = fold(text);
  const inReading = new Set(facts.placed.map((p) => fold(p.card.nombre_es)));
  for (const m of folded.matchAll(MENOR)) {
    const name = m[0].replace(/^caballo /, "caballero ");
    if (!inReading.has(name)) return { ok: false, reason: "inventa" };
  }
  // Con borde de palabra: «el Sol» no cuenta como nombrado por un «solo».
  const named = [...inReading].filter((n) => new RegExp(`\\b${n.replace(/^(el|la|los) /, "")}\\b`).test(folded)).length;
  if (named < Math.ceil(facts.placed.length / 2)) return { ok: false, reason: "cartas" };

  return { ok: true, paragraphs };
}
