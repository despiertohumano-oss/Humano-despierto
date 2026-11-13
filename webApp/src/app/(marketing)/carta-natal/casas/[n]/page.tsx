import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaLayout from "@/components/carta-natal/FichaLayout";
import { fichaTitle, houseDescription, pageOpenGraph } from "@/lib/seo/meta";
import { HOUSE_KEYS, TEMPLATES, type HouseKey } from "@/lib/astro/prose";

const isHouse = (n: string): n is HouseKey => (HOUSE_KEYS as readonly string[]).includes(n);
const TIPO = (n: number) => ([1, 4, 7, 10].includes(n) ? "Angular" : [2, 5, 8, 11].includes(n) ? "Sucedente" : "Cadente");

export function generateStaticParams() {
  return HOUSE_KEYS.map((n) => ({ n }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  if (!isHouse(n)) return { title: "Casa no encontrada" };
  const e = TEMPLATES.casas[n];
  const title = fichaTitle(e.nombre);
  const description = houseDescription(e.nombre, e.palabras_clave);
  const url = `/carta-natal/casas/${n}`;
  return { title, description, alternates: { canonical: url }, openGraph: pageOpenGraph({ title, description, url, type: "article" }) };
}

export default async function CasaPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  if (!isHouse(n)) notFound();
  const k = Number(n);
  const prev = String(((k + 10) % 12) + 1) as HouseKey;
  const next = String((k % 12) + 1) as HouseKey;
  return (
    <FichaLayout
      kicker="Casas"
      entry={TEMPLATES.casas[n]}
      datos={[["Tipo", TIPO(k)]]}
      path={`/carta-natal/casas/${n}`}
      prev={{ href: `/carta-natal/casas/${prev}`, label: `Casa ${prev}` }}
      next={{ href: `/carta-natal/casas/${next}`, label: `Casa ${next}` }}
    />
  );
}
