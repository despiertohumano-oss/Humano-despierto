import type { ReactNode } from "react";
import type { Position } from "@/lib/tarot/spreads";
import { cn } from "@/lib/utils/cn";

type Props = { positions: Position[]; forma?: "grilla" | "rueda"; render: (p: Position, i: number) => ReactNode };

/** Grilla CSS por x/y, o rueda de 12 (casa 1 a la izquierda, sentido antihorario: 4 abajo, 7 a la derecha, 10 arriba).
 *  En pantallas chicas, más de 6 cartas se muestran como lista numerada: la forma se pierde, el orden no. */
export default function SpreadLayout({ positions, forma = "grilla", render }: Props) {
  const lista = positions.length > 6;
  return (
    <>
      {lista && (
        <ol className="grid grid-cols-2 gap-4 sm:hidden">
          {positions.map((p, i) => (
            <li key={p.n} className="grid justify-items-center gap-2 text-center">
              {render(p, i)}
              <span className="text-sm text-suave">{p.n}. {p.nombre}</span>
            </li>
          ))}
        </ol>
      )}
      <div className={cn(lista && "hidden sm:block")}>{forma === "rueda" ? <Rueda positions={positions} render={render} /> : <Grilla positions={positions} render={render} />}</div>
    </>
  );
}

function Grilla({ positions, render }: Omit<Props, "forma">) {
  const cols = Math.max(...positions.map((p) => p.x)) + 1;
  const rows = Math.max(...positions.map((p) => p.y)) + 1;
  return (
    <div className="mx-auto grid w-fit gap-4" style={{ gridTemplateColumns: `repeat(${cols}, auto)`, gridTemplateRows: `repeat(${rows}, auto)` }}>
      {positions.map((p, i) => (
        <div key={p.n} className={cn("relative grid place-items-center", p.rotada && "z-10")} style={{ gridColumn: p.x + 1, gridRow: p.y + 1 }}>
          <div className={p.rotada ? "rotate-90 scale-75" : undefined}>{render(p, i)}</div>
        </div>
      ))}
    </div>
  );
}

function Rueda({ positions, render }: Omit<Props, "forma">) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[640px]">
      {positions.map((p, i) => {
        const ang = ((180 + (p.n - 1) * 30) * Math.PI) / 180;
        const left = 50 + 40 * Math.cos(ang);
        const top = 50 - 40 * Math.sin(ang);
        return (
          <div key={p.n} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
            {render(p, i)}
          </div>
        );
      })}
    </div>
  );
}
