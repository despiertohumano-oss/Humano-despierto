export const MAX_QUESTION = 140;

export function sanitizeQuestion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u200B\u200C\u200D\uFEFF\u2028\u2029\u202A-\u202E\u2066-\u2069]/gu, " ")
    .replace(/\p{Cc}/gu, " ")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const q = Array.from(cleaned).slice(0, MAX_QUESTION).join("").trimEnd();
  return q.length ? q : null;
}

export type QuestionType = "si_no" | "cuando" | "que_hacer" | "el_otro" | "como_sale" | "general";

// Orden de prioridad: la primera que coincide gana (spec T-094 §6.1).
const TIPOS: [Exclude<QuestionType, "general">, RegExp][] = [
  ["cuando", /\b(cu[aá]ndo|cu[aá]nto falta|cu[aá]nto tiempo|qu[eé] fecha)/iu],
  ["el_otro", /\b(qu[eé] siente|qu[eé] piensa|piensa en m[ií]|me quiere|me ama|me extra[nñ]a|qu[eé] le pasa|siente algo|est[aá] enamorad)/iu],
  ["que_hacer", /\b(qu[eé] (hago|puedo hacer|debo|deber[ií]a|me conviene)|deber[ií]a|debo|me conviene|conviene|c[oó]mo hago|qu[eé] camino)/iu],
  ["como_sale", /\b(c[oó]mo (me va|va a|le va|ir[aá]|saldr[aá]|sigue|termina|viene)|qu[eé] va a pasar|qu[eé] pasar[aá])/iu],
  ["si_no", /^¿?\s*(va|van|voy|vuelve|volver[aá]|consigo|conseguir[eé]|me|lo|la|le|es|est[aá]|hay|tengo|tendr[eé]|puedo|podr[eé]|sale|saldr[aá]|ser[aá]|habr[aá]|quiere|se)\b/iu],
];

export function classifyQuestion(q: string | null): QuestionType {
  if (!q) return "general";
  for (const [tipo, re] of TIPOS) if (re.test(q)) return tipo;
  return "general";
}
