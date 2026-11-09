import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChartResult from "@/components/carta-natal/ChartResult";
import { getNatalChart, viewFromSaved } from "@/lib/server/natal-chart";

export const metadata: Metadata = { title: "Carta guardada", robots: { index: false, follow: false } };

export default async function CartaGuardadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await getNatalChart(id);
  if (!saved) notFound();
  const view = await viewFromSaved(saved);
  const [y, m, d] = saved.birthDate.split("-");
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <main className="mx-auto max-w-[1000px] px-6 py-12">
        <Link href="/panel/carta-natal" className="inline-flex min-h-10 items-center text-sm font-semibold text-miel-800 hover:underline">Mis cartas natales</Link>
        <p className="mt-4 text-sm font-semibold text-miel-800">
          {saved.isSelf ? "Mi carta" : "Carta guardada"} · {d}/{m}/{y} · {saved.birthTime ?? "sin hora"}
        </p>
        <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{saved.label}</h1>
        <div className="mt-10"><ChartResult view={view} /></div>
      </main>
    </div>
  );
}
