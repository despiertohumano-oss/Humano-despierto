import Link from "next/link";
import Icon, { astroIcon } from "@/components/atoms/Icon";
import { ButtonLink } from "@/components/atoms/Button";
import { posicionPath, tituloPosicion, vecinosDe, type PosicionRef } from "@/lib/astro/posicion-rutas";
import { AVISO_MARCO, TEMPLATES } from "@/lib/astro/prose";
import { BODY_NAMES, SIGNS, bodySlug } from "@/lib/astro/zodiac";
import { getSiteUrl } from "@/lib/server/site-url";
import AstroEthicsNote from "./AstroEthicsNote";

const linkCls = "inline-flex min-h-10 items-center text-miel-800 hover:underline";

export default function PosicionLayout({ posicion }: { posicion: PosicionRef }) {
  const { planeta, tipo, clave, entrada } = posicion;
  const titulo = tituloPosicion(planeta, tipo, clave);
  const path = posicionPath(planeta, tipo, clave);
  const { prev, next } = vecinosDe(posicion);
  const fichaPunto = tipo === "signo"
    ? { href: `/carta-natal/signos/${clave}`, nombre: SIGNS[clave].nombre, frase: TEMPLATES.signos[clave].frase }
    : { href: `/carta-natal/casas/${clave}`, nombre: `la casa ${clave}`, frase: TEMPLATES.casas[clave].frase };
  const contexto = [
    { href: `/carta-natal/planetas/${bodySlug(planeta)}`, nombre: BODY_NAMES[planeta], frase: TEMPLATES.cuerpos[planeta].frase },
    fichaPunto,
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${titulo} en la carta natal`,
    about: { "@type": "Thing", name: titulo },
    url: `${getSiteUrl()}${path}`,
    inLanguage: "es-AR",
  };
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-[900px] px-6 pt-8">
        <Link href="/carta-natal" className={`${linkCls} gap-2 text-sm font-semibold`}>
          <Icon name="arrow-left" />
          Carta natal
        </Link>
      </div>
      <main className="mx-auto max-w-[900px] space-y-10 px-6 pb-20 pt-6">
        <header>
          <p className="text-sm font-semibold text-miel-800">{tipo === "signo" ? "Planeta en signo" : "Planeta en casa"}</p>
          <h1 className="mt-2 flex items-center gap-4 text-display-lg leading-[1.08] tracking-[-0.025em]">
            <Icon name={astroIcon(planeta)} className="h-10 w-10 text-musgo" />
            {titulo}
          </h1>
          <ul className="mt-5 max-w-[65ch] space-y-2 text-suave">
            {contexto.map((c) => (
              <li key={c.href}>
                {c.frase}{" "}
                <Link href={c.href} className="font-semibold text-miel-800 hover:underline">Ver la ficha de {c.nombre}</Link>
              </li>
            ))}
          </ul>
        </header>
        <article className="space-y-6 text-lg">
          <p className="max-w-[65ch]">{entrada.texto}</p>
          <section className="max-w-[65ch] space-y-1">
            <h2 className="text-xl font-bold text-bosque">Luz</h2>
            <p>{entrada.luz}</p>
          </section>
          <section className="max-w-[65ch] space-y-1">
            <h2 className="text-xl font-bold text-bosque">Sombra</h2>
            <p>{entrada.sombra}</p>
          </section>
        </article>
        <ButtonLink href="/carta-natal" arrow>Calculá tu carta natal</ButtonLink>
        <nav aria-label="Posiciones vecinas" className="flex justify-between gap-4 text-sm font-semibold">
          <Link href={posicionPath(prev.planeta, prev.tipo, prev.clave)} className={linkCls}>{tituloPosicion(prev.planeta, prev.tipo, prev.clave)}</Link>
          <Link href={posicionPath(next.planeta, next.tipo, next.clave)} className={linkCls}>{tituloPosicion(next.planeta, next.tipo, next.clave)}</Link>
        </nav>
        <AstroEthicsNote text={AVISO_MARCO} />
      </main>
    </div>
  );
}
