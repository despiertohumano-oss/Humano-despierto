import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSiteUrl } from "@/lib/server/site-url";
import { getPublishedCourses } from "@/lib/server/courses";
import { getPublishedPosts } from "@/lib/server/diario";
import { getPublicTeachers } from "@/lib/server/guias";
import { CARDS } from "@/lib/tarot/cards";
import { activeSpreads } from "@/lib/tarot/spreads";
import { HOUSE_KEYS } from "@/lib/astro/prose";
import { BODY_IDS, SIGN_IDS, bodySlug } from "@/lib/astro/zodiac";

/** Solo contenido publicado, y sale de la base — no de una lista escrita a mano que se
 * desactualiza el día que alguien despublica un curso. Misma doctrina que los conteos de T-019:
 * un sitemap que promete URLs que dan 404 es peor que no tener sitemap. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // T-091 · sin esto el build lo prerenderiza y necesita la base (asi fallaba el deploy). Se arma
  // por request: el build no depende de Supabase y el sitemap nunca queda viejo.
  await connection();
  const site = getSiteUrl();

  const estaticas: MetadataRoute.Sitemap = [
    { url: `${site}/`, priority: 1 },
    { url: `${site}/cursos`, priority: 0.9 },
    { url: `${site}/guias`, priority: 0.8 },
    { url: `${site}/diario`, priority: 0.7 },
  ];

  const tarot: MetadataRoute.Sitemap = [
    { url: `${site}/tarot`, priority: 0.9 },
    { url: `${site}/tarot/cartas`, priority: 0.7 },
    ...activeSpreads().map((s) => ({ url: `${site}/tarot/${s.slug}`, priority: 0.7 })),
    ...CARDS.map((c) => ({ url: `${site}/tarot/cartas/${c.id}`, priority: 0.5 })),
  ];

  // Solo la portada y las fichas: las cartas personales (/carta-natal/[id]) nunca se indexan.
  const cartaNatal: MetadataRoute.Sitemap = [
    { url: `${site}/carta-natal`, priority: 0.9 },
    ...SIGN_IDS.map((s) => ({ url: `${site}/carta-natal/signos/${s}`, priority: 0.5 })),
    ...BODY_IDS.map((b) => ({ url: `${site}/carta-natal/planetas/${bodySlug(b)}`, priority: 0.5 })),
    ...HOUSE_KEYS.map((n) => ({ url: `${site}/carta-natal/casas/${n}`, priority: 0.5 })),
  ];

  const [cursos, posts, guias] = await Promise.all([
    getPublishedCourses(),
    getPublishedPosts(),
    getPublicTeachers(),
  ]);

  return [
    ...estaticas,
    ...tarot,
    ...cartaNatal,
    ...cursos.map((c) => ({ url: `${site}/cursos/${c.slug}`, priority: 0.8 })),
    ...guias.map((g) => ({ url: `${site}/guias/${g.slug}`, priority: 0.6 })),
    ...posts.map((p) => ({
      url: `${site}/diario/${p.slug}`,
      lastModified: new Date(p.publishedAt),
      priority: 0.5,
    })),
  ];
}
