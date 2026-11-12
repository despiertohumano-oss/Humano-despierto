import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SectionHeading from "@/components/atoms/SectionHeading";
import { ButtonLink } from "@/components/atoms/Button";
import { BRAND } from "@/content/brand-images";
import EthicsNote from "@/components/tarot/EthicsNote";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { activeSpreads, type Spread } from "@/lib/tarot/spreads";

export const metadata: Metadata = {
  title: "Tarot online gratis: tiradas con el Rider-Waite",
  description: "Tirá las cartas online con las 78 del tarot Rider-Waite: carta del día, sí o no, cruz celta, karma, relaciones y tirada astrológica, con una lectura que relaciona las cartas entre sí.",
  alternates: { canonical: "/tarot" },
  openGraph: { title: "Tarot online gratis", description: "Tiradas con las 78 cartas del Rider-Waite y una lectura que las relaciona.", url: "/tarot", type: "website", images: [SITE_OG_IMAGE] },
};

function SpreadList({ spreads }: { spreads: Spread[] }) {
  return (
    <ul className="-mt-2 grid gap-5 sm:grid-cols-2">
      {spreads.map((s) => (
        <li key={s.slug} className="tarjeta flex flex-col gap-3 p-6">
          <h3 className="text-xl font-bold text-bosque">{s.nombre}</h3>
          <p className="text-suave">{s.descripcion}</p>
          <p className="text-sm text-suave">{s.cartas.join(" o ")} {s.cartas[0] === 1 && s.cartas.length === 1 ? "carta" : "cartas"}</p>
          <div className="mt-auto pt-2">
            <ButtonLink href={`/tarot/${s.slug}`} arrow>Tirar</ButtonLink>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TarotPage() {
  const spreads = activeSpreads();
  const rapidas = spreads.filter((s) => s.fuente === null);
  const taller = spreads.filter((s) => s.fuente !== null);
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      {/* Cabecera cósmica: imagen de la dueña bajo un velo `noche`; el texto es `papel`, nunca `oro`. */}
      <header className="cosmico relative overflow-hidden">
        <Image src={BRAND.heroGalaxia.src} alt="" fill preload sizes="100vw" className="object-cover object-center" />
        <div aria-hidden="true" className="cosmico-velo absolute inset-0" />
        <div className="relative mx-auto max-w-[1200px] px-6 pb-14 pt-12 md:pb-20 md:pt-16">
          <p className="text-sm font-semibold">Tarot online</p>
          <h1 className="mt-3 max-w-[22ch] text-display-lg leading-[1.08] tracking-[-0.025em]">
            El lenguaje de los arquetipos. Un encuentro con los símbolos del Tarot.
          </h1>
          <p className="mt-5 max-w-[56ch] text-lg">
            Explorá el universo de los 78 arcanos del Tarot Rider-Waite. Elegí una tirada, descubrí sus símbolos y encontrá nuevas perspectivas a través de la lectura de las cartas.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pb-20 pt-12">
        <p className="text-sm font-semibold text-miel-800">Elegí una tirada</p>
        <SectionHeading title="Para una consulta rápida" />
        <SpreadList spreads={rapidas} />
        <div className="mt-12">
          <SectionHeading title="Las tiradas del taller" />
          <SpreadList spreads={taller} />
        </div>

        <section className="mt-16 grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold text-miel-800">Antes de tirar</p>
            <SectionHeading title="Qué es el tarot y cómo leerlo" />
            <div className="-mt-4 space-y-4 text-tinta">
              <p>El Tarot es un lenguaje de imágenes, símbolos y arquetipos que nos invita a explorar distintas dimensiones de la experiencia humana.</p>
              <p>Sus 78 arcanos conforman un universo simbólico que puede ayudarnos a reflexionar sobre situaciones, procesos, desafíos y posibilidades.</p>
              <p>Leer el Tarot implica aprender a observar, relacionar e interpretar. Cada carta tiene un significado propio, pero su mensaje también se transforma según las cartas que la acompañan, la posición que ocupa y la pregunta que orienta la lectura.</p>
            </div>
            <Link href="/tarot/cartas" className="mt-6 inline-flex min-h-10 items-center text-sm font-semibold text-miel-800 hover:underline">Ver las 78 cartas y sus significados</Link>
          </div>
          <EthicsNote />
        </section>

        {/* Bloque final cósmico: el texto va sobre `noche` sólido y la imagen al costado, con su alt. */}
        <section aria-labelledby="tarot-cursos-titulo" className="cosmico mt-20 grid overflow-hidden rounded-[24px] md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-start justify-center gap-5 px-6 py-12 md:px-14 md:py-16">
            <h2 id="tarot-cursos-titulo" className="max-w-[18ch] text-[clamp(26px,3vw,38px)]">
              ¿Querés profundizar en el lenguaje del Tarot?
            </h2>
            <p className="max-w-[44ch]">
              Descubrí nuestras formaciones y aprendé a interpretar los arcanos, sus símbolos y sus múltiples relaciones.
            </p>
            <ButtonLink href="/cursos?disciplina=tarot" arrow>Conocé nuestros cursos de Tarot</ButtonLink>
          </div>
          <div className="relative aspect-square md:aspect-auto md:min-h-[360px]">
            <Image
              src={BRAND.tarotArcanos.src}
              alt={BRAND.tarotArcanos.alt}
              fill
              sizes="(min-width: 768px) 480px, 100vw"
              className="object-cover"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
