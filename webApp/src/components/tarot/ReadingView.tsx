import SpreadLayout from "@/components/tarot/SpreadLayout";
import TarotCard from "@/components/tarot/TarotCard";
import EthicsNote from "@/components/tarot/EthicsNote";
import type { ReadingFacts } from "@/lib/tarot/reading";
import type { ReadingText } from "@/lib/tarot/interpret/narrative";
import { positionsFor } from "@/lib/tarot/spreads";

export default function ReadingView({ facts, text }: { facts: ReadingFacts; text: ReadingText }) {
  const positions = positionsFor(facts.spread, facts.placed.length);
  return (
    <div className="space-y-12">
      <SpreadLayout positions={positions} forma={facts.spread.forma} render={(_p, i) => <TarotCard card={facts.placed[i]!.card} reversed={facts.placed[i]!.reversed} size={facts.placed.length > 3 ? "sm" : "md"} priority={i === 0} />} />
      <section className="mx-auto max-w-[68ch] space-y-5 text-lg leading-relaxed text-tinta">
        <p>{text.apertura}</p>
        <p>{text.ideaLineal}</p>
        {text.panorama && <p className="text-suave">{text.panorama}</p>}
      </section>
      {text.dominante && (
        <section className="mx-auto max-w-[68ch] rounded-lg bg-papel p-6 shadow-card">
          <p className="text-sm font-semibold text-miel-800">La carta que más pesa</p>
          <h2 className="mt-1 text-xl font-bold text-bosque">{text.dominante.titulo}</h2>
          <p className="mt-2 text-tinta">{text.dominante.texto}</p>
        </section>
      )}
      <section className="mx-auto max-w-[68ch] space-y-8">
        {text.posiciones.map((p, i) => (
          <article key={p.titulo} className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <TarotCard card={facts.placed[i]!.card} reversed={facts.placed[i]!.reversed} size="sm" />
            <div>
              <h2 className="text-xl font-bold text-bosque">{p.titulo}</h2>
              <p className="mt-1 text-sm text-suave">{p.glosa}</p>
              <p className="mt-2 text-tinta">{p.texto}</p>
            </div>
          </article>
        ))}
      </section>
      {text.grupos.length > 0 && (
        <section className="mx-auto max-w-[68ch] space-y-3">
          <h2 className="text-xl font-bold text-bosque">Por grupos</h2>
          {text.grupos.map((g) => (
            <p key={g.titulo} className="text-tinta"><strong className="text-bosque">{g.titulo}.</strong> {g.texto}</p>
          ))}
        </section>
      )}
      {text.tensiones.length > 0 && (
        <section className="mx-auto max-w-[68ch] space-y-3">
          <h2 className="text-xl font-bold text-bosque">Cómo se relacionan</h2>
          {text.tensiones.map((t) => <p key={t} className="text-tinta">{t}</p>)}
        </section>
      )}
      <section className="mx-auto max-w-[68ch] space-y-4 rounded-lg bg-papel p-6 shadow-card">
        {text.respuesta && (
          <div>
            <h2 className="text-xl font-bold text-bosque">Sobre tu pregunta</h2>
            <p className="mt-2 text-tinta">{text.respuesta}</p>
          </div>
        )}
        {text.sintesis && (
          <div>
            <h2 className="text-xl font-bold text-bosque">Síntesis</h2>
            <p className="mt-2 text-tinta">{text.sintesis}</p>
          </div>
        )}
        <p className="font-semibold text-miel-800">{text.consejo}</p>
        <p className="text-tinta">{text.espejo}</p>
      </section>
      <div className="mx-auto max-w-[68ch]"><EthicsNote /></div>
    </div>
  );
}
