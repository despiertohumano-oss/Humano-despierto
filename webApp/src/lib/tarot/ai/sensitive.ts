// Preguntas de salud, embarazo o muerte: no van al modelo, se quedan con la lectura por plantillas.
// Solo términos inequívocos: los rodeos («¿se salva mi hermano?», «¿tengo algo grave?») los reconoce el
// modelo con su veredicto, y las palabras ambiguas (recuperar, salvar, sana, test) cortaban preguntas comunes.
// Va aparte de `classifyDomain` (reading.ts): ese elige un solo tema para las plantillas y "amor" gana
// sobre "salud"; acá alcanza con que el tema aparezca.
const SENSITIVE = new RegExp(
  [
    // embarazo e hijos por venir (con los errores de tipeo más comunes)
    "embara[zs]", "enbara[zs]", "embarz", "encinta", "en cinta", "en estado\\b", "\\bpren[ae]", "fertil", "concebir", "concepci", "\\bbebes?\\b", "\\babort",
    "\\bciguena", "\\besta esperando\\b", "\\bestoy esperando\\b", "\\bniet[oa]s?\\b", "\\bser abuel[oa]s?\\b", "agrandar la familia",
    "\\b(?:tener|tendre|tendremos|tendra|tendran) (?:un |una |otro |otra |mas )?(?:hijo|hija|hijos|hijas|nene|nena)\\b",
    "\\bser (?:mama|papa|madre|padre|mamas|papas|madres|padres)\\b",
    // salud
    "\\bsalud\\b", "enferm", "\\bcurar", "\\bcura(?:rme|rse|rte|ra|ran)?\\b", "\\bsanar", "\\boperar", "\\boperaci", "\\bopere",
    "ciru[gj]", "quirurg", "\\bcancer\\b", "tumor", "diagnost", "\\bmedic[oa]s?\\b", "\\bmedicament", "hospital", "internac", "tratamiento", "terapia intensiva",
    "sobreviv", "quimio", "biops", "infart", "\\bacv\\b", "covid", "\\bsida\\b", "\\bvih\\b", 
    "\\bestudios? medic", "\\bsintoma",
    // ánimo y crisis
    "depresi", "suicid", "\\bpanico\\b", "\\bmatar(?:me|se|te)?\\b", "quitarme la vida", "no quiero vivir",
    // muerte
    "\\bmorir", "\\bmuer", "\\bmuri", "fallec", "\\bluto\\b", "accidente", "queda de vida", "anos de vida", "cuanto le queda", "cuanto me queda",
    "de este mundo", "de este plano",
    // un veredicto escrito a mano dentro de la pregunta, para torcer el del modelo
    "\\bsensible\\s*:?\\s*(?:si|no)\\b",
  ].join("|"),
);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function isSensitiveQuestion(question: string | null | undefined): boolean {
  return typeof question === "string" && question.length > 0 && SENSITIVE.test(fold(question));
}

export type Verdict = { sensitive: true } | { sensitive: false; text: string };

// Primera línea de la salida del modelo: su veredicto sobre la pregunta (ver SYSTEM_PROMPT). Entiende
// rodeos, sinónimos y errores de tipeo que una lista no cubre. Sin esa línea la salida no vale.
const VERDICT_LINE = /^\s*SENSIBLE\s*:\s*(S[IÍ]|NO)\s*(?:\n|$)/i;

export function readVerdict(raw: string): Verdict | null {
  const m = VERDICT_LINE.exec(raw);
  if (!m) return null;
  if (m[1].toUpperCase() !== "NO") return { sensitive: true };
  const text = raw.slice(m[0].length).trim();
  // Una segunda etiqueta (el modelo se contradice o la repite) invalida la salida: nunca llega a pantalla.
  if (!text || /\bsensible\s*:/i.test(text)) return null;
  return { sensitive: false, text };
}
