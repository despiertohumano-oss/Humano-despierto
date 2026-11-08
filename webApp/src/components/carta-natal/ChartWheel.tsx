import type { AspectId } from "@/lib/astro/aspects";
import type { ChartFacts } from "@/lib/astro/chart";
import { SvgGlyph, astroIcon } from "@/components/atoms/Icon";
import { BODY_NAMES, SIGNS, SIGN_IDS, formatDegree, norm360, type PointId } from "@/lib/astro/zodiac";

const C = 300;
const R_OUT = 290;
const R_SIGN = 250;
const R_HOUSE = 170;
const R_BODY = 224;
const RING_STEP = 20;
const GLYPH = 18;

export const ASPECT_STYLE: Record<Exclude<AspectId, "conjuncion">, { cls: string; dash: string | null; label: string }> = {
  trigono: { cls: "stroke-musgo", dash: null, label: "Trígono" },
  sextil: { cls: "stroke-musgo", dash: "2 4", label: "Sextil" },
  cuadratura: { cls: "stroke-miel-800", dash: "8 4", label: "Cuadratura" },
  oposicion: { cls: "stroke-bosque", dash: null, label: "Oposición" },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

function polar(lon: number, r: number, anchor: number) {
  const th = (norm360(lon - anchor) * Math.PI) / 180;
  return { x: r2(C - r * Math.cos(th)), y: r2(C + r * Math.sin(th)) };
}

export default function ChartWheel({ facts }: { facts: ChartFacts }) {
  const anchor = facts.angles?.asc ?? 0;
  const lonOf = new Map<PointId, number>(facts.bodies.map((b) => [b.id, b.lon]));
  if (facts.angles) {
    lonOf.set("asc", facts.angles.asc);
    lonOf.set("mc", facts.angles.mc);
  }

  const ordenados = [...facts.bodies].sort((a, b) => a.lon - b.lon);
  const anillo = new Map<string, number>();
  ordenados.forEach((b, i) => {
    const prev = ordenados[i - 1];
    anillo.set(b.id, prev && norm360(b.lon - prev.lon) < 7 ? Math.min((anillo.get(prev.id) ?? 0) + 1, 2) : 0);
  });

  return (
    <svg viewBox="0 0 600 600" role="img" aria-label="Rueda de la carta natal" className="h-auto w-full max-w-[600px]">
      <circle cx={C} cy={C} r={R_OUT} className="fill-papel stroke-linea" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R_SIGN} className="fill-none stroke-linea" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R_HOUSE} className="fill-salvia-100 stroke-linea" strokeWidth={1.5} />

      {SIGN_IDS.map((s, k) => {
        const a = polar(k * 30, R_SIGN, anchor);
        const b = polar(k * 30, R_OUT, anchor);
        const t = polar(k * 30 + 15, (R_SIGN + R_OUT) / 2, anchor);
        return (
          <g key={s}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-linea" />
            <g data-signo={s}>
              <title>{SIGNS[s].nombre}</title>
              <SvgGlyph name={astroIcon(s)} x={t.x} y={t.y} size={GLYPH} className="text-bosque" />
            </g>
          </g>
        );
      })}

      {facts.houses?.cusps.map((cusp, i) => {
        const next = facts.houses!.cusps[(i + 1) % 12]!;
        const a = polar(cusp, R_HOUSE, anchor);
        const b = polar(cusp, R_SIGN, anchor);
        const n = polar(cusp + norm360(next - cusp) / 2, R_HOUSE + 14, anchor);
        return (
          <g key={i}>
            <line data-casa={i + 1} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-linea" />
            <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" className="fill-suave text-[11px]">{i + 1}</text>
          </g>
        );
      })}

      {facts.aspects.filter((a) => a.type !== "conjuncion").map((a) => {
        const st = ASPECT_STYLE[a.type as Exclude<AspectId, "conjuncion">];
        const p = polar(lonOf.get(a.a)!, R_HOUSE, anchor);
        const q = polar(lonOf.get(a.b)!, R_HOUSE, anchor);
        return (
          <line key={`${a.a}-${a.b}`} data-aspecto={a.type} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
            className={st.cls} strokeWidth={1.25} strokeDasharray={st.dash ?? undefined} />
        );
      })}

      {facts.angles && (["asc", "mc"] as const).map((id) => {
        const lon = facts.angles![id];
        const a = polar(lon, R_HOUSE, anchor);
        const b = polar(lon, R_OUT, anchor);
        const t = polar(lon, R_HOUSE - 16, anchor);
        return (
          <g key={id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-bosque" strokeWidth={2} />
            <text data-angulo={id} x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central" className="fill-bosque text-[12px] font-bold">
              {id === "asc" ? "AC" : "MC"}
            </text>
          </g>
        );
      })}

      {facts.bodies.map((b) => {
        const tick1 = polar(b.lon, R_SIGN, anchor);
        const tick2 = polar(b.lon, R_SIGN - 8, anchor);
        const t = polar(b.lon, R_BODY - RING_STEP * (anillo.get(b.id) ?? 0), anchor);
        return (
          <g key={b.id}>
            <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} className="stroke-tinta" />
            <g data-cuerpo={b.id}>
              <title>{`${BODY_NAMES[b.id]} a ${formatDegree(b.lon)} de ${SIGNS[b.sign].nombre}${b.retrograde ? ", retrógrado" : ""}`}</title>
              <SvgGlyph name={astroIcon(b.id)} x={t.x} y={t.y} size={GLYPH} className="text-tinta" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
