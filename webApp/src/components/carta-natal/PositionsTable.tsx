import type { ChartFacts } from "@/lib/astro/chart";
import { ANGLE_NAMES, BODY_NAMES, SIGNS, formatDegree, signOf } from "@/lib/astro/zodiac";

const th = "border-b border-linea px-3 py-2 text-left text-sm font-semibold text-bosque";
const td = "border-b border-linea px-3 py-2 text-left text-sm text-tinta";

export default function PositionsTable({ facts }: { facts: ChartFacts }) {
  const angulos = facts.angles ? (["asc", "mc"] as const).map((id) => ({ id, lon: facts.angles![id] })) : [];
  return (
    <table className="w-full border-collapse">
      <caption className="pb-2 text-left text-lg font-bold text-bosque">Posiciones</caption>
      <thead>
        <tr>
          <th scope="col" className={th}>Cuerpo</th>
          <th scope="col" className={th}>Signo</th>
          <th scope="col" className={th}>Grado</th>
          <th scope="col" className={th}>Casa</th>
          <th scope="col" className={th}>Retrógrado</th>
        </tr>
      </thead>
      <tbody>
        {facts.bodies.map((b) => (
          <tr key={b.id}>
            <th scope="row" className={td}>{BODY_NAMES[b.id]}</th>
            <td className={td}>{SIGNS[b.sign].nombre}</td>
            <td className={td}>{formatDegree(b.lon)}</td>
            <td className={td}>{b.house ?? "—"}</td>
            <td className={td}>{b.retrograde ? "Sí" : "No"}</td>
          </tr>
        ))}
        {angulos.map((a) => (
          <tr key={a.id}>
            <th scope="row" className={td}>{ANGLE_NAMES[a.id]}</th>
            <td className={td}>{SIGNS[signOf(a.lon)].nombre}</td>
            <td className={td}>{formatDegree(a.lon)}</td>
            <td className={td}>—</td>
            <td className={td}>—</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
