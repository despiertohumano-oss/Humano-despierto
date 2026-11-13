import { CARDS } from "@/lib/tarot/cards";
import { activeSpreads } from "@/lib/tarot/spreads";
import { TEMPLATES, HOUSE_KEYS } from "@/lib/astro/prose";
import { BODY_IDS, SIGNS, SIGN_IDS, bodySlug } from "@/lib/astro/zodiac";
import { SITE_NAME } from "@/lib/seo/meta";

/** Guía de las secciones citables para crawlers de IA (llmstxt.org). Solo URLs públicas e indexables. */
export function buildLlmsTxt(site: string): string {
  const l = (title: string, path: string, note?: string) => `- [${title}](${site}${path})${note ? `: ${note}` : ""}`;
  return [
    `# ${SITE_NAME}`,
    "",
    "> Escuela online en español rioplatense de astrología, tarot, constelaciones familiares, magia, gemoterapia y el universo de los símbolos. Cursos a demanda con docentes, tarot online gratis y carta natal gratis, con textos propios de la escuela.",
    "",
    "## Tarot",
    l("Tarot online", "/tarot", "tiradas interactivas con las 78 cartas del Rider-Waite y una lectura que relaciona las cartas"),
    l("Las 78 cartas", "/tarot/cartas", "arcanos mayores y menores, con su significado al derecho e invertida"),
    ...activeSpreads().map((s) => l(s.nombre, `/tarot/${s.slug}`)),
    "",
    "## Significado de cada carta",
    ...CARDS.map((c) => l(c.nombre_es, `/tarot/cartas/${c.id}`)),
    "",
    "## Carta natal",
    l("Carta natal gratis", "/carta-natal", "calculadora de carta natal con interpretación"),
    ...SIGN_IDS.map((s) => l(`${SIGNS[s].nombre} en la carta natal`, `/carta-natal/signos/${s}`)),
    ...BODY_IDS.map((b) => l(`${TEMPLATES.cuerpos[b].nombre} en la carta natal`, `/carta-natal/planetas/${bodySlug(b)}`)),
    ...HOUSE_KEYS.map((n) => l(`${TEMPLATES.casas[n].nombre} en la carta natal`, `/carta-natal/casas/${n}`)),
    "",
    "## La escuela",
    l("Cursos", "/cursos", "catálogo de formaciones por disciplina"),
    l("Nuestros docentes", "/guias", "quienes enseñan en la escuela"),
    l("Diario", "/diario", "escritos de las docentes sobre símbolos, astrología y autoconocimiento"),
    "",
  ].join("\n");
}
