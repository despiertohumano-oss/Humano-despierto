// Preguntas de salud, embarazo o muerte: no van al modelo, se quedan con la lectura por plantillas.
// Va aparte de `classifyDomain` (reading.ts): ese elige un solo tema para las plantillas y "amor" gana
// sobre "salud"; acá alcanza con que el tema aparezca.
const SENSITIVE = new RegExp(
  [
    "embaraz", "encinta", "en estado\\b", "fertil", "\\bbebes?\\b", "\\babort",
    "\\btener (?:un |una |otro |otra |mas )?(?:hijo|hija|hijos|hijas)\\b",
    "\\bser (?:mama|papa|madre|padre)\\b",
    "\\bsalud\\b", "enferm", "\\bcurar", "\\bcura(?:rme|rse|rte|ra|ran)?\\b", "\\bsanar", "\\boperar", "\\boperaci", "\\bopere",
    "cirug", "quirurg", "\\bcancer\\b", "tumor", "diagnost", "\\bmedic", "hospital", "internac", "tratamiento",
    "depresi", "suicid", "\\bmorir", "\\bmuer", "\\bmuri", "fallec", "\\bluto\\b", "accidente",
  ].join("|"),
);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function isSensitiveQuestion(question: string | null | undefined): boolean {
  return typeof question === "string" && question.length > 0 && SENSITIVE.test(fold(question));
}
