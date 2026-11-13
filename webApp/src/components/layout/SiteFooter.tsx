import Link from "next/link";
import { DOCENTES } from "@/content/site-copy";
import BackToTop from "./BackToTop";
import WhatsAppFloat from "./WhatsAppFloat";

// C-02 · Sólo destinos que existen. Un link que no lleva a ningún lado le enseña a la usuaria
// que la interfaz miente: redes y contacto vuelven cuando exista la cuenta detrás.
const COLS = [
  {
    title: "Escuela",
    links: [
      { label: "Cursos", href: "/cursos" },
      { label: DOCENTES.navLabel, href: "/guias" },
      { label: "Diario", href: "/diario" },
      { label: "Tarot online", href: "/tarot" },
      { label: "Las 78 cartas", href: "/tarot/cartas" },
      { label: "Carta natal", href: "/carta-natal" },
    ],
  },
  {
    title: "Vos",
    links: [
      { label: "Entrar", href: "/entrar" },
    ],
  },
] as const;

export default function SiteFooter() {
  return (
    <>
      <footer className="bg-bosque px-6 pb-9 pt-[72px] text-[15px] text-white/80">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1">
              <h2 className="mb-3.5 text-base font-semibold text-white">Humano Despierto</h2>
              <p className="max-w-[34ch]">
                Un espacio de aprendizaje, autoconocimiento y transformación. Astrología, tarot, constelaciones
                familiares, magia, gemoterapia y el universo de los símbolos.
              </p>
            </div>
            {COLS.map((col) => (
              <div key={col.title}>
                <h2 className="mb-3.5 text-base font-semibold text-white">{col.title}</h2>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h2 className="mb-3.5 text-base font-semibold text-white">Certificados</h2>
              <p>
                Al finalizar determinadas formaciones, podrás acceder a tu certificado de participación o
                aprobación, según las condiciones de cada curso.
              </p>
            </div>
          </div>
          <div className="border-t border-white/15 pt-6 text-[13px]">
            <span>© {new Date().getFullYear()} Humano Despierto</span>
          </div>
        </div>
      </footer>
      <WhatsAppFloat />
      <BackToTop />
    </>
  );
}
