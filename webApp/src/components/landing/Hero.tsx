import Image from "next/image";
import { ButtonLink } from "@/components/atoms/Button";
import { BRAND } from "@/content/brand-images";
import { LANDING } from "@/content/landing";

/** Hero cósmico: la imagen de la dueña a sangre, velo `noche` (≥ 70 %) y el título como h1. El
 *  header va transparente encima (`overHero`). La imagen es decorativa: el texto ya lo dice todo. */
export default function Hero() {
  const h = LANDING.hero;
  return (
    <section aria-label="Presentación" className="cosmico relative grid min-h-[min(100svh,860px)] items-end overflow-hidden">
      <Image
        src={BRAND.heroNebulosa.src}
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-center"
      />
      <div aria-hidden="true" className="cosmico-velo absolute inset-0" />
      {/* Banda superior: el header transparente tiene texto blanco encima de la imagen. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgb(14_20_48/0.7),rgb(14_20_48/0))]" />
      <div className="relative mx-auto w-full max-w-[1200px] px-6 pb-16 pt-36 md:pb-[72px]">
        <h1 className="max-w-[26ch] text-[clamp(28px,4.2vw,54px)] font-semibold leading-[1.12] tracking-[-0.02em] text-balance">
          {h.title}
        </h1>
        <p className="mb-10 mt-6 max-w-[52ch] text-lg leading-relaxed">{h.lead}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/cursos" arrow>
            {h.ctaCursos}
          </ButtonLink>
          <ButtonLink href="#nuestra-mirada" variant="outline-light">
            {h.ctaProyecto}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
