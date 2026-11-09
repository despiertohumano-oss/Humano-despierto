import Image from "next/image";
import { ButtonLink } from "@/components/atoms/Button";
import SkyIllustration from "@/components/atoms/SkyIllustration";
import Reveal from "@/components/layout/Reveal";
import { BRAND } from "@/content/brand-images";
import { LANDING } from "@/content/landing";

export default function Manifiesto() {
  const m = LANDING.manifiesto;
  return (
    <section id="nuestra-mirada" aria-labelledby="manifiesto-titulo" className="scroll-mt-20 py-[90px] md:pb-[110px] md:pt-[130px]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 md:grid-cols-2 md:gap-[72px]">
        <div>
          <Reveal>
            <h2 id="manifiesto-titulo" className="mb-5 max-w-[18ch] text-[clamp(30px,3.6vw,46px)] leading-[1.12]">
              {m.title}
            </h2>
          </Reveal>
          {m.paragraphs.map((p, i) => (
            <Reveal key={i} delay={i === 0 ? 1 : 2}>
              <p className="mt-4 max-w-[48ch] text-suave">{p}</p>
            </Reveal>
          ))}
          <Reveal delay={3} className="mt-8">
            <ButtonLink href="#empezar" arrow>
              {m.cta}
            </ButtonLink>
          </Reveal>
        </div>
        <Reveal delay={1} className="relative">
          <div className="relative aspect-square overflow-hidden rounded-[16px] bg-salvia shadow-lift">
            <Image
              src={BRAND.cartaAstralAzul.src}
              alt={BRAND.cartaAstralAzul.alt}
              fill
              sizes="(min-width: 768px) 560px, 100vw"
              className="object-cover"
            />
          </div>
          {/* Blanco suave sobre la carta astral; la sombra noche lo sostiene donde cae sobre el fondo claro. */}
          <SkyIllustration className="absolute -bottom-8 right-2 text-papel/90 [filter:drop-shadow(0_0_1.5px_rgb(20_26_56/0.55))] md:-left-[54px] md:right-auto" />
        </Reveal>
      </div>
    </section>
  );
}
