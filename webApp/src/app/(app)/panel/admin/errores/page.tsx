import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ErrorEventRow from "@/components/admin/ErrorEventRow";
import { requireAdmin } from "@/lib/server/admin";
import { listErrorEvents } from "@/lib/server/error-events";

export const metadata: Metadata = { title: "Errores · Admin", robots: { index: false, follow: false } };

export default async function AdminErrorsPage() {
  // Layout y página renderizan en paralelo: la lectura no puede depender del guard del layout.
  await requireAdmin();
  const events = await listErrorEvents();

  return (
    <AdminShell active="errores">
      <section aria-labelledby="errores-titulo">
        <h2 id="errores-titulo" className="mb-2 text-xl font-semibold text-bosque">
          Errores del sitio
        </h2>
        <p className="mb-4 max-w-[70ch] text-suave">
          Cada falla aparece una vez, con cuántas veces se repitió. La primera vez llega un mail de aviso; si se
          repite, no se vuelve a avisar por 24 horas. Se borran solos tras 30 días sin repetirse.
        </p>
        {events === null && (
          <p className="tarjeta p-5 text-suave">
            La captura de errores todavía no está activa: falta aplicar la migración 0078 en la base.
          </p>
        )}
        {events?.length === 0 && <p className="tarjeta p-5 text-suave">No hubo errores en los últimos 30 días.</p>}
        <ul className="space-y-3">
          {(events ?? []).map((e) => (
            <ErrorEventRow key={e.fingerprint} event={e} />
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
