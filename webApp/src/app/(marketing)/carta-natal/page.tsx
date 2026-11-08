import type { Metadata } from "next";
import Link from "next/link";
import ChartForm from "@/components/carta-natal/ChartForm";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { getCurrentUser } from "@/lib/server/auth";
import { HOUSE_KEYS } from "@/lib/astro/prose";
import { BODY_IDS, BODY_NAMES, SIGNS, SIGN_IDS, bodySlug } from "@/lib/astro/zodiac";

export const metadata: Metadata = {
  title: "Carta natal gratis: calculá tu carta astral",
  description: "Calculá tu carta natal con Sol, Luna, Ascendente, casas Placidus o de signo entero, Quirón, Lilith y nodos, y leé una interpretación escrita por la escuela.",
  alternates: { canonical: "/carta-natal" },
  openGraph: { title: "Carta natal gratis", description: "Tu carta natal con rueda, tablas e interpretación.", url: "/carta-natal", type: "website", images: [SITE_OG_IMAGE] },
};

function Indice({ titulo, links }: { titulo: string; links: { href: string; label: string }[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-bosque">{titulo}</h2>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="inline-flex min-h-10 items-center font-semibold text-miel-800 hover:underline">{l.label}</Link></li>
        ))}
      </ul>
    </section>
  );
}

export default async function CartaNatalPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <div className="mx-auto max-w-[1000px] px-6 pb-8 pt-10">
        <p className="text-sm font-semibold text-miel-800">Carta natal</p>
        <h1 className="mt-3 max-w-[20ch] text-display-lg leading-[1.08] tracking-[-0.025em]">Calculá tu carta natal</h1>
        <p className="mt-5 max-w-[60ch] text-lg text-suave">
          Con la fecha, la hora y el lugar de nacimiento armamos tu rueda, las posiciones de los planetas y una lectura para empezar a conocerla. Si no sabés la hora, también se puede: te mostramos lo que se puede calcular sin ella.
        </p>
      </div>
      <main className="mx-auto max-w-[1000px] space-y-16 px-6 pb-20">
        <ChartForm mode="libre" signedIn={user !== null} isTeacher={user?.role === "teacher"} />
        <div className="space-y-8">
          <Indice titulo="Los signos" links={SIGN_IDS.map((s) => ({ href: `/carta-natal/signos/${s}`, label: SIGNS[s].nombre }))} />
          <Indice titulo="Planetas y puntos" links={BODY_IDS.map((b) => ({ href: `/carta-natal/planetas/${bodySlug(b)}`, label: BODY_NAMES[b] }))} />
          <Indice titulo="Las casas" links={HOUSE_KEYS.map((n) => ({ href: `/carta-natal/casas/${n}`, label: `Casa ${n}` }))} />
        </div>
      </main>
    </div>
  );
}
