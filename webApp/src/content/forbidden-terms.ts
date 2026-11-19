// Términos que no pueden volver al sitio (spec de contenidos 2026-11-08 y D2 del tarot). Una sola
// lista: la barre forbidden-terms.test.ts sobre src/ y la usa la guarda de la lectura redactada (T-106).
// Cada término lleva una clase de caracteres (`rei[k]i`) para que esta línea no se atrape a sí misma.
export const FORBIDDEN_TERMS =
  /herbol[a]r|herboris[t]|rei[k]i|\bofic[i]os\b|sin venc[i]miento|acceso il[i]mitado|queda tu certif[i]cado|certif[i]cado con tu nombre|m[aá]scara de la esenci[a]|\bpregunta[r]se\b/i;
