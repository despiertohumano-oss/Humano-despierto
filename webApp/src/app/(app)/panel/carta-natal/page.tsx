import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/atoms/Button";
import AppPageHeader from "@/components/layout/AppPageHeader";
import SiteHeader from "@/components/layout/SiteHeader";
import ChartListActions from "@/components/carta-natal/ChartListActions";
import { listNatalCharts } from "@/lib/server/natal-chart";

export const metadata: Metadata = { title: "Mis cartas natales", robots: { index: false, follow: false } };

export default async function PanelCartaNatalPage() {
  const charts = await listNatalCharts();
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <AppPageHeader eyebrow="Carta natal" title="Mis cartas natales" subtitle="Tus datos de nacimiento son privados. Borrar una carta la elimina en el acto.">
        {charts.length > 0 && <ButtonLink href="/carta-natal" size="sm" arrow>Calcular una carta nueva</ButtonLink>}
      </AppPageHeader>
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        {charts.length === 0 ? (
          <div className="tarjeta flex flex-col items-start gap-4 p-8">
            <p className="max-w-[46ch]">Todavía no guardaste ninguna carta. Calculala y, al final, tocá &quot;Guardar en mi panel&quot;.</p>
            <ButtonLink href="/carta-natal" arrow>Calcular una carta</ButtonLink>
          </div>
        ) : (
          <ul className="space-y-4">
            {charts.map((c) => {
              const [y, m, d] = c.birthDate.split("-");
              return (
                <li key={c.id} className="tarjeta flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-suave">{d}/{m}/{y} · {c.birthTime ?? "sin hora"}{c.isSelf ? " · Mi carta" : ""}</p>
                    <Link href={`/carta-natal/${c.id}`} className="font-semibold text-bosque hover:underline">{c.label}</Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ButtonLink href={`/carta-natal/${c.id}`} variant="ghost" size="sm">Ver</ButtonLink>
                    <ButtonLink href={`/carta-natal?editar=${c.id}`} variant="ghost" size="sm">Editar</ButtonLink>
                    <ChartListActions id={c.id} isSelf={c.isSelf} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
