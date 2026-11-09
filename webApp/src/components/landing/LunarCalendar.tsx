import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";
import { cn } from "@/lib/utils/cn";
import { phaseLabel, type LunarDay, type LunarPhaseName } from "@/lib/lunar";

const LIT: Record<LunarPhaseName, number> = { new: 0, crescent: 0.25, half: 0.5, gibbous: 0.75, full: 1 };

const fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });

/** Fase en línea (ADR-015: SVG, no glifos). La parte iluminada es un semicírculo más el arco del
 *  terminador, una elipse de ancho |1 - 2k| con k = fracción iluminada. Cósmica: disco `indigo`,
 *  fase en `papel` y la de hoy en `oro`. */
function Moon({ phase, waxing, today }: { phase: LunarPhaseName; waxing: boolean; today: boolean }) {
  const k = LIT[phase];
  const rx = Math.abs(1 - 2 * k) * 20;
  // Creciente: iluminado a la derecha; menguante, a la izquierda. El terminador se curva hacia el
  // lado iluminado mientras k < 1/2 y hacia el oscuro después.
  const outer = waxing ? 1 : 0;
  const inner = (k < 0.5) === waxing ? 0 : 1;
  const lit = today ? "fill-oro" : "fill-papel";
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true" focusable="false">
      <circle cx={24} cy={24} r={20} className="fill-indigo" />
      {k === 1 ? (
        <circle cx={24} cy={24} r={20} className={lit} />
      ) : k > 0 ? (
        <path d={`M24 4A20 20 0 0 ${outer} 24 44A${rx} 20 0 0 ${inner} 24 4Z`} className={lit} />
      ) : null}
      <circle cx={24} cy={24} r={20} fill="none" strokeWidth={1.5} className={today ? "stroke-oro" : "stroke-papel"} />
    </svg>
  );
}

/** Calendario lunar de la portada (T-053), ahora una banda cósmica `noche`. Es un mapa del cielo
 *  para la práctica, no un calendario de clases: los cursos no tienen fechas (ADR-004). */
export default function LunarCalendar({ days }: { days: LunarDay[] }) {
  return (
    <section aria-labelledby="luna-titulo" className="cosmico py-[80px] md:py-[110px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <h2 id="luna-titulo" className="mb-3 text-[clamp(26px,3vw,36px)]">{LANDING.lunar.title}</h2>
          <p className="mb-10 max-w-[52ch]">{LANDING.lunar.lead}</p>
          <ol className="grid grid-cols-4 gap-x-4 gap-y-8 md:grid-cols-8">
            {days.map((d) => (
              <li key={d.date.toISOString()} className="flex flex-col items-center gap-2 text-center">
                <Moon phase={d.phase} waxing={d.waxing} today={d.today} />
                <span className={cn("text-sm font-semibold", d.today && "text-oro")}>
                  {d.today ? "Hoy" : fecha.format(d.date).replace(".", "")}
                </span>
                <span className="text-[13px] leading-tight">{phaseLabel(d.phase, d.waxing)}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
