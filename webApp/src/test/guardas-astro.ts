// Guardas de contenido de la carta natal, compartidas por las coberturas de T-101 (posiciones) y T-102 (aspectos de Plutón).

// Reglas 3 y 4 del plan T-101: reflexión sin predicción y sin la jerga del material original.
// \b no entiende letras acentuadas: donde el término las rodea se usan lookarounds explícitos.
export const PROHIBIDOS = new RegExp(
  [
    /enfermedad|enferm[oa]\b|\bsalud\b|\bmuerte|\bmorir\b|\baccident|viudez|\bmatrimonio|\bdivorcio|(?<!\p{L})herencias?(?!\p{L})|(?<!\p{L})c[aá]rcel|\bvicios?\b|\bkarma|vidas? pasadas?|\bvas a\b|\bnativ[oa]s?\b|\bafligid|\baspectad|mal[eé]fic|\bviril|\bla mujer\b/u
      .source,
    // QA de T-101 (intento 1): viudez, herencias, finales, encierro, vicios, karma, matrimonio, mudanzas, juego, ruina.
    /(?<!\p{L})viud|(?<!\p{L})hered|(?<!\p{L})fallec|(?<!\p{L})prisi[oó]n|(?<!\p{L})adicci|(?<!\p{L})alcoh[oó]l|(?<!\p{L})reencarn/u.source,
    /(?<!\p{L})cas(?:arse|arte|amientos?)(?!\p{L})|(?<!\p{L})bodas?(?!\p{L})|(?<!\p{L})c[oó]nyuges?(?!\p{L})|(?<!\p{L})k[aá]rmic/u.source,
    /(?<!\p{L})mudanzas?(?!\p{L})|(?<!\p{L})apuestas?(?!\p{L})|(?<!\p{L})ruinas?(?!\p{L})/u.source,
    // Predicción en futuro.
    /(?<!\p{L})(?:tendr[aá]s|ser[aá]s|te esperan?)(?!\p{L})/u.source,
  ].join("|"),
  "iu",
);

const palabras = (o: string): string[] => o.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().match(/\p{L}+/gu) ?? [];
const partir = (texto: string): string[] => texto.split(/(?<=[.!?])\s+/);

// Primeras `n` palabras de cada oración, sin acentos ni mayúsculas.
export function arranques(texto: string, n = 2): string[] {
  return partir(texto)
    .map((o) => palabras(o).slice(0, n).join(" "))
    .filter((a) => a.length > 0);
}

// Cada oración normalizada: sin acentos, mayúsculas ni puntuación.
export function oraciones(texto: string): string[] {
  return partir(texto)
    .map((o) => palabras(o).join(" "))
    .filter((o) => o.length > 0);
}
