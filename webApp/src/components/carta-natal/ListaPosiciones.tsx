import Link from "next/link";
import { posicionPath, tituloPosicion, type PosicionRef } from "@/lib/astro/posicion-rutas";

type Props = { titulo: string; items: PosicionRef[] };

/** Enlaces a las páginas de posición desde una ficha: así Google llega a las 240 por links, no solo por el sitemap. */
export default function ListaPosiciones({ titulo, items }: Props) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={titulo} className="space-y-3">
      <h2 className="text-xl font-bold text-bosque">{titulo}</h2>
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {items.map((r) => (
          <li key={`${r.tipo}-${r.clave}`}>
            <Link href={posicionPath(r.planeta, r.tipo, r.clave)} className="inline-flex min-h-10 items-center text-miel-800 hover:underline">
              {tituloPosicion(r.planeta, r.tipo, r.clave)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
