import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaLayout from "@/components/carta-natal/FichaLayout";
import { astroIcon } from "@/components/atoms/Icon";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { TEMPLATES } from "@/lib/astro/prose";
import { BODY_NAMES, SIGNS, SIGN_IDS, isSignId } from "@/lib/astro/zodiac";

export function generateStaticParams() {
  return SIGN_IDS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isSignId(slug)) return { title: "Signo no encontrado" };
  const e = TEMPLATES.signos[slug];
  const title = `${e.nombre} en la carta natal: significado`;
  const description = `${e.nombre}: ${e.palabras_clave.join(", ")}. Signo de ${SIGNS[slug].elemento}, ${SIGNS[slug].modalidad}.`;
  const url = `/carta-natal/signos/${slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article", images: [SITE_OG_IMAGE] } };
}

export default async function SignoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSignId(slug)) notFound();
  const i = SIGN_IDS.indexOf(slug);
  const prev = SIGN_IDS[(i + 11) % 12]!;
  const next = SIGN_IDS[(i + 1) % 12]!;
  const s = SIGNS[slug];
  return (
    <FichaLayout
      kicker="Signo"
      icon={astroIcon(slug)}
      entry={TEMPLATES.signos[slug]}
      datos={[["Elemento", s.elemento], ["Modalidad", s.modalidad], ["Regente tradicional", BODY_NAMES[s.regente]]]}
      path={`/carta-natal/signos/${slug}`}
      prev={{ href: `/carta-natal/signos/${prev}`, label: SIGNS[prev].nombre }}
      next={{ href: `/carta-natal/signos/${next}`, label: SIGNS[next].nombre }}
    />
  );
}
