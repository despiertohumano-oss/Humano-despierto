import { redirect } from "next/navigation";
import TeacherChartGate from "@/components/carta-natal/TeacherChartGate";
import { getCurrentUser } from "@/lib/server/auth";
import { hasSelfChart } from "@/lib/server/natal-chart";

// Segunda capa de guard de rol (la primera es `src/proxy.ts`, que redirige por el CLAIM del
// JWT — orientativo, ADR-006). Acá se resuelve contra `profiles.role`, la única autoridad:
// un docente recién degradado cuyo token todavía dice "teacher" (hasta el próximo refresh)
// no entra igual. Mismo patrón que `panel/admin/layout.tsx` (T-008).
// T-024: sin carta propia, la docente ve solo el formulario. Es una regla de producto, no un
// límite de seguridad: las Server Actions docentes no la re-verifican.
export default async function TeacherPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "teacher") {
    redirect("/panel");
  }

  if (!(await hasSelfChart())) return <TeacherChartGate />;

  return <>{children}</>;
}
