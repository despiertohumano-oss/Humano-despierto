import type { ChartFacts } from "@/lib/astro/chart";
import { pointName } from "@/lib/astro/zodiac";

const NOMBRE = { conjuncion: "Conjunción", sextil: "Sextil", cuadratura: "Cuadratura", trigono: "Trígono", oposicion: "Oposición" } as const;
const th = "border-b border-linea px-3 py-2 text-left text-sm font-semibold text-bosque";
const td = "border-b border-linea px-3 py-2 text-left text-sm text-tinta";

export default function AspectsTable({ facts }: { facts: ChartFacts }) {
  return (
    <table className="w-full border-collapse">
      <caption className="pb-2 text-left text-lg font-bold text-bosque">Aspectos</caption>
      <thead>
        <tr>
          <th scope="col" className={th}>Aspecto</th>
          <th scope="col" className={th}>Entre</th>
          <th scope="col" className={th}>Orbe</th>
          <th scope="col" className={th}>Fase</th>
        </tr>
      </thead>
      <tbody>
        {facts.aspects.length === 0 ? (
          <tr><td colSpan={4} className={td}>No hay aspectos mayores dentro de los orbes.</td></tr>
        ) : (
          facts.aspects.map((a) => (
            <tr key={`${a.a}-${a.b}`}>
              <th scope="row" className={td}>{NOMBRE[a.type]}</th>
              <td className={td}>{pointName(a.a)} y {pointName(a.b)}</td>
              <td className={td}>{a.orb.toFixed(1).replace(".", ",")}°</td>
              <td className={td}>{a.applying ? "Aplicativo" : "Separativo"}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
