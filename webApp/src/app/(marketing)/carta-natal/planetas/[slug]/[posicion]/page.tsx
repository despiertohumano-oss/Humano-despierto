import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PosicionLayout from "@/components/carta-natal/PosicionLayout";
import { POSICION_RUTAS, posicionPath, resolverPosicion, tituloPosicion } from "@/lib/astro/posicion-rutas";
import { pageOpenGraph, posicionDescription, posicionTitle } from "@/lib/seo/meta";

type Params = { params: Promise<{ slug: string; posicion: string }> };

export function generateStaticParams() {
  return POSICION_RUTAS;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, posicion } = await params;
  const ref = resolverPosicion(slug, posicion);
  if (!ref) return { title: "Posición no encontrada" };
  const title = posicionTitle(tituloPosicion(ref.planeta, ref.tipo, ref.clave));
  const description = posicionDescription(ref.entrada.texto);
  const url = posicionPath(ref.planeta, ref.tipo, ref.clave);
  return { title, description, alternates: { canonical: url }, openGraph: pageOpenGraph({ title, description, url, type: "article" }) };
}

export default async function PosicionPage({ params }: Params) {
  const { slug, posicion } = await params;
  const ref = resolverPosicion(slug, posicion);
  if (!ref) notFound();
  return <PosicionLayout posicion={ref} />;
}
