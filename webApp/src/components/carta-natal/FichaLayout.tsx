import Link from "next/link";
import Icon, { type AstroIconName } from "@/components/atoms/Icon";
import { ButtonLink } from "@/components/atoms/Button";
import { AVISO_MARCO, type TextEntry } from "@/lib/astro/prose";
import { getSiteUrl } from "@/lib/server/site-url";
import AstroEthicsNote from "./AstroEthicsNote";

type Vecino = { href: string; label: string };
type Props = {
  kicker: string;
  entry: TextEntry;
  datos: [string, string][];
  path: string;
  prev: Vecino;
  next: Vecino;
  icon?: AstroIconName;
};

export default function FichaLayout({ kicker, entry, datos, path, prev, next, icon }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${entry.nombre} en la carta natal`,
    about: { "@type": "Thing", name: entry.nombre },
    keywords: entry.palabras_clave.join(", "),
    url: `${getSiteUrl()}${path}`,
    inLanguage: "es-AR",
  };
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-[900px] px-6 pt-8">
        <Link href="/carta-natal" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline">
          <Icon name="arrow-left" />
          Carta natal
        </Link>
      </div>
      <main className="mx-auto max-w-[900px] space-y-10 px-6 pb-20 pt-6">
        <header>
          <p className="text-sm font-semibold text-miel-800">{kicker}</p>
          <h1 className="mt-2 flex items-center gap-4 text-display-lg leading-[1.08] tracking-[-0.025em]">
            {icon && <Icon name={icon} className="h-10 w-10 text-musgo" />}
            {entry.nombre}
          </h1>
          <ul className="mt-5 flex flex-wrap gap-2">
            {entry.palabras_clave.map((k) => <li key={k} className="rounded-pill bg-miel-100 px-3 py-1 text-sm text-bosque">{k}</li>)}
          </ul>
        </header>
        <article className="space-y-4 text-lg">
          {entry.ficha.map((p) => <p key={p.slice(0, 32)} className="max-w-[65ch]">{p}</p>)}
        </article>
        {datos.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            {datos.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-suave">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <ButtonLink href="/carta-natal" arrow>Calculá tu carta</ButtonLink>
        <nav aria-label="Fichas vecinas" className="flex justify-between gap-4 text-sm font-semibold">
          <Link href={prev.href} className="inline-flex min-h-10 items-center text-miel-800 hover:underline">{prev.label}</Link>
          <Link href={next.href} className="inline-flex min-h-10 items-center text-miel-800 hover:underline">{next.label}</Link>
        </nav>
        <AstroEthicsNote text={AVISO_MARCO} />
      </main>
    </div>
  );
}
