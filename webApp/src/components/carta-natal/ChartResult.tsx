import Icon, { astroIcon } from "@/components/atoms/Icon";
import Link from "next/link";
import { posicionPath, tituloPosicion, type TipoPosicion } from "@/lib/astro/posicion-rutas";
import type { Paragraph } from "@/lib/astro/prose";
import type { ChartView } from "@/lib/server/natal-chart";
import AspectsTable from "./AspectsTable";
import AstroEthicsNote from "./AstroEthicsNote";
import ChartWheel, { ASPECT_STYLE } from "./ChartWheel";
import PositionsTable from "./PositionsTable";

function Caras({ caras }: { caras: NonNullable<Paragraph["caras"]> }) {
  const luz = { rotulo: "Luz", texto: caras.luz };
  const sombra = { rotulo: "Sombra", texto: caras.sombra };
  // El tono solo cambia el orden: las dos caras se muestran siempre.
  const orden = caras.tono === "sombra" ? [sombra, luz] : [luz, sombra];
  return (
    <div className="max-w-[65ch] space-y-2 border-l-2 border-linea pl-4">
      <p className="text-sm text-suave">{caras.motivo}</p>
      {orden.map((c) => (
        <p key={c.rotulo} className="text-tinta">
          <strong className="font-bold text-bosque">{c.rotulo}:</strong> {c.texto}
        </p>
      ))}
    </div>
  );
}

function MasSobre({ enlaces }: { enlaces: NonNullable<Paragraph["enlaces"]> }) {
  const { planeta, signo, casa } = enlaces;
  const destinos: { tipo: TipoPosicion; clave: string }[] = [
    ...(signo ? [{ tipo: "signo" as const, clave: signo }] : []),
    ...(casa ? [{ tipo: "casa" as const, clave: casa }] : []),
  ];
  return (
    <p className="text-sm text-suave">
      Leer más:{" "}
      {destinos.map((d, i) => (
        <span key={d.tipo}>
          {i > 0 && " · "}
          <Link href={posicionPath(planeta, d.tipo, d.clave)} className="font-semibold text-miel-800 hover:underline">
            {tituloPosicion(planeta, d.tipo, d.clave)}
          </Link>
        </span>
      ))}
    </p>
  );
}

function Bloque({ p }: { p: Paragraph }) {
  return (
    <article className="space-y-2">
      <h4 className="text-lg font-bold text-bosque">{p.titulo}</h4>
      <p className="max-w-[65ch] text-tinta">{p.texto}</p>
      {p.caras && <Caras caras={p.caras} />}
      {p.enlaces && <MasSobre enlaces={p.enlaces} />}
      <p className="text-sm text-suave">Por qué: {p.porQue}.</p>
    </article>
  );
}

export default function ChartResult({ view }: { view: ChartView }) {
  const { facts, text } = view;
  const casas = facts.houses ? (facts.houses.system === "placidus" ? "Placidus" : "signo entero (Whole Sign)") : null;
  return (
    <section aria-labelledby="carta-resultado" className="space-y-10">
      <header className="space-y-2">
        <h2 id="carta-resultado" className="text-3xl font-bold text-bosque">Carta natal</h2>
        <p className="text-sm text-suave">
          {view.placeLabel} · {view.zoneLabel}{casas ? ` · casas ${casas}` : ""} · nodo verdadero · Lilith (Luna Negra media) · orbes Urania Trust
        </p>
        {text.avisos.length > 0 && (
          <ul className="space-y-1 rounded-md border border-miel-800 bg-miel-100 p-4 text-sm text-tinta">
            {text.avisos.map((a) => <li key={a}>{a}</li>)}
          </ul>
        )}
      </header>

      <figure aria-labelledby="carta-figura" className="space-y-8">
        <div className="mx-auto max-w-[600px]"><ChartWheel facts={facts} /></div>
        <div className="grid gap-8 lg:grid-cols-2">
          <PositionsTable facts={facts} />
          <AspectsTable facts={facts} />
        </div>
        <figcaption id="carta-figura" className="text-sm text-suave">
          Rueda de la carta: {facts.angles ? "el Ascendente (AC) a la izquierda y las casas en sentido antihorario" : "0° de Aries a la izquierda, sin casas ni ángulos"}. Las tablas de abajo muestran lo mismo en texto.
          <span className="mt-2 flex flex-wrap gap-4">
            {(Object.entries(ASPECT_STYLE) as [keyof typeof ASPECT_STYLE, (typeof ASPECT_STYLE)[keyof typeof ASPECT_STYLE]][]).map(([tipo, s]) => (
              <span key={tipo} data-leyenda={tipo} className="inline-flex items-center gap-2">
                <svg width="28" height="6" aria-hidden="true"><line x1="0" y1="3" x2="28" y2="3" className={s.cls} strokeWidth={2} strokeDasharray={s.dash ?? undefined} /></svg>
                <Icon name={astroIcon(tipo)} className="text-tinta" />
                {s.label}
              </span>
            ))}
          </span>
        </figcaption>
      </figure>

      <div className="space-y-8">
        <h3 className="text-2xl font-bold text-bosque">Interpretación</h3>
        {text.big3.map((p) => <Bloque key={p.titulo} p={p} />)}
        {text.regente && <Bloque p={text.regente} />}
        <h3 className="text-xl font-bold text-bosque">Planetas y puntos</h3>
        {text.cuerpos.map((p) => <Bloque key={p.titulo} p={p} />)}
        {text.aspectos.length > 0 && <h3 className="text-xl font-bold text-bosque">Aspectos más cerrados</h3>}
        {text.aspectos.map((p) => <Bloque key={p.titulo} p={p} />)}
        <p className="max-w-[65ch] text-tinta">{text.balance}</p>
      </div>

      <AstroEthicsNote text={text.marco} />
    </section>
  );
}
