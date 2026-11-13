import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaLayout from "@/components/carta-natal/FichaLayout";
import { astroIcon } from "@/components/atoms/Icon";
import { bodyDescription, fichaTitle, pageOpenGraph } from "@/lib/seo/meta";
import { TEMPLATES } from "@/lib/astro/prose";
import { BODY_IDS, BODY_NAMES, SIGNS, SIGN_IDS, bodyBySlug, bodySlug, type BodyId } from "@/lib/astro/zodiac";

const TIPO: Partial<Record<BodyId, string>> = {
  quiron: "Cuerpo menor (centauro)",
  nodo_norte: "Punto calculado: nodo verdadero de la Luna",
  lilith_media: "Punto calculado: apogeo medio de la Luna",
};

export function generateStaticParams() {
  return BODY_IDS.map((b) => ({ slug: bodySlug(b) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = bodyBySlug(slug);
  if (!id) return { title: "Planeta no encontrado" };
  const e = TEMPLATES.cuerpos[id];
  const title = fichaTitle(e.nombre);
  const description = bodyDescription(e.nombre, e.palabras_clave);
  const url = `/carta-natal/planetas/${slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: pageOpenGraph({ title, description, url, type: "article" }) };
}

export default async function PlanetaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = bodyBySlug(slug);
  if (!id) notFound();
  const i = BODY_IDS.indexOf(id);
  const prev = BODY_IDS[(i + BODY_IDS.length - 1) % BODY_IDS.length]!;
  const next = BODY_IDS[(i + 1) % BODY_IDS.length]!;
  const rige = SIGN_IDS.filter((s) => SIGNS[s].regente === id).map((s) => SIGNS[s].nombre);
  const datos: [string, string][] = [["Tipo", TIPO[id] ?? (id === "sol" || id === "luna" ? "Luminaria" : "Planeta")]];
  if (rige.length > 0) datos.push(["Rige (tradicional)", rige.join(" y ")]);
  return (
    <FichaLayout
      kicker="Planetas y puntos"
      icon={astroIcon(id)}
      entry={TEMPLATES.cuerpos[id]}
      datos={datos}
      path={`/carta-natal/planetas/${slug}`}
      prev={{ href: `/carta-natal/planetas/${bodySlug(prev)}`, label: BODY_NAMES[prev] }}
      next={{ href: `/carta-natal/planetas/${bodySlug(next)}`, label: BODY_NAMES[next] }}
    />
  );
}
