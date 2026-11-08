import { ButtonLink } from "@/components/atoms/Button";
import SkyIllustration from "@/components/atoms/SkyIllustration";
import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";

/** «Explorá cada propuesta» (pantalla 3 del documento de la dueña): título, bajada y tres pasos.
 *  No depende de si los cursos tienen clase gratuita: no se promete nada de acceso. */
export default function Empezar() {
  const e = LANDING.empezar;
  return (
    <section id="empezar" aria-labelledby="empezar-titulo" className="scroll-mt-20 py-[100px] md:py-[120px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal className="relative grid items-center gap-10 overflow-hidden rounded-[24px] bg-salvia-100 px-6 py-14 md:px-16 lg:grid-cols-[1.2fr_0.8fr]">
          <SkyIllustration className="absolute -bottom-9 -right-6 opacity-35" />
          <div className="relative">
            <h2 id="empezar-titulo" className="mb-3.5 max-w-[20ch] text-[clamp(28px,3.6vw,42px)]">
              {e.title}
            </h2>
            <p className="max-w-[48ch] text-suave">{e.lead}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/cursos" arrow>
                {e.cta}
              </ButtonLink>
            </div>
          </div>
          <ol className="relative grid gap-3.5">
            {e.pasos.map((p) => (
              <li key={p.n} className="grid grid-cols-[44px_1fr] items-start gap-3.5 text-[15px] leading-normal text-tinta">
                <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-papel text-sm font-bold text-bosque">
                  {p.n}
                </span>
                <span>
                  <b className="block text-bosque">{p.title}</b>
                  {p.detail}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
